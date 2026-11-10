import { NextResponse } from "next/server";
import { isWorkplaceAdmin } from "@/lib/auth";
import { getActiveServerUser } from "@/lib/server-guard";
import {
  appendAuditLog,
  DatabaseState,
  findAvailableDrivers,
  findAvailableVehicles,
  generateBookingNo,
  hasTimeOverlapWithBuffer,
  loadDbAsync,
  notifyAllWorkplaceAdmins,
  pushNotification,
  saveDbAsync,
  suggestAlternativeSlots,
} from "@/lib/store";
import { Booking } from "@/lib/types";
import {
  bookingCreateSchema,
  bookingDecisionSchema,
  sanitizeText,
} from "@/lib/validations";

async function runAutomatedBookingLifecycleChecks(db: DatabaseState) {
  const nowMs = Date.now();
  const graceMs = db.settings.noShowGraceMinutes * 60_000;
  let changed = false;

  for (const bk of db.bookings) {
    const startMs = new Date(bk.startAt).getTime();

    // FR-012: Pending requests expire automatically when trip start time passes
    if (bk.status === "PENDING_APPROVAL" && startMs <= nowMs) {
      bk.status = "EXPIRED";
      bk.updatedAt = new Date().toISOString();
      bk.history.push({
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        bookingId: bk.id,
        fromStatus: "PENDING_APPROVAL",
        toStatus: "EXPIRED",
        actorId: "SYSTEM",
        actorName: "CARE System Automation",
        reason: "Melewati waktu mulai perjalanan tanpa keputusan (FR-012)",
        at: bk.updatedAt,
      });
      pushNotification({
        userId: bk.requesterId,
        event: "BOOKING_EXPIRED",
        title: `Booking ${bk.bookingNo} Kedaluwarsa`,
        message: `Permintaan mobil ke ${bk.destination} telah melewati jam keberangkatan tanpa persetujuan. Silakan ajukan jadwal baru.`,
        bookingId: bk.id,
      });
      changed = true;
    }

    // FR-030: Confirmed booking becomes NO_SHOW if driver hasn't checked out within grace period
    if (
      bk.status === "CONFIRMED" &&
      startMs + graceMs * 6 < nowMs &&
      !bk.trip
    ) {
      bk.status = "NO_SHOW";
      bk.updatedAt = new Date().toISOString();
      bk.history.push({
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        bookingId: bk.id,
        fromStatus: "CONFIRMED",
        toStatus: "NO_SHOW",
        actorId: "SYSTEM",
        actorName: "CARE System Automation",
        reason:
          "Melewati batas waktu toleransi (Grace Period) tanpa Check-Out (FR-030)",
        at: bk.updatedAt,
      });
      changed = true;
    }
  }

  if (changed) {
    await saveDbAsync(db);
  }
}

export async function GET() {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  const db = await loadDbAsync();
  await runAutomatedBookingLifecycleChecks(db);
  const user = auth.user;

  let visibleBookings = db.bookings;
  if (isWorkplaceAdmin(user.role)) {
    visibleBookings = db.bookings;
  } else if (user.role === "DRIVER") {
    const driverProfile = db.drivers.find((d) => d.userId === user.id);
    visibleBookings = driverProfile
      ? db.bookings.filter((b) => b.driverId === driverProfile.id)
      : [];
  } else {
    visibleBookings = db.bookings.filter((b) => b.requesterId === user.id);
  }

  const userNotifications = db.notifications.filter(
    (n) => n.userId === user.id
  );

  return NextResponse.json({
    bookings: visibleBookings,
    notifications: userNotifications,
    carTypes: db.carTypes,
    vehicles: db.vehicles,
    drivers: db.drivers,
    settings: db.settings,
  });
}

export async function POST(request: Request) {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const parsed = bookingCreateSchema.safeParse({
      ...body,
      passengers: Number(body.passengers),
      estDistanceKm: Number(body.estDistanceKm),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Data pemesanan kendaraan tidak valid (FR-003).",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const db = await loadDbAsync();
    const startMs = new Date(d.startAt).getTime();
    const endMs = new Date(d.endAt).getTime();
    const nowMs = Date.now();

    if (isNaN(startMs) || isNaN(endMs)) {
      return NextResponse.json(
        { error: "Format tanggal dan waktu keberangkatan tidak valid." },
        { status: 400 }
      );
    }

    if (startMs <= nowMs - 5 * 60_000) {
      return NextResponse.json(
        {
          error:
            "Waktu keberangkatan harus berada di masa mendatang (FR-003: Start time must be in the future).",
        },
        { status: 400 }
      );
    }

    if (endMs <= startMs) {
      return NextResponse.json(
        {
          error:
            "Waktu kembali harus setelah waktu keberangkatan (FR-003: End time must be after start time).",
        },
        { status: 400 }
      );
    }

    const minNoticeMs = db.settings.minBookingNoticeHours * 3600_000;
    const isAdminUrgent =
      isWorkplaceAdmin(auth.user.role) && d.urgentOverrideByAdmin;
    if (!isAdminUrgent && startMs - nowMs < minNoticeMs) {
      return NextResponse.json(
        {
          error: `Pemesanan wajib diajukan minimal ${db.settings.minBookingNoticeHours} jam sebelum jadwal keberangkatan (BR-11). Untuk kebutuhan darurat, hubungi Workplace Solution Admin.`,
        },
        { status: 400 }
      );
    }

    const maxSeats = Math.max(
      ...db.vehicles
        .filter((v) => v.status !== "OUT_OF_SERVICE")
        .map((v) => v.seats),
      0
    );
    if (d.passengers > maxSeats) {
      return NextResponse.json(
        {
          error: `Jumlah penumpang (${d.passengers} orang) melebihi kapasitas kursi maksimum kendaraan operasional (${maxSeats} kursi) [FR-003].`,
        },
        { status: 400 }
      );
    }

    const freeVehicles = findAvailableVehicles({
      startAt: d.startAt,
      endAt: d.endAt,
      passengers: d.passengers,
      preferredCarTypeId: d.preferredCarTypeId,
      preferredPowertrain: d.preferredPowertrain,
    });

    if (freeVehicles.length === 0) {
      const alternatives = suggestAlternativeSlots({
        startAt: d.startAt,
        endAt: d.endAt,
        passengers: d.passengers,
        preferredCarTypeId: d.preferredCarTypeId,
        preferredPowertrain: d.preferredPowertrain,
      });

      return NextResponse.json(
        {
          error:
            "Seluruh kendaraan yang sesuai kapasitas/tipe sedang terpakai atau dalam jadwal maintenance pada jam tersebut (FR-002). Silakan pilih salah satu dari rekomendasi slot waktu alternatif di bawah ini.",
          alternatives,
        },
        { status: 409 }
      );
    }

    const selectedCarType = d.preferredCarTypeId
      ? db.carTypes.find((c) => c.id === d.preferredCarTypeId)
      : null;
    const isEvPreferred =
      d.preferredPowertrain === "EV" || selectedCarType?.powertrain === "EV";
    const requiredRange = Math.ceil(
      d.estDistanceKm * db.settings.evRangeBufferMultiplier
    );
    const maxEvRange = Math.max(
      ...freeVehicles
        .filter((v) => v.powertrain === "EV")
        .map((v) => v.usableRangeKm),
      340
    );
    const evRangeWarning = isEvPreferred && requiredRange > maxEvRange;

    let requester = auth.user;
    if (isWorkplaceAdmin(auth.user.role) && d.behalfOfUserId) {
      const targetEmp = db.users.find((u) => u.id === d.behalfOfUserId);
      if (targetEmp) requester = targetEmp;
    }

    const nowIso = new Date().toISOString();
    const bookingId = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const bookingNo = generateBookingNo();

    const newBooking: Booking = {
      id: bookingId,
      bookingNo,
      requesterId: requester.id,
      requesterName: requester.name,
      requesterDepartment: requester.department,
      requesterPhone: requester.phone,
      startAt: d.startAt,
      endAt: d.endAt,
      pickupLocation: d.pickupLocation,
      destination: d.destination,
      purpose: d.purpose,
      passengers: d.passengers,
      estDistanceKm: d.estDistanceKm,
      preferredCarTypeId: selectedCarType?.id || null,
      preferredCarTypeName: selectedCarType?.name || "Semua Tipe Mobil",
      preferredPowertrain: d.preferredPowertrain,
      channel: d.channel,
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
      evRangeWarning,
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [
        {
          id: `h-${Date.now()}`,
          bookingId,
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: auth.user.id,
          actorName: auth.user.name,
          reason: "Pengajuan pemesanan kendaraan operasional baru",
          at: nowIso,
        },
      ],
      trip: null,
    };

    db.bookings.unshift(newBooking);
    await saveDbAsync(db);

    pushNotification({
      userId: requester.id,
      event: "BOOKING_SUBMITTED",
      title: `Permintaan ${bookingNo} Terkirim`,
      message: `Permintaan mobil ke ${d.destination} sedang menunggu persetujuan Workplace Solution Admin.`,
      bookingId: newBooking.id,
      channel: d.channel,
    });

    notifyAllWorkplaceAdmins({
      event: "NEW_BOOKING_REQUEST",
      title: `Permintaan Booking Baru: ${bookingNo}`,
      message: `${requester.name} (${requester.department}) mengajukan mobil ke ${d.destination} untuk ${d.passengers} penumpang.`,
      bookingId: newBooking.id,
    });

    appendAuditLog({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: "CREATE_BOOKING",
      entity: "Booking",
      entityId: bookingNo,
      summary: `${requester.name} mengajukan pemesanan ${bookingNo} tujuan ${d.destination} (${d.passengers} penumpang, ${d.estDistanceKm} km)`,
      after: newBooking,
    });

    return NextResponse.json(
      {
        booking: newBooking,
        evRangeWarning,
        message: `Permintaan pemesanan ${bookingNo} berhasil dikirim dan menunggu persetujuan Workplace Solution Admin.`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan permintaan pemesanan." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const bookingId = String(body.bookingId || "");
    const db = await loadDbAsync();
    const booking = db.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: "Data pemesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    // Case 1: Employee cancels their own booking (FR-025, BR-03)
    if (body.action === "EMPLOYEE_CANCEL") {
      if (
        booking.requesterId !== auth.user.id &&
        !isWorkplaceAdmin(auth.user.role)
      ) {
        return NextResponse.json(
          { error: "Anda hanya dapat membatalkan pemesanan milik Anda sendiri." },
          { status: 403 }
        );
      }

      if (
        booking.status === "COMPLETED" ||
        booking.status === "IN_PROGRESS" ||
        booking.status === "CANCELLED"
      ) {
        return NextResponse.json(
          { error: "Pemesanan ini tidak dapat dibatalkan." },
          { status: 400 }
        );
      }

      const cutoffMs = db.settings.cancellationCutoffHours * 3600_000;
      const timeUntilStart = new Date(booking.startAt).getTime() - Date.now();
      const isLateCancel =
        booking.status === "CONFIRMED" && timeUntilStart < cutoffMs;

      const prevStatus = booking.status;
      booking.status = "CANCELLED";
      booking.lateCancelFlag = isLateCancel;
      booking.updatedAt = nowIso;
      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: prevStatus,
        toStatus: "CANCELLED",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: body.reason
          ? sanitizeText(String(body.reason))
          : isLateCancel
          ? "Dibatalkan oleh pemohon (Late Cancellation < 2 jam sebelum berangkat)"
          : "Dibatalkan oleh pemohon",
        at: nowIso,
      });

      await saveDbAsync(db);

      notifyAllWorkplaceAdmins({
        event: "BOOKING_CANCELLED",
        title: `Booking ${booking.bookingNo} Dibatalkan${
          isLateCancel ? " (LATE CANCEL)" : ""
        }`,
        message: `${booking.requesterName} membatalkan perjalanan ke ${booking.destination}. Slot kendaraan telah dibebaskan kembali.`,
        bookingId: booking.id,
      });

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "CANCEL_BOOKING",
        entity: "Booking",
        entityId: booking.bookingNo,
        summary: `${auth.user.name} membatalkan booking ${booking.bookingNo}${
          isLateCancel ? " [Terlambat Batal / Late Cancel]" : ""
        }`,
      });

      return NextResponse.json({
        booking,
        message: `Booking ${booking.bookingNo} telah dibatalkan.`,
      });
    }

    // Case 2: Employee edits booking while PENDING_APPROVAL or REVISION_NEEDED (FR-005)
    if (body.action === "EMPLOYEE_EDIT") {
      if (booking.requesterId !== auth.user.id) {
        return NextResponse.json(
          { error: "Akses ditolak." },
          { status: 403 }
        );
      }
      if (
        booking.status !== "PENDING_APPROVAL" &&
        booking.status !== "REVISION_NEEDED"
      ) {
        return NextResponse.json(
          {
            error:
              "Pemesanan hanya dapat diubah saat berstatus Menunggu Persetujuan atau Perlu Revisi (FR-005).",
          },
          { status: 400 }
        );
      }

      const nextDest = body.destination
        ? sanitizeText(String(body.destination))
        : booking.destination;
      const nextPurpose = body.purpose
        ? sanitizeText(String(body.purpose))
        : booking.purpose;
      const nextPickup = body.pickupLocation
        ? sanitizeText(String(body.pickupLocation))
        : booking.pickupLocation;
      const nextPax = body.passengers
        ? Number(body.passengers)
        : booking.passengers;
      const nextDist = body.estDistanceKm
        ? Number(body.estDistanceKm)
        : booking.estDistanceKm;
      const nextStart = body.startAt ? String(body.startAt) : booking.startAt;
      const nextEnd = body.endAt ? String(body.endAt) : booking.endAt;

      if (
        nextDest.length < 3 ||
        nextPurpose.length < 4 ||
        isNaN(nextPax) ||
        nextPax < 1 ||
        nextPax > 15 ||
        isNaN(nextDist) ||
        nextDist < 1 ||
        nextDist > 2000 ||
        new Date(nextEnd).getTime() <= new Date(nextStart).getTime()
      ) {
        return NextResponse.json(
          {
            error:
              "Data perubahan booking tidak valid. Pastikan tujuan, keperluan, jumlah penumpang, dan waktu perjalanan benar (FR-003).",
          },
          { status: 400 }
        );
      }

      const freeForEdit = findAvailableVehicles({
        startAt: nextStart,
        endAt: nextEnd,
        passengers: nextPax,
        preferredCarTypeId: booking.preferredCarTypeId,
        preferredPowertrain: booking.preferredPowertrain,
        excludeBookingId: booking.id,
      });

      if (freeForEdit.length === 0) {
        return NextResponse.json(
          {
            error:
              "Tidak ada kendaraan yang tersedia untuk jumlah penumpang atau jadwal yang baru dipilih (FR-002).",
          },
          { status: 409 }
        );
      }

      const prevStatus = booking.status;
      booking.destination = nextDest;
      booking.purpose = nextPurpose;
      booking.pickupLocation = nextPickup;
      booking.passengers = nextPax;
      booking.estDistanceKm = nextDist;
      booking.startAt = nextStart;
      booking.endAt = nextEnd;

      booking.status = "PENDING_APPROVAL";
      booking.updatedAt = nowIso;
      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: prevStatus,
        toStatus: "PENDING_APPROVAL",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason:
          "Pemohon memperbarui rincian perjalanan dan mengirim ulang ke Workplace Solution",
        at: nowIso,
      });

      await saveDbAsync(db);

      notifyAllWorkplaceAdmins({
        event: "BOOKING_RESUBMITTED",
        title: `Revisi Booking ${booking.bookingNo} Dikirim Ulang`,
        message: `${booking.requesterName} telah memperbarui rincian booking ${booking.bookingNo}.`,
        bookingId: booking.id,
      });

      return NextResponse.json({
        booking,
        message:
          "Perubahan booking berhasil disimpan dan dikirim kembali ke antrean Workplace Solution.",
      });
    }

    // Case 3: Workplace Solution Admin decisions
    if (!isWorkplaceAdmin(auth.user.role)) {
      return NextResponse.json(
        {
          error:
            "Hanya Workplace Solution Admin yang berwenang memproses persetujuan atau penjadwalan kendaraan.",
        },
        { status: 403 }
      );
    }

    const parsedDecision = bookingDecisionSchema.safeParse(body);
    if (!parsedDecision.success) {
      return NextResponse.json(
        { error: parsedDecision.error.issues[0]?.message || "Input tidak valid" },
        { status: 400 }
      );
    }

    const dec = parsedDecision.data;

    if (dec.action === "REJECT") {
      if (!dec.reason || dec.reason.trim().length < 3) {
        return NextResponse.json(
          {
            error:
              "Alasan penolakan WAJIB diisi oleh Workplace Solution Admin (FR-009).",
          },
          { status: 400 }
        );
      }

      const prevStatus = booking.status;
      booking.status = "REJECTED";
      booking.decidedById = auth.user.id;
      booking.decidedByName = auth.user.name;
      booking.decidedAt = nowIso;
      booking.decisionNote = dec.reason;
      booking.updatedAt = nowIso;
      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: prevStatus,
        toStatus: "REJECTED",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: dec.reason,
        at: nowIso,
      });

      await saveDbAsync(db);

      pushNotification({
        userId: booking.requesterId,
        event: "BOOKING_REJECTED",
        title: `Booking ${booking.bookingNo} Ditolak Workplace Solution`,
        message: `Alasan: ${dec.reason}`,
        bookingId: booking.id,
        channel: booking.channel,
      });

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "REJECT_BOOKING",
        entity: "Booking",
        entityId: booking.bookingNo,
        summary: `Workplace Solution Admin menolak booking ${booking.bookingNo}. Alasan: ${dec.reason}`,
      });

      return NextResponse.json({
        booking,
        message: `Booking ${booking.bookingNo} telah ditolak.`,
      });
    }

    if (dec.action === "REVISION") {
      if (!dec.reason || dec.reason.trim().length < 3) {
        return NextResponse.json(
          { error: "Catatan revisi wajib diisi (FR-010)." },
          { status: 400 }
        );
      }

      const prevStatus = booking.status;
      booking.status = "REVISION_NEEDED";
      booking.decidedById = auth.user.id;
      booking.decidedByName = auth.user.name;
      booking.decidedAt = nowIso;
      booking.decisionNote = dec.reason;
      booking.updatedAt = nowIso;
      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: prevStatus,
        toStatus: "REVISION_NEEDED",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: dec.reason,
        at: nowIso,
      });

      await saveDbAsync(db);

      pushNotification({
        userId: booking.requesterId,
        event: "BOOKING_REVISION_NEEDED",
        title: `Permintaan Revisi untuk Booking ${booking.bookingNo}`,
        message: `Catatan Workplace Solution: ${dec.reason}. Silakan buka aplikasi untuk mengedit permintaan Anda.`,
        bookingId: booking.id,
        channel: booking.channel,
      });

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "REQUEST_REVISION_BOOKING",
        entity: "Booking",
        entityId: booking.bookingNo,
        summary: `Workplace Solution Admin meminta revisi pada booking ${booking.bookingNo}: ${dec.reason}`,
      });

      return NextResponse.json({
        booking,
        message: `Permintaan revisi dikirim ke pemohon.`,
      });
    }

    if (
      dec.action === "APPROVE" ||
      dec.action === "REASSIGN" ||
      dec.action === "OVERRIDE"
    ) {
      if (!dec.vehicleId || !dec.driverId) {
        return NextResponse.json(
          {
            error:
              "Workplace Solution Admin wajib memilih Kendaraan dan Driver yang tersedia (FR-008).",
          },
          { status: 400 }
        );
      }

      if (dec.action === "OVERRIDE" && (!dec.reason || dec.reason.length < 3)) {
        return NextResponse.json(
          {
            error:
              "Tindakan Override prioritas wajib menyertakan alasan resmi (FR-022 / BR-09).",
          },
          { status: 400 }
        );
      }

      const targetStart = dec.newStartAt || booking.startAt;
      const targetEnd = dec.newEndAt || booking.endAt;

      const vehicle = db.vehicles.find((v) => v.id === dec.vehicleId);
      const driver = db.drivers.find((d) => d.id === dec.driverId);

      if (!vehicle || !driver) {
        return NextResponse.json(
          { error: "Kendaraan atau Driver tidak ditemukan." },
          { status: 404 }
        );
      }

      if (vehicle.seats < booking.passengers) {
        return NextResponse.json(
          {
            error: `Kapasitas kursi ${vehicle.plateNo} (${vehicle.seats} kursi) tidak mencukupi untuk ${booking.passengers} penumpang.`,
          },
          { status: 400 }
        );
      }

      const buffer = db.settings.turnaroundBufferMinutes;
      const conflictingBooking = db.bookings.find(
        (b) =>
          b.id !== booking.id &&
          (b.status === "CONFIRMED" || b.status === "IN_PROGRESS") &&
          (b.vehicleId === vehicle.id || b.driverId === driver.id) &&
          hasTimeOverlapWithBuffer(
            targetStart,
            targetEnd,
            b.startAt,
            b.endAt,
            buffer
          )
      );

      if (conflictingBooking && dec.action !== "OVERRIDE") {
        const freeVehicles = findAvailableVehicles({
          startAt: targetStart,
          endAt: targetEnd,
          passengers: booking.passengers,
          excludeBookingId: booking.id,
        });
        const freeDrivers = findAvailableDrivers({
          startAt: targetStart,
          endAt: targetEnd,
          excludeBookingId: booking.id,
        });

        return NextResponse.json(
          {
            error: `Konflik jadwal terdeteksi (FR-011)! Kendaraan atau Driver telah digunakan pada booking ${conflictingBooking.bookingNo} (${conflictingBooking.destination}). Pilih unit lain atau gunakan fitur Override Prioritas.`,
            freeVehicles,
            freeDrivers,
          },
          { status: 409 }
        );
      }

      if (conflictingBooking && dec.action === "OVERRIDE") {
        conflictingBooking.status = "REVISION_NEEDED";
        conflictingBooking.vehicleId = null;
        conflictingBooking.vehiclePlate = null;
        conflictingBooking.driverId = null;
        conflictingBooking.driverName = null;
        conflictingBooking.decisionNote = `Dijadwalkan ulang karena prioritas mendesak Workplace Solution: ${dec.reason}`;
        conflictingBooking.history.push({
          id: `h-${Date.now()}-ovr`,
          bookingId: conflictingBooking.id,
          fromStatus: "CONFIRMED",
          toStatus: "REVISION_NEEDED",
          actorId: auth.user.id,
          actorName: auth.user.name,
          reason: `Override prioritas oleh Workplace Solution: ${dec.reason}`,
          at: nowIso,
        });

        pushNotification({
          userId: conflictingBooking.requesterId,
          event: "BOOKING_OVERRIDDEN",
          title: `Perubahan Jadwal Prioritas pada Booking ${conflictingBooking.bookingNo}`,
          message: `Mohon maaf, unit pada booking Anda dialihkan untuk kebutuhan prioritas (${dec.reason}). Silakan pilih jadwal pengganti atau hubungi Workplace Solution.`,
          bookingId: conflictingBooking.id,
        });
      }

      const prevStatus = booking.status;
      booking.startAt = targetStart;
      booking.endAt = targetEnd;
      booking.status = "CONFIRMED";
      booking.vehicleId = vehicle.id;
      booking.vehiclePlate = vehicle.plateNo;
      booking.vehicleModel = vehicle.model;
      booking.vehiclePowertrain = vehicle.powertrain;
      booking.driverId = driver.id;
      booking.driverName = driver.name;
      booking.driverPhone = driver.phone;
      booking.decidedById = auth.user.id;
      booking.decidedByName = auth.user.name;
      booking.decidedAt = nowIso;
      booking.decisionNote =
        dec.reason || `Disetujui dengan unit ${vehicle.plateNo} & ${driver.name}`;
      booking.overrideFlag = dec.action === "OVERRIDE";
      booking.updatedAt = nowIso;

      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: prevStatus,
        toStatus: "CONFIRMED",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: booking.decisionNote,
        at: nowIso,
      });

      await saveDbAsync(db);

      pushNotification({
        userId: booking.requesterId,
        event: "BOOKING_APPROVED",
        title: `Booking ${booking.bookingNo} Disetujui Workplace Solution!`,
        message: `Kendaraan: ${vehicle.model} (${vehicle.plateNo}) • Driver: ${driver.name} (${driver.phone}). Lokasi jemput: ${booking.pickupLocation}.`,
        bookingId: booking.id,
        channel: booking.channel,
      });

      pushNotification({
        userId: driver.userId,
        event: "DRIVER_ASSIGNED",
        title: `Tugas Perjalanan Baru: ${booking.bookingNo}`,
        message: `Anda ditugaskan mengantar ${booking.requesterName} ke ${booking.destination} menggunakan ${vehicle.plateNo}.`,
        bookingId: booking.id,
      });

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: `${dec.action}_BOOKING`,
        entity: "Booking",
        entityId: booking.bookingNo,
        summary: `Workplace Solution Admin (${auth.user.name}) melakukan ${dec.action} pada ${booking.bookingNo}: Kendaraan ${vehicle.plateNo}, Driver ${driver.name}`,
        after: {
          bookingNo: booking.bookingNo,
          vehiclePlate: vehicle.plateNo,
          driverName: driver.name,
          reason: booking.decisionNote,
        },
      });

      return NextResponse.json({
        booking,
        message: `Booking ${booking.bookingNo} berhasil dikonfirmasi dengan kendaraan ${vehicle.plateNo} dan driver ${driver.name}.`,
      });
    }

    return NextResponse.json(
      { error: "Tindakan tidak dikenali." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses keputusan booking." },
      { status: 500 }
    );
  }
}
