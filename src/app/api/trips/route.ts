import { NextResponse } from "next/server";
import { isWorkplaceAdmin } from "@/lib/auth";
import { getActiveServerUser } from "@/lib/server-guard";
import {
  appendAuditLog,
  getDb,
  notifyAllWorkplaceAdmins,
  pushNotification,
  saveDb,
} from "@/lib/store";
import {
  sanitizeText,
  tripCheckinSchema,
  tripCheckoutSchema,
} from "@/lib/validations";

export async function POST(request: Request) {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");
    const db = getDb();

    // 1. TRIP CHECK-OUT (FR-026, FR-028, FR-033, FR-035)
    if (action === "CHECKOUT") {
      if (!auth.user.gpsConsent && !isWorkplaceAdmin(auth.user.role)) {
        return NextResponse.json(
          {
            error:
              "Persetujuan pelacakan GPS (GPS Consent) wajib disetujui sebelum memulai perjalanan dinas (FR-035).",
          },
          { status: 400 }
        );
      }

      const parsed = tripCheckoutSchema.safeParse({
        bookingId: body.bookingId,
        odoStart: Number(body.odoStart),
        levelStart: Number(body.levelStart),
        actualUserIds: body.actualUserIds,
        incidentNote: body.incidentNote,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ||
              "Data Check-Out tidak lengkap (FR-026 / FR-028).",
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const booking = db.bookings.find((b) => b.id === d.bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "Data booking tidak ditemukan." },
          { status: 404 }
        );
      }

      if (booking.status !== "CONFIRMED") {
        return NextResponse.json(
          {
            error:
              "Hanya pemesanan berstatus CONFIRMED yang dapat melakukan Check-Out.",
          },
          { status: 400 }
        );
      }

      const vehicle = db.vehicles.find((v) => v.id === booking.vehicleId);
      if (vehicle && d.odoStart < vehicle.odometerKm) {
        return NextResponse.json(
          {
            error: `Odometer awal (${d.odoStart} km) tidak boleh lebih rendah dari odometer tercatat kendaraan saat ini (${vehicle.odometerKm} km) [FR-019].`,
          },
          { status: 400 }
        );
      }

      // Resolve actual users from employee directory (FR-028)
      const actualUsersFormatted: string[] = [];
      for (const uid of d.actualUserIds) {
        const emp = db.users.find((u) => u.id === uid);
        if (emp) {
          actualUsersFormatted.push(`${emp.name} (${emp.employeeNo})`);
        }
      }

      if (actualUsersFormatted.length === 0) {
        return NextResponse.json(
          {
            error:
              "Penumpang aktual (Actual User) dari daftar karyawan wajib dipilih sebelum Check-Out (FR-028).",
          },
          { status: 400 }
        );
      }

      const requesterMatched = d.actualUserIds.includes(booking.requesterId);
      const nowIso = new Date().toISOString();
      const tripId = `trp-${Date.now()}`;

      booking.status = "IN_PROGRESS";
      booking.updatedAt = nowIso;
      booking.trip = {
        id: tripId,
        bookingId: booking.id,
        checkoutAt: nowIso,
        checkinAt: null,
        odoStart: d.odoStart,
        odoEnd: null,
        distanceKm: null,
        levelStart: d.levelStart,
        levelEnd: null,
        actualUsers: actualUsersFormatted,
        actualUserIds: d.actualUserIds,
        requesterMatched,
        incidentNote: d.incidentNote || null,
        lateReturn: false,
        lowFuelFlag: false,
        gpsLostFlag: false,
        gpsPoints: [
          {
            id: `gps-${Date.now()}`,
            tripId,
            lat: -6.2185,
            lng: 106.8122,
            label: `Check-out: ${booking.pickupLocation}`,
            speedKmh: 15,
            recordedAt: nowIso,
          },
        ],
      };

      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: "CONFIRMED",
        toStatus: "IN_PROGRESS",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: `Driver Check-Out (Odo: ${d.odoStart} km, Level: ${
          d.levelStart
        }%, Penumpang Aktual: ${actualUsersFormatted.join(", ")})`,
        at: nowIso,
      });

      if (vehicle) {
        vehicle.status = "IN_USE";
        vehicle.odometerKm = d.odoStart;
        vehicle.currentLevel = d.levelStart;
        vehicle.updatedAt = nowIso;
      }

      const drv = db.drivers.find((dr) => dr.id === booking.driverId);
      if (drv) drv.status = "ON_TRIP";

      saveDb(db);

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "TRIP_CHECKOUT",
        entity: "Trip",
        entityId: booking.bookingNo,
        summary: `Check-Out perjalanan ${booking.bookingNo} (${
          booking.vehiclePlate
        }). Odo Awal: ${d.odoStart} km. Penumpang Aktual: ${actualUsersFormatted.join(
          ", "
        )}${!requesterMatched ? " [MISMATCH Pemohon vs Aktual]" : ""}`,
        after: booking.trip,
      });

      return NextResponse.json({
        booking,
        message:
          "Check-Out berhasil! Pelacakan lokasi GPS aktif selama perjalanan berlangsung.",
      });
    }

    // 2. LIVE GPS PING (FR-033, FR-034: only allowed between check-out and check-in)
    if (action === "GPS_PING") {
      const booking = db.bookings.find((b) => b.id === body.bookingId);
      if (!booking || booking.status !== "IN_PROGRESS" || !booking.trip) {
        return NextResponse.json(
          {
            error:
              "Lokasi GPS hanya dapat dikirim saat perjalanan berstatus IN_PROGRESS (antara Check-Out dan Check-In) [FR-033].",
          },
          { status: 400 }
        );
      }

      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const label = sanitizeText(String(body.label || "Live Route Point"));
      const speedKmh = Number(body.speedKmh || 45);

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: "Koordinat GPS tidak valid." },
          { status: 400 }
        );
      }

      const point = {
        id: `gps-${Date.now()}`,
        tripId: booking.trip.id,
        lat,
        lng,
        label,
        speedKmh,
        recordedAt: new Date().toISOString(),
      };

      booking.trip.gpsPoints.push(point);
      booking.trip.gpsLostFlag = false;
      booking.updatedAt = point.recordedAt;
      saveDb(db);

      return NextResponse.json({
        booking,
        point,
        message: "Titik lokasi GPS diperbarui.",
      });
    }

    // 3. ADD INCIDENT NOTE (FR-032)
    if (action === "INCIDENT_NOTE") {
      const booking = db.bookings.find((b) => b.id === body.bookingId);
      if (!booking || !booking.trip) {
        return NextResponse.json(
          { error: "Data perjalanan tidak ditemukan." },
          { status: 404 }
        );
      }

      const note = sanitizeText(String(body.incidentNote || ""));
      booking.trip.incidentNote = note;
      booking.updatedAt = new Date().toISOString();
      saveDb(db);

      notifyAllWorkplaceAdmins({
        event: "TRIP_INCIDENT_NOTE",
        title: `Catatan Insiden / Kendala pada ${booking.bookingNo}`,
        message: `${auth.user.name} mencatat: "${note}" pada unit ${booking.vehiclePlate}.`,
        bookingId: booking.id,
      });

      return NextResponse.json({
        booking,
        message: "Catatan perjalanan berhasil disimpan.",
      });
    }

    // 4. TRIP CHECK-IN (FR-027, FR-019, FR-029, FR-031)
    if (action === "CHECKIN") {
      const parsed = tripCheckinSchema.safeParse({
        bookingId: body.bookingId,
        odoEnd: Number(body.odoEnd),
        levelEnd: Number(body.levelEnd),
        incidentNote: body.incidentNote,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ||
              "Data Check-In tidak valid (FR-027).",
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const booking = db.bookings.find((b) => b.id === d.bookingId);
      if (!booking || booking.status !== "IN_PROGRESS" || !booking.trip) {
        return NextResponse.json(
          {
            error:
              "Hanya perjalanan yang sedang berlangsung (IN_PROGRESS) yang dapat melakukan Check-In.",
          },
          { status: 400 }
        );
      }

      const odoStart = booking.trip.odoStart || 0;
      if (d.odoEnd < odoStart) {
        return NextResponse.json(
          {
            error: `Odometer akhir (${d.odoEnd} km) tidak boleh lebih rendah dari odometer awal saat Check-Out (${odoStart} km) [FR-019].`,
          },
          { status: 400 }
        );
      }

      const nowIso = new Date().toISOString();
      const distanceKm = d.odoEnd - odoStart;
      const plannedEndMs = new Date(booking.endAt).getTime();
      const graceMs = db.settings.noShowGraceMinutes * 60_000;
      const isLateReturn = Date.now() > plannedEndMs + graceMs;
      const isLowChargeOrFuel =
        d.levelEnd < db.settings.minChargeFuelPercent;

      booking.trip.checkinAt = nowIso;
      booking.trip.odoEnd = d.odoEnd;
      booking.trip.distanceKm = distanceKm;
      booking.trip.levelEnd = d.levelEnd;
      booking.trip.lateReturn = isLateReturn;
      booking.trip.lowFuelFlag = isLowChargeOrFuel;
      if (d.incidentNote) {
        booking.trip.incidentNote = d.incidentNote;
      }

      booking.trip.gpsPoints.push({
        id: `gps-${Date.now()}`,
        tripId: booking.trip.id,
        lat: -6.2185,
        lng: 106.8122,
        label: "Return Check-In: Head Office Pool",
        speedKmh: 0,
        recordedAt: nowIso,
      });

      booking.status = "COMPLETED";
      booking.updatedAt = nowIso;
      booking.history.push({
        id: `h-${Date.now()}`,
        bookingId: booking.id,
        fromStatus: "IN_PROGRESS",
        toStatus: "COMPLETED",
        actorId: auth.user.id,
        actorName: auth.user.name,
        reason: `Driver Check-In selesai. Jarak tempuh: ${distanceKm} km (Odo akhir: ${d.odoEnd} km, Sisa baterai/BBM: ${d.levelEnd}%)`,
        at: nowIso,
      });

      // FR-019 & FR-027: Update vehicle odometer & return status to AVAILABLE
      const vehicle = db.vehicles.find((v) => v.id === booking.vehicleId);
      if (vehicle) {
        vehicle.odometerKm = d.odoEnd;
        vehicle.currentLevel = d.levelEnd;
        vehicle.needsRefuel = isLowChargeOrFuel;
        vehicle.status = "AVAILABLE";
        vehicle.updatedAt = nowIso;
      }

      const drv = db.drivers.find((dr) => dr.id === booking.driverId);
      if (drv) drv.status = "AVAILABLE";

      saveDb(db);

      // FR-029: Flag Workplace Solution if charge/fuel below minimum 30%
      if (isLowChargeOrFuel && vehicle) {
        notifyAllWorkplaceAdmins({
          event: "LOW_CHARGE_FUEL_CHECKIN",
          title: `Peringatan Pengisian Daya/BBM: ${vehicle.plateNo} (${d.levelEnd}%)`,
          message: `Kendaraan ${vehicle.model} (${vehicle.plateNo}) kembali dari trip ${booking.bookingNo} dengan sisa baterai/BBM ${d.levelEnd}% (< ${db.settings.minChargeFuelPercent}%). Harap segera isi daya/BBM [FR-029].`,
          bookingId: booking.id,
        });
      }

      pushNotification({
        userId: booking.requesterId,
        event: "TRIP_COMPLETED",
        title: `Perjalanan ${booking.bookingNo} Selesai`,
        message: `Terima kasih telah menggunakan layanan CARE Workplace Solution. Jarak tempuh tercatat: ${distanceKm} km.`,
        bookingId: booking.id,
      });

      appendAuditLog({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "TRIP_CHECKIN",
        entity: "Trip",
        entityId: booking.bookingNo,
        summary: `Check-In selesai untuk ${booking.bookingNo} (${booking.vehiclePlate}). Jarak tempuh: ${distanceKm} km, Odo Akhir: ${d.odoEnd} km, Level Akhir: ${d.levelEnd}%`,
        after: booking.trip,
      });

      return NextResponse.json({
        booking,
        message: `Check-In berhasil! Jarak tempuh: ${distanceKm} km. Pelacakan GPS telah dihentikan.`,
      });
    }

    return NextResponse.json(
      { error: "Tindakan perjalanan tidak dikenali." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses aksi perjalanan." },
      { status: 500 }
    );
  }
}
