import { NextResponse } from "next/server";
import { isWorkplaceAdmin } from "@/lib/auth";
import { getActiveServerUser } from "@/lib/server-guard";
import {
  appendAuditLog,
  generateBookingNo,
  loadDbAsync,
  notifyAllWorkplaceAdmins,
  saveDbAsync,
} from "@/lib/store";
import { Booking, WhatsAppSession } from "@/lib/types";
import { sanitizeText } from "@/lib/validations";

export async function POST(request: Request) {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    // Non-admin users can only simulate from their own registered phone number
    const rawPhone = isWorkplaceAdmin(auth.user.role)
      ? sanitizeText(String(body.phone || auth.user.phone))
      : auth.user.phone;
    const text = sanitizeText(String(body.message || "")).trim();
    const db = await loadDbAsync();

    // FR-039: Identify employee by registered WhatsApp number
    const matchedUser = db.users.find(
      (u) =>
        u.phone.replace(/\D/g, "") === rawPhone.replace(/\D/g, "") &&
        u.status === "ACTIVE"
    );

    const nowIso = new Date().toISOString();
    const session: WhatsAppSession = db.whatsappSessions[rawPhone] || {
      phone: rawPhone,
      userId: matchedUser?.id,
      userName: matchedUser?.name,
      step: "MENU",
      retryCount: 0,
      draft: {},
      messages: [],
      lastActivityAt: nowIso,
    };

    // FR-045: Expire session after 15 minutes of inactivity
    if (
      Date.now() - new Date(session.lastActivityAt).getTime() >
      15 * 60_000
    ) {
      session.step = "MENU";
      session.retryCount = 0;
      session.draft = {};
    }

    session.lastActivityAt = nowIso;
    if (text) {
      session.messages.push({
        id: `wa-u-${Date.now()}`,
        sender: "USER",
        text,
        at: nowIso,
      });
    }

    const reply = async (botText: string) => {
      session.messages.push({
        id: `wa-b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sender: "BOT",
        text: botText,
        at: new Date().toISOString(),
      });
      db.whatsappSessions[rawPhone] = session;
      await saveDbAsync(db);
      return NextResponse.json({ session });
    };

    if (!matchedUser) {
      return reply(
        `Maaf, nomor WhatsApp (${rawPhone}) belum terdaftar sebagai karyawan aktif. Silakan hubungi Workplace Solution di ${db.settings.whatsappContactNumber} untuk registrasi nomor Anda. [FR-039]`
      );
    }

    const handleInvalidInput = async (hint: string) => {
      session.retryCount += 1;
      if (session.retryCount >= 3) {
        session.step = "MENU";
        session.retryCount = 0;
        session.draft = {};
        return reply(
          `Maaf, kami belum bisa memproses setelah 3 kali percobaan. Silakan gunakan aplikasi CARE atau hubungi Workplace Solution di ${db.settings.whatsappContactNumber}. [FR-041]`
        );
      }
      return reply(`${hint} (Percobaan ${session.retryCount} dari 3)`);
    };

    const upper = text.toUpperCase();
    if (
      upper === "MENU" ||
      upper === "RESET" ||
      upper === "PESAN MOBIL" ||
      !text
    ) {
      session.step = "MENU";
      session.retryCount = 0;
      session.draft = {};
      return reply(
        `Halo ${matchedUser.name} 👋\nSelamat datang di Layanan WhatsApp CARE Workplace Solution.\nPilih menu (ketik angka):\n1️⃣ Pesan mobil operasional\n2️⃣ Lihat booking saya\n3️⃣ Batalkan booking`
      );
    }

    if (session.step === "MENU") {
      if (text === "1") {
        session.step = "ASK_DATE";
        session.retryCount = 0;
        return reply(
          "Tanggal berangkat? Gunakan format DD/MM/YYYY (contoh: 15/12/2026)"
        );
      }
      if (text === "2") {
        const myBookings = db.bookings
          .filter((b) => b.requesterId === matchedUser.id)
          .slice(0, 5);
        if (myBookings.length === 0) {
          return reply(
            "Anda belum memiliki riwayat pemesanan mobil.\nKetik 1 untuk memesan mobil baru."
          );
        }
        const listStr = myBookings
          .map(
            (b) =>
              `• *${b.bookingNo}* (${b.status})\n  Tujuan: ${b.destination}\n  Unit: ${
                b.vehiclePlate || "Menunggu Workplace Solution"
              }`
          )
          .join("\n\n");
        return reply(
          `Daftar Booking Anda:\n\n${listStr}\n\nKetik *1* untuk Pesan Mobil atau *3* untuk Batalkan Booking.`
        );
      }
      if (text === "3") {
        const cancellable = db.bookings.filter(
          (b) =>
            b.requesterId === matchedUser.id &&
            (b.status === "PENDING_APPROVAL" || b.status === "CONFIRMED")
        );
        if (cancellable.length === 0) {
          return reply(
            "Tidak ada booking aktif yang dapat dibatalkan saat ini."
          );
        }
        session.step = "CANCEL_SELECT";
        session.retryCount = 0;
        const listStr = cancellable
          .map((b) => `• Ketik *${b.bookingNo}* (${b.destination})`)
          .join("\n");
        return reply(
          `Ketik Nomor Booking yang ingin dibatalkan:\n${listStr}`
        );
      }
      return handleInvalidInput(
        "Pilihan menu tidak sesuai. Ketik 1 (Pesan mobil), 2 (Booking saya), atau 3 (Batalkan booking)."
      );
    }

    if (session.step === "CANCEL_SELECT") {
      const target = db.bookings.find(
        (b) =>
          b.requesterId === matchedUser.id &&
          b.bookingNo.toUpperCase() === upper &&
          (b.status === "PENDING_APPROVAL" || b.status === "CONFIRMED")
      );
      if (!target) {
        return handleInvalidInput(
          "Nomor booking tidak ditemukan. Contoh ketik: BK-261105."
        );
      }
      target.status = "CANCELLED";
      target.updatedAt = nowIso;
      session.step = "MENU";
      session.retryCount = 0;
      await saveDbAsync(db);
      return reply(
        `✅ Booking *${target.bookingNo}* tujuan ${target.destination} telah berhasil dibatalkan melalui WhatsApp Bot.`
      );
    }

    if (session.step === "ASK_DATE") {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
      if (!match) {
        return handleInvalidInput(
          "Format tanggal tidak sesuai. Contoh: 15/12/2026."
        );
      }
      session.draft.dateStr = text;
      session.step = "ASK_TIME";
      session.retryCount = 0;
      return reply(
        "Jam berangkat dan jam kembali (WIB)? Gunakan format HH:MM-HH:MM (contoh: 09:00-15:00)"
      );
    }

    if (session.step === "ASK_TIME") {
      const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(text);
      if (!match) {
        return handleInvalidInput(
          "Format jam tidak sesuai. Contoh: 09:00-15:00."
        );
      }
      const [dd, mm, yyyy] = (session.draft.dateStr || "15/12/2026").split("/");
      // Parse explicitly in Asia/Jakarta (WIB, UTC+07:00) so Vercel UTC servers don't shift by 7h
      const startDate = new Date(
        `${yyyy}-${mm}-${dd}T${match[1]}:${match[2]}:00+07:00`
      );
      const endDate = new Date(
        `${yyyy}-${mm}-${dd}T${match[3]}:${match[4]}:00+07:00`
      );

      if (
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime()) ||
        endDate.getTime() <= startDate.getTime()
      ) {
        return handleInvalidInput(
          "Jam kembali harus setelah jam berangkat. Contoh: 09:00-15:00."
        );
      }

      session.draft.timeRangeStr = text;
      session.draft.startAt = startDate.toISOString();
      session.draft.endAt = endDate.toISOString();
      session.step = "ASK_DESTINATION";
      session.retryCount = 0;
      return reply("Tujuan perjalanan dinas? (contoh: Kantor Klien Sudirman)");
    }

    if (session.step === "ASK_DESTINATION") {
      if (text.length < 3) {
        return handleInvalidInput("Tujuan minimal 3 karakter.");
      }
      session.draft.destination = text;
      session.step = "ASK_PASSENGERS";
      session.retryCount = 0;
      return reply("Jumlah penumpang? (ketik angka 1 - 6)");
    }

    if (session.step === "ASK_PASSENGERS") {
      const pax = Number(text);
      if (isNaN(pax) || pax < 1 || pax > 6) {
        return handleInvalidInput(
          "Jumlah penumpang harus angka antara 1 sampai 6."
        );
      }
      session.draft.passengers = pax;
      session.step = "ASK_PURPOSE";
      session.retryCount = 0;
      return reply("Keperluan perjalanan dinas? (contoh: Rapat kontrak vendor)");
    }

    if (session.step === "ASK_PURPOSE") {
      if (text.length < 4) {
        return handleInvalidInput("Keperluan minimal 4 karakter.");
      }
      session.draft.purpose = text;
      session.step = "CONFIRM";
      session.retryCount = 0;
      return reply(
        `📋 *Ringkasan Permintaan Mobil*\n• Tanggal: ${session.draft.dateStr}\n• Jam: ${session.draft.timeRangeStr} WIB\n• Tujuan: ${session.draft.destination}\n• Penumpang: ${session.draft.passengers} orang\n• Keperluan: ${session.draft.purpose}\n\nBalas *YA* untuk kirim ke Workplace Solution atau *TIDAK* untuk batal.`
      );
    }

    if (session.step === "CONFIRM") {
      if (upper === "TIDAK" || upper === "BATAL") {
        session.step = "MENU";
        session.draft = {};
        session.retryCount = 0;
        return reply("Draft permintaan dibatalkan. Ketik MENU untuk mulai lagi.");
      }
      if (upper === "YA") {
        const bookingNo = generateBookingNo();
        const bkId = `bk-wa-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const newBk: Booking = {
          id: bkId,
          bookingNo,
          requesterId: matchedUser.id,
          requesterName: matchedUser.name,
          requesterDepartment: matchedUser.department,
          requesterPhone: matchedUser.phone,
          startAt:
            session.draft.startAt ||
            new Date(Date.now() + 86400_000).toISOString(),
          endAt:
            session.draft.endAt ||
            new Date(Date.now() + 97200_000).toISOString(),
          pickupLocation: "Lobby Utama HQ (via WhatsApp)",
          destination: session.draft.destination || "Jakarta",
          purpose: session.draft.purpose || "Dinas Operasional",
          passengers: session.draft.passengers || 2,
          estDistanceKm: 30,
          preferredCarTypeId: null,
          preferredCarTypeName: "Semua Tipe Mobil",
          preferredPowertrain: "ANY",
          channel: "WHATSAPP",
          status: "PENDING_APPROVAL",
          vehicleId: null,
          vehiclePlate: null,
          vehicleModel: null,
          vehiclePowertrain: null,
          driverId: null,
          driverName: null,
          driverPhone: null,
          decidedById: null,
          decidedByName: null,
          decidedAt: null,
          decisionNote: null,
          lateCancelFlag: false,
          overrideFlag: false,
          evRangeWarning: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          history: [
            {
              id: `h-wa-${Date.now()}`,
              bookingId: bkId,
              fromStatus: "NEW",
              toStatus: "PENDING_APPROVAL",
              actorId: matchedUser.id,
              actorName: matchedUser.name,
              reason: "Diajukan melalui WhatsApp Bot [FR-040]",
              at: nowIso,
            },
          ],
          trip: null,
        };

        db.bookings.unshift(newBk);
        session.step = "MENU";
        session.draft = {};
        session.retryCount = 0;
        await saveDbAsync(db);

        notifyAllWorkplaceAdmins({
          event: "WHATSAPP_BOOKING_SUBMITTED",
          title: `Booking WhatsApp Baru: ${bookingNo}`,
          message: `${matchedUser.name} memesan mobil via WhatsApp ke ${newBk.destination}.`,
          bookingId: newBk.id,
        });

        appendAuditLog({
          actorId: matchedUser.id,
          actorName: matchedUser.name,
          actorRole: matchedUser.role,
          action: "WHATSAPP_CREATE_BOOKING",
          entity: "Booking",
          entityId: bookingNo,
          summary: `${matchedUser.name} membuat booking ${bookingNo} melalui WhatsApp Bot ke ${newBk.destination}`,
        });

        return reply(
          `✅ Permintaan terkirim dengan nomor *${bookingNo}*. Status: *Menunggu Persetujuan Workplace Solution*. Anda akan menerima notifikasi setelah kendaraan & driver ditugaskan.`
        );
      }

      return handleInvalidInput(
        "Balas YA untuk mengirim permintaan atau TIDAK untuk membatalkan."
      );
    }

    return reply("Ketik MENU untuk kembali ke menu utama.");
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses pesan WhatsApp Bot." },
      { status: 500 }
    );
  }
}
