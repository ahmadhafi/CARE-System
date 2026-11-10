import { NextResponse } from "next/server";
import { hashPassword, isWorkplaceAdmin, sanitizeUser } from "@/lib/auth";
import {
  getActiveServerUser,
  requireWorkplaceAdminUser,
} from "@/lib/server-guard";
import {
  appendAuditLog,
  loadDbAsync,
  pushNotification,
  saveDbAsync,
} from "@/lib/store";
import { User, UserRole, UserStatus } from "@/lib/types";
import { sanitizeText } from "@/lib/validations";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export async function GET() {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  const db = await loadDbAsync();

  if (isWorkplaceAdmin(auth.user.role)) {
    return NextResponse.json({
      users: db.users.map(sanitizeUser),
      drivers: db.drivers,
    });
  }

  const activeEmployees = db.users
    .filter((u) => u.status === "ACTIVE")
    .map((u) => ({
      id: u.id,
      employeeNo: u.employeeNo,
      name: u.name,
      department: u.department,
      role: u.role,
    }));

  return NextResponse.json({
    users: activeEmployees,
    drivers: db.drivers,
  });
}

// Workplace Solution Admin: Approve / Reject / Deactivate / Reactivate / Change Role
export async function PATCH(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  try {
    const body = await request.json();
    const {
      userId,
      action,
      role,
      reason,
      department,
      phone,
      licenseNo,
      deviceId,
    } = body as {
      userId: string;
      action:
        | "APPROVE"
        | "REJECT"
        | "DEACTIVATE"
        | "ACTIVATE"
        | "UPDATE_ROLE_AND_INFO";
      role?: UserRole;
      reason?: string;
      department?: string;
      phone?: string;
      licenseNo?: string;
      deviceId?: string;
    };

    const db = await loadDbAsync();
    const target = db.users.find((u) => u.id === userId);
    if (!target) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Prevent Admin from deactivating or changing their own role
    if (
      target.id === adminAuth.user.id &&
      (action === "DEACTIVATE" ||
        action === "REJECT" ||
        (role && role !== target.role))
    ) {
      return NextResponse.json(
        {
          error:
            "Anda tidak dapat menonaktifkan atau mengubah peran (role) akun Anda sendiri.",
        },
        { status: 400 }
      );
    }

    // Privilege escalation guard: only SUPER_ADMIN can grant or modify SUPER_ADMIN
    if (
      (role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") &&
      adminAuth.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Hanya Super Admin yang berwenang menetapkan atau mengubah akun dengan peran SUPER_ADMIN.",
        },
        { status: 403 }
      );
    }

    const beforeSnapshot = sanitizeUser({ ...target });
    const nowIso = new Date().toISOString();

    if (action === "APPROVE") {
      target.status = "ACTIVE";
      target.approvedBy = adminAuth.user.id;
      target.approvedAt = nowIso;
      target.rejectedReason = null;
      if (role) target.role = role;

      if (target.role === "DRIVER") {
        const existingDriver = db.drivers.find((d) => d.userId === target.id);
        if (!existingDriver) {
          db.drivers.push({
            id: `drv-${Date.now()}`,
            userId: target.id,
            name: target.name,
            phone: target.phone,
            employeeNo: target.employeeNo,
            licenseNo: licenseNo ? sanitizeText(licenseNo) : "SIM-A-CORPORATE",
            deviceId: deviceId ? sanitizeText(deviceId) : "ANDROID-CORP-GPS",
            status: "AVAILABLE",
          });
        }
      }

      pushNotification({
        userId: target.id,
        event: "ACCOUNT_APPROVED",
        title: "Akun CARE Disetujui oleh Workplace Solution",
        message: `Selamat datang ${target.name}! Pendaftaran akun Anda telah disetujui oleh ${adminAuth.user.name} (Workplace Solution).`,
      });
    } else if (action === "REJECT") {
      target.status = "REJECTED";
      target.rejectedReason = reason
        ? sanitizeText(reason)
        : "Ditolak oleh Workplace Solution Admin";
    } else if (action === "DEACTIVATE") {
      target.status = "DEACTIVATED";
      target.rejectedReason = reason
        ? sanitizeText(reason)
        : "Dinonaktifkan oleh Workplace Solution Admin";

      const drv = db.drivers.find((d) => d.userId === target.id);
      if (drv) drv.status = "OFF_DUTY";
    } else if (action === "ACTIVATE") {
      target.status = "ACTIVE";
      target.rejectedReason = null;
      const drv = db.drivers.find((d) => d.userId === target.id);
      if (drv && drv.status === "OFF_DUTY") drv.status = "AVAILABLE";
    } else if (action === "UPDATE_ROLE_AND_INFO") {
      if (role) target.role = role;
      if (department) target.department = sanitizeText(department);
      if (phone) target.phone = sanitizeText(phone);

      if (target.role === "DRIVER") {
        let drv = db.drivers.find((d) => d.userId === target.id);
        if (!drv) {
          drv = {
            id: `drv-${Date.now()}`,
            userId: target.id,
            name: target.name,
            phone: target.phone,
            employeeNo: target.employeeNo,
            licenseNo: licenseNo ? sanitizeText(licenseNo) : "SIM-A-CORPORATE",
            deviceId: deviceId ? sanitizeText(deviceId) : "ANDROID-CORP-GPS",
            status: "AVAILABLE",
          };
          db.drivers.push(drv);
        } else {
          drv.name = target.name;
          drv.phone = target.phone;
          if (licenseNo) drv.licenseNo = sanitizeText(licenseNo);
          if (deviceId) drv.deviceId = sanitizeText(deviceId);
        }
      }
    }

    target.updatedAt = nowIso;
    await saveDbAsync(db);

    appendAuditLog({
      actorId: adminAuth.user.id,
      actorName: adminAuth.user.name,
      actorRole: adminAuth.user.role,
      action: `USER_${action}`,
      entity: "User",
      entityId: target.employeeNo,
      summary: `Workplace Solution Admin (${adminAuth.user.name}) melakukan ${action} pada pengguna ${target.name} (${target.employeeNo}) → Status: ${target.status}, Role: ${target.role}`,
      before: beforeSnapshot,
      after: sanitizeUser(target),
    });

    return NextResponse.json({
      user: sanitizeUser(target),
      users: db.users.map(sanitizeUser),
      drivers: db.drivers,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui status pengguna." },
      { status: 500 }
    );
  }
}

// Workplace Solution Admin: Directly add an active employee/driver/admin
export async function POST(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  try {
    const body = await request.json();
    const db = await loadDbAsync();

    const employeeNo = sanitizeText(String(body.employeeNo || "")).toUpperCase();
    const email = sanitizeText(String(body.email || "")).toLowerCase();
    const name = sanitizeText(String(body.name || ""));
    const department = sanitizeText(String(body.department || "General"));
    const phone = sanitizeText(String(body.phone || "0812000000"));
    const role: UserRole = body.role || "EMPLOYEE";
    const status: UserStatus = body.status || "ACTIVE";
    const rawPassword = String(body.password || "");

    if (!employeeNo || !email || !name) {
      return NextResponse.json(
        { error: "ID Karyawan, Email, dan Nama Lengkap wajib diisi." },
        { status: 400 }
      );
    }

    if (
      role === "SUPER_ADMIN" &&
      adminAuth.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Hanya Super Admin yang berwenang membuat akun dengan peran SUPER_ADMIN.",
        },
        { status: 403 }
      );
    }

    if (!STRONG_PASSWORD_REGEX.test(rawPassword)) {
      return NextResponse.json(
        {
          error:
            "Kata sandi wajib diisi (minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka).",
        },
        { status: 400 }
      );
    }

    if (
      db.users.some(
        (u) =>
          u.employeeNo.toLowerCase() === employeeNo.toLowerCase() ||
          u.email.toLowerCase() === email.toLowerCase()
      )
    ) {
      return NextResponse.json(
        { error: "ID Karyawan atau Email sudah digunakan." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(rawPassword);
    const nowIso = new Date().toISOString();

    const newUser: User = {
      id: `usr-${Date.now()}`,
      employeeNo,
      email,
      passwordHash,
      name,
      department,
      phone,
      role,
      status,
      approvedBy: adminAuth.user.id,
      approvedAt: nowIso,
      gpsConsent: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.users.unshift(newUser);

    if (role === "DRIVER") {
      db.drivers.push({
        id: `drv-${Date.now()}`,
        userId: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        employeeNo: newUser.employeeNo,
        licenseNo: sanitizeText(String(body.licenseNo || "SIM-A-CORP")),
        deviceId: sanitizeText(String(body.deviceId || "ANDROID-DEVICE")),
        status: "AVAILABLE",
      });
    }

    await saveDbAsync(db);

    appendAuditLog({
      actorId: adminAuth.user.id,
      actorName: adminAuth.user.name,
      actorRole: adminAuth.user.role,
      action: "ADMIN_CREATE_USER",
      entity: "User",
      entityId: newUser.employeeNo,
      summary: `Workplace Solution Admin menambahkan pengguna baru ${newUser.name} (${newUser.employeeNo}) sebagai ${newUser.role}`,
      after: sanitizeUser(newUser),
    });

    return NextResponse.json(
      {
        user: sanitizeUser(newUser),
        users: db.users.map(sanitizeUser),
        drivers: db.drivers,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menambahkan akun pengguna." },
      { status: 500 }
    );
  }
}
