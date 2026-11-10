import { NextResponse } from "next/server";
import { requireWorkplaceAdminUser } from "@/lib/server-guard";
import { appendAuditLog, getDb, saveDb } from "@/lib/store";
import { sanitizeText } from "@/lib/validations";

export async function GET(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const powertrainFilter = searchParams.get("powertrain") || "ALL";

  const db = getDb();

  const fromMs = fromParam ? new Date(fromParam).getTime() : 0;
  const toMs = toParam
    ? new Date(toParam).getTime() + 86400_000
    : Number.MAX_SAFE_INTEGER;

  const filteredBookings = db.bookings.filter((b) => {
    const t = new Date(b.startAt).getTime();
    if (t < fromMs || t > toMs) return false;
    if (
      powertrainFilter !== "ALL" &&
      (b.vehiclePowertrain || b.preferredPowertrain) !== powertrainFilter
    ) {
      return false;
    }
    return true;
  });

  // 1. Vehicle Utilization & Usage Report (FR-051)
  const vehicleReport = db.vehicles.map((v) => {
    const vBookings = filteredBookings.filter(
      (b) =>
        b.vehicleId === v.id &&
        (b.status === "COMPLETED" ||
          b.status === "IN_PROGRESS" ||
          b.status === "CONFIRMED")
    );
    const completed = vBookings.filter((b) => b.status === "COMPLETED");
    const totalDistanceKm = completed.reduce(
      (acc, b) => acc + (b.trip?.distanceKm ?? b.estDistanceKm ?? 0),
      0
    );
    const totalHours = vBookings.reduce((acc, b) => {
      const dur =
        (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) /
        3600_000;
      return acc + Math.max(0.5, Number(dur.toFixed(1)));
    }, 0);

    // Assume 160 working hours per month baseline for utilization %
    const utilizationPct = Math.min(
      100,
      Math.round((totalHours / 40) * 100)
    );

    return {
      vehicleId: v.id,
      plateNo: v.plateNo,
      model: v.model,
      powertrain: v.powertrain,
      status: v.status,
      odometerKm: v.odometerKm,
      currentLevel: v.currentLevel,
      needsRefuel: v.needsRefuel,
      totalTrips: completed.length,
      scheduledTrips: vBookings.length,
      totalHours: Number(totalHours.toFixed(1)),
      totalDistanceKm,
      utilizationPct,
    };
  });

  // 2. Employee & Department Usage Report (FR-052)
  const departmentMap = new Map<
    string,
    {
      department: string;
      bookingsCount: number;
      completedCount: number;
      lateCancelCount: number;
      totalDistanceKm: number;
    }
  >();

  for (const b of filteredBookings) {
    const dept = b.requesterDepartment || "General";
    const cur = departmentMap.get(dept) || {
      department: dept,
      bookingsCount: 0,
      completedCount: 0,
      lateCancelCount: 0,
      totalDistanceKm: 0,
    };
    cur.bookingsCount += 1;
    if (b.status === "COMPLETED") {
      cur.completedCount += 1;
      cur.totalDistanceKm += b.trip?.distanceKm ?? b.estDistanceKm ?? 0;
    }
    if (b.lateCancelFlag) {
      cur.lateCancelCount += 1;
    }
    departmentMap.set(dept, cur);
  }

  // 3. Requester vs. Actual User Comparison Report (FR-053)
  const tripComparisonReport = filteredBookings
    .filter((b) => b.status === "COMPLETED" || b.status === "IN_PROGRESS")
    .map((b) => ({
      bookingId: b.id,
      bookingNo: b.bookingNo,
      startAt: b.startAt,
      endAt: b.endAt,
      checkoutAt: b.trip?.checkoutAt || null,
      checkinAt: b.trip?.checkinAt || null,
      requesterName: b.requesterName,
      requesterDepartment: b.requesterDepartment,
      actualUsers: b.trip?.actualUsers || [b.requesterName],
      requesterMatched: b.trip ? b.trip.requesterMatched : true,
      destination: b.destination,
      purpose: b.purpose,
      vehiclePlate: b.vehiclePlate || "-",
      vehicleModel: b.vehicleModel || "-",
      powertrain: b.vehiclePowertrain || b.preferredPowertrain,
      driverName: b.driverName || "-",
      odoStart: b.trip?.odoStart ?? 0,
      odoEnd: b.trip?.odoEnd ?? 0,
      distanceKm: b.trip?.distanceKm ?? b.estDistanceKm,
      levelStart: b.trip?.levelStart ?? 100,
      levelEnd: b.trip?.levelEnd ?? 80,
      status: b.status,
      channel: b.channel,
      lateReturn: b.trip?.lateReturn ?? false,
      incidentNote: b.trip?.incidentNote || "",
    }));

  // 4. Approval Time Report (FR-054)
  const approvalTimesHours: number[] = [];
  for (const b of filteredBookings) {
    if (b.decidedAt && b.createdAt) {
      const diffHrs =
        (new Date(b.decidedAt).getTime() - new Date(b.createdAt).getTime()) /
        3600_000;
      if (diffHrs >= 0) {
        approvalTimesHours.push(Number(diffHrs.toFixed(2)));
      }
    }
  }
  approvalTimesHours.sort((a, b) => a - b);
  const medianApprovalHours =
    approvalTimesHours.length > 0
      ? approvalTimesHours[Math.floor(approvalTimesHours.length / 2)]
      : 0.8;
  const maxApprovalHours =
    approvalTimesHours.length > 0
      ? approvalTimesHours[approvalTimesHours.length - 1]
      : 1.5;

  // 5. EV vs Petrol Comparison (FR-055)
  const evStats = {
    powertrain: "EV",
    trips: 0,
    hours: 0,
    distanceKm: 0,
    vehiclesCount: db.vehicles.filter((v) => v.powertrain === "EV").length,
  };
  const petrolStats = {
    powertrain: "PETROL",
    trips: 0,
    hours: 0,
    distanceKm: 0,
    vehiclesCount: db.vehicles.filter((v) => v.powertrain === "PETROL").length,
  };

  for (const b of filteredBookings) {
    if (b.status === "COMPLETED" || b.status === "IN_PROGRESS") {
      const pt = b.vehiclePowertrain || b.preferredPowertrain;
      const dur = Math.max(
        0.5,
        (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3600_000
      );
      const dist = b.trip?.distanceKm ?? b.estDistanceKm ?? 0;
      if (pt === "EV") {
        evStats.trips += 1;
        evStats.hours = Number((evStats.hours + dur).toFixed(1));
        evStats.distanceKm += dist;
      } else {
        petrolStats.trips += 1;
        petrolStats.hours = Number((petrolStats.hours + dur).toFixed(1));
        petrolStats.distanceKm += dist;
      }
    }
  }

  // 6. Summary KPIs (Section 14)
  const confirmedOrDone = filteredBookings.filter((b) =>
    ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(b.status)
  );
  const noShowCount = filteredBookings.filter(
    (b) => b.status === "NO_SHOW"
  ).length;
  const cancelledCount = filteredBookings.filter(
    (b) => b.status === "CANCELLED"
  ).length;
  const lateCancelCount = filteredBookings.filter(
    (b) => b.lateCancelFlag
  ).length;
  const mismatchCount = tripComparisonReport.filter(
    (t) => !t.requesterMatched
  ).length;
  const whatsappBookingsCount = filteredBookings.filter(
    (b) => b.channel === "WHATSAPP"
  ).length;

  return NextResponse.json({
    kpis: {
      totalBookings: filteredBookings.length,
      completedTrips: tripComparisonReport.filter(
        (t) => t.status === "COMPLETED"
      ).length,
      activeTrips: tripComparisonReport.filter(
        (t) => t.status === "IN_PROGRESS"
      ).length,
      pendingApprovals: db.bookings.filter(
        (b) => b.status === "PENDING_APPROVAL"
      ).length,
      pendingUserApprovals: db.users.filter(
        (u) => u.status === "PENDING_APPROVAL"
      ).length,
      totalDistanceKm: evStats.distanceKm + petrolStats.distanceKm,
      medianApprovalHours,
      maxApprovalHours,
      noShowRatePct:
        confirmedOrDone.length > 0
          ? Number(((noShowCount / confirmedOrDone.length) * 100).toFixed(1))
          : 0,
      cancellationRatePct:
        filteredBookings.length > 0
          ? Number(
              ((cancelledCount / filteredBookings.length) * 100).toFixed(1)
            )
          : 0,
      lateCancelCount,
      mismatchCount,
      whatsappSharePct:
        filteredBookings.length > 0
          ? Number(
              (
                (whatsappBookingsCount / filteredBookings.length) *
                100
              ).toFixed(1)
            )
          : 0,
    },
    vehicleReport,
    departmentReport: Array.from(departmentMap.values()),
    tripComparisonReport,
    powertrainComparison: [evStats, petrolStats],
    auditLogs: db.auditLogs,
    settings: db.settings,
  });
}

// Update Business Rules / System Settings (S-A3)
export async function PATCH(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  try {
    const body = await request.json();
    const db = getDb();
    const before = { ...db.settings };

    if (typeof body.turnaroundBufferMinutes === "number") {
      db.settings.turnaroundBufferMinutes = Math.max(
        0,
        body.turnaroundBufferMinutes
      );
    }
    if (typeof body.approvalSlaHours === "number") {
      db.settings.approvalSlaHours = Math.max(1, body.approvalSlaHours);
    }
    if (typeof body.cancellationCutoffHours === "number") {
      db.settings.cancellationCutoffHours = Math.max(
        0,
        body.cancellationCutoffHours
      );
    }
    if (typeof body.noShowGraceMinutes === "number") {
      db.settings.noShowGraceMinutes = Math.max(5, body.noShowGraceMinutes);
    }
    if (typeof body.evRangeBufferMultiplier === "number") {
      db.settings.evRangeBufferMultiplier = Math.max(
        1,
        body.evRangeBufferMultiplier
      );
    }
    if (typeof body.minChargeFuelPercent === "number") {
      db.settings.minChargeFuelPercent = Math.min(
        80,
        Math.max(10, body.minChargeFuelPercent)
      );
    }
    if (typeof body.gpsUpdateIntervalSeconds === "number") {
      db.settings.gpsUpdateIntervalSeconds = Math.max(
        10,
        body.gpsUpdateIntervalSeconds
      );
    }
    if (typeof body.minBookingNoticeHours === "number") {
      db.settings.minBookingNoticeHours = Math.max(
        0,
        body.minBookingNoticeHours
      );
    }
    if (body.whatsappContactNumber) {
      db.settings.whatsappContactNumber = sanitizeText(
        String(body.whatsappContactNumber)
      );
    }

    saveDb(db);

    appendAuditLog({
      actorId: adminAuth.user.id,
      actorName: adminAuth.user.name,
      actorRole: adminAuth.user.role,
      action: "UPDATE_SYSTEM_SETTINGS",
      entity: "Setting",
      entityId: "GLOBAL_RULES",
      summary: `Workplace Solution Admin memperbarui konfigurasi Business Rules sistem CARE`,
      before,
      after: db.settings,
    });

    return NextResponse.json({
      settings: db.settings,
      message: "Konfigurasi Business Rules Workplace Solution berhasil disimpan.",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan sistem." },
      { status: 500 }
    );
  }
}
