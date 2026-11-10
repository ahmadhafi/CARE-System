import { NextResponse } from "next/server";
import { hashPassword, sanitizeUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  appendAuditLog,
  getDb,
  notifyAllWorkplaceAdmins,
  saveDb,
} from "@/lib/store";
import { User } from "@/lib/types";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`register:${ip}`, 5, 60_000, 300_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan pendaftaran. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Data pendaftaran tidak valid. Periksa kembali kolom isian.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const db = getDb();

    const existingEmp = db.users.find(
      (u) => u.employeeNo.toLowerCase() === data.employeeNo.toLowerCase()
    );
    if (existingEmp) {
      return NextResponse.json(
        {
          error: `Nomor Induk Karyawan (${data.employeeNo}) sudah terdaftar di sistem.`,
        },
        { status: 409 }
      );
    }

    const existingEmail = db.users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existingEmail) {
      return NextResponse.json(
        {
          error: `Email perusahaan (${data.email}) sudah terdaftar di sistem.`,
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const nowIso = new Date().toISOString();

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeNo: data.employeeNo.toUpperCase(),
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      department: data.department,
      phone: data.phone,
      role: data.requestedRole,
      status: "PENDING_APPROVAL", // Mandatory Workplace Solution Admin Approval
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
      gpsConsent: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.users.unshift(newUser);
    saveDb(db);

    notifyAllWorkplaceAdmins({
      event: "USER_REGISTRATION_PENDING",
      title: `Pendaftaran Akun Baru: ${newUser.name} (${newUser.employeeNo})`,
      message: `${newUser.name} dari departemen ${newUser.department} mendaftar sebagai ${newUser.role} dan menunggu persetujuan Workplace Solution Admin.`,
    });

    appendAuditLog({
      actorId: newUser.id,
      actorName: newUser.name,
      actorRole: newUser.role,
      action: "USER_REGISTER_PENDING",
      entity: "User",
      entityId: newUser.employeeNo,
      summary: `Pendaftaran akun baru ${newUser.name} (${newUser.employeeNo} - ${newUser.department}) menunggu persetujuan Workplace Solution Admin.`,
      after: sanitizeUser(newUser),
    });

    return NextResponse.json(
      {
        user: sanitizeUser(newUser),
        message:
          "Pendaftaran berhasil dikirim! Akun Anda kini berstatus MENUNGGU PERSETUJUAN (Pending Approval) dari Workplace Solution Admin sebelum dapat digunakan untuk login.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses pendaftaran akun." },
      { status: 500 }
    );
  }
}
