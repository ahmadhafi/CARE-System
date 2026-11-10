import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/server-guard";
import { appendAuditLog, loadDbAsync, saveDbAsync } from "@/lib/store";
import {
  hashPassword,
  sanitizeUser,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { sanitizeText } from "@/lib/validations";

export async function GET() {
  const auth = await getActiveServerUser();
  if (!auth.safeUser || auth.errorResponse) {
    return auth.errorResponse!;
  }
  return NextResponse.json({ user: auth.safeUser });
}

// Allows any authenticated user to update their own profile (name, username/employeeNo, email, phone, department, password, or gpsConsent)
export async function PATCH(request: Request) {
  try {
    const auth = await getActiveServerUser();
    if (!auth.user || auth.errorResponse) {
      return auth.errorResponse!;
    }

    const body = await request.json();
    const db = await loadDbAsync();
    const target = db.users.find((u) => u.id === auth.user!.id);
    if (!target) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const changes: string[] = [];

    // 1. GPS Tracking Consent (FR-035)
    if (typeof body.gpsConsent === "boolean") {
      target.gpsConsent = body.gpsConsent;
      changes.push(`Izin GPS: ${body.gpsConsent ? "ON" : "OFF"}`);
    }

    // 2. Username / Employee ID (employeeNo)
    if (typeof body.employeeNo === "string" && body.employeeNo.trim()) {
      const nextEmpNo = sanitizeText(body.employeeNo.trim());
      if (nextEmpNo.length < 3 || nextEmpNo.length > 30) {
        return NextResponse.json(
          { error: "Username / ID harus antara 3 hingga 30 karakter." },
          { status: 400 }
        );
      }
      if (!/^[A-Za-z0-9._-]+$/.test(nextEmpNo)) {
        return NextResponse.json(
          {
            error:
              "Username / ID hanya boleh menggunakan huruf, angka, titik, garis bawah, atau tanda hubung.",
          },
          { status: 400 }
        );
      }
      const conflictEmp = db.users.find(
        (u) =>
          u.id !== target.id &&
          u.employeeNo.toLowerCase() === nextEmpNo.toLowerCase()
      );
      if (conflictEmp) {
        return NextResponse.json(
          { error: `Username / ID "${nextEmpNo}" sudah digunakan akun lain.` },
          { status: 409 }
        );
      }
      if (target.employeeNo !== nextEmpNo) {
        changes.push(`Username (${target.employeeNo} -> ${nextEmpNo})`);
        target.employeeNo = nextEmpNo;
      }
    }

    // 3. Full Name
    if (typeof body.name === "string" && body.name.trim()) {
      const nextName = sanitizeText(body.name.trim());
      if (nextName.length < 2 || nextName.length > 80) {
        return NextResponse.json(
          { error: "Nama lengkap harus 2–80 karakter." },
          { status: 400 }
        );
      }
      if (target.name !== nextName) {
        changes.push(`Nama (${target.name} -> ${nextName})`);
        target.name = nextName;
      }
    }

    // 4. Corporate Email
    if (typeof body.email === "string" && body.email.trim()) {
      const nextEmail = sanitizeText(body.email.trim().toLowerCase());
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json(
          { error: "Format email tidak valid." },
          { status: 400 }
        );
      }
      const conflictEmail = db.users.find(
        (u) =>
          u.id !== target.id && u.email.toLowerCase() === nextEmail.toLowerCase()
      );
      if (conflictEmail) {
        return NextResponse.json(
          { error: `Email "${nextEmail}" sudah digunakan akun lain.` },
          { status: 409 }
        );
      }
      if (target.email !== nextEmail) {
        changes.push(`Email (${target.email} -> ${nextEmail})`);
        target.email = nextEmail;
      }
    }

    // 5. Department
    if (typeof body.department === "string" && body.department.trim()) {
      const nextDept = sanitizeText(body.department.trim());
      if (nextDept.length >= 2 && nextDept.length <= 60) {
        if (target.department !== nextDept) {
          changes.push(`Departemen (${target.department} -> ${nextDept})`);
          target.department = nextDept;
        }
      }
    }

    // 6. Phone / WhatsApp
    if (typeof body.phone === "string" && body.phone.trim()) {
      const nextPhone = sanitizeText(body.phone.trim());
      if (!/^\+?[0-9]{8,16}$/.test(nextPhone)) {
        return NextResponse.json(
          { error: "Nomor WhatsApp harus berupa 8–16 digit angka." },
          { status: 400 }
        );
      }
      if (target.phone !== nextPhone) {
        changes.push(`No. WA (${target.phone} -> ${nextPhone})`);
        target.phone = nextPhone;
      }
    }

    // 7. Password Change (Optional)
    if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
      const currentPass =
        typeof body.currentPassword === "string" ? body.currentPassword : "";
      if (!currentPass) {
        return NextResponse.json(
          { error: "Masukkan password saat ini untuk mengganti password." },
          { status: 400 }
        );
      }

      const validCurrent = await verifyPassword(
        currentPass,
        target.passwordHash
      );
      if (!validCurrent) {
        return NextResponse.json(
          { error: "Password saat ini tidak sesuai." },
          { status: 401 }
        );
      }

      if (
        body.newPassword.length < 8 ||
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.newPassword)
      ) {
        return NextResponse.json(
          {
            error:
              "Password baru minimal 8 karakter dan wajib mengandung huruf besar, huruf kecil, serta angka.",
          },
          { status: 400 }
        );
      }

      target.passwordHash = await hashPassword(body.newPassword);
      changes.push("Password diperbarui");
    }

    // Sync Driver record if user is a driver
    const linkedDriver = db.drivers.find((d) => d.userId === target.id);
    if (linkedDriver) {
      linkedDriver.name = target.name;
      linkedDriver.employeeNo = target.employeeNo;
      linkedDriver.phone = target.phone;
    }

    // Sync active booking requester/driver display names
    for (const bk of db.bookings) {
      if (bk.requesterId === target.id) {
        bk.requesterName = target.name;
        bk.requesterDepartment = target.department;
        bk.requesterPhone = target.phone;
      }
      if (linkedDriver && bk.driverId === linkedDriver.id) {
        bk.driverName = target.name;
        bk.driverPhone = target.phone;
      }
    }

    target.updatedAt = new Date().toISOString();
    await saveDbAsync(db);

    // Refresh JWT session cookie with updated user claims
    const freshToken = await signSessionToken(target);
    await setSessionCookie(freshToken);

    if (changes.length > 0) {
      appendAuditLog({
        actorId: target.id,
        actorName: target.name,
        actorRole: target.role,
        action: "PROFILE_UPDATED",
        entity: "User",
        entityId: target.employeeNo,
        summary: `${target.name} memperbarui profil: ${changes.join(", ")}.`,
      });
    }

    return NextResponse.json({
      user: sanitizeUser(target),
      message: "Profil berhasil diperbarui.",
    });
  } catch (err) {
    console.error("[CARE Profile Update Error]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui profil pengguna." },
      { status: 500 }
    );
  }
}
