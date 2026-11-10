import { NextResponse } from "next/server";
import {
  getActiveServerUser,
  requireWorkplaceAdminUser,
} from "@/lib/server-guard";
import {
  appendAuditLog,
  hasTimeOverlapWithBuffer,
  loadDbAsync,
  saveDbAsync,
} from "@/lib/store";
import { CarType, MaintenanceBlock, Vehicle } from "@/lib/types";
import {
  carTypeSchema,
  maintenanceBlockSchema,
  sanitizeText,
  vehicleSchema,
} from "@/lib/validations";

export async function GET() {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  const db = await loadDbAsync();
  return NextResponse.json({
    carTypes: db.carTypes,
    vehicles: db.vehicles,
    maintenanceBlocks: db.maintenanceBlocks,
    drivers: db.drivers,
  });
}

export async function POST(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  try {
    const body = await request.json();
    const entityType = body.entityType as
      | "CAR_TYPE"
      | "VEHICLE"
      | "MAINTENANCE_BLOCK";
    const db = await loadDbAsync();

    if (entityType === "CAR_TYPE") {
      const parsed = carTypeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message || "Data tipe mobil tidak valid.",
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      if (
        db.carTypes.some(
          (ct) =>
            ct.code.toLowerCase() === d.code.toLowerCase() ||
            ct.name.toLowerCase() === d.name.toLowerCase()
        )
      ) {
        return NextResponse.json(
          { error: "Nama atau kode tipe mobil sudah ada." },
          { status: 409 }
        );
      }

      const newCarType: CarType = {
        id: `ct-${Date.now()}`,
        name: d.name,
        code: d.code,
        powertrain: d.powertrain,
        seats: d.seats,
        defaultRangeKm: d.defaultRangeKm,
        description: d.description,
        badgeText: d.badgeText,
        iconType: d.iconType,
        active: d.active,
        createdAt: new Date().toISOString(),
      };

      db.carTypes.push(newCarType);
      await saveDbAsync(db);

      appendAuditLog({
        actorId: adminAuth.user.id,
        actorName: adminAuth.user.name,
        actorRole: adminAuth.user.role,
        action: "CREATE_CAR_TYPE",
        entity: "CarType",
        entityId: newCarType.code,
        summary: `Workplace Solution Admin menambahkan tipe mobil baru: ${newCarType.name} (${newCarType.powertrain}, ${newCarType.seats} kursi)`,
        after: newCarType,
      });

      return NextResponse.json(
        { carType: newCarType, carTypes: db.carTypes },
        { status: 201 }
      );
    }

    if (entityType === "VEHICLE") {
      const parsed = vehicleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message || "Data kendaraan tidak valid.",
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      if (
        db.vehicles.some(
          (v) => v.plateNo.toLowerCase() === d.plateNo.toLowerCase()
        )
      ) {
        return NextResponse.json(
          { error: `Kendaraan dengan plat ${d.plateNo} sudah terdaftar.` },
          { status: 409 }
        );
      }

      const nowIso = new Date().toISOString();
      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        plateNo: d.plateNo,
        model: d.model,
        carTypeId: d.carTypeId,
        powertrain: d.powertrain,
        seats: d.seats,
        usableRangeKm: d.usableRangeKm,
        odometerKm: d.odometerKm,
        currentLevel: d.currentLevel,
        needsRefuel: d.currentLevel < db.settings.minChargeFuelPercent,
        status: d.status,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.vehicles.push(newVehicle);
      await saveDbAsync(db);

      appendAuditLog({
        actorId: adminAuth.user.id,
        actorName: adminAuth.user.name,
        actorRole: adminAuth.user.role,
        action: "CREATE_VEHICLE",
        entity: "Vehicle",
        entityId: newVehicle.plateNo,
        summary: `Workplace Solution Admin menambahkan unit kendaraan baru: ${newVehicle.plateNo} (${newVehicle.model} - ${newVehicle.powertrain})`,
        after: newVehicle,
      });

      return NextResponse.json(
        { vehicle: newVehicle, vehicles: db.vehicles },
        { status: 201 }
      );
    }

    if (entityType === "MAINTENANCE_BLOCK") {
      const parsed = maintenanceBlockSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ||
              "Data jadwal maintenance tidak valid.",
          },
          { status: 400 }
        );
      }

      const d = parsed.data;
      const veh = db.vehicles.find((v) => v.id === d.vehicleId);
      if (!veh) {
        return NextResponse.json(
          { error: "Kendaraan tidak ditemukan." },
          { status: 404 }
        );
      }

      const newBlock: MaintenanceBlock = {
        id: `mb-${Date.now()}`,
        vehicleId: veh.id,
        vehiclePlate: veh.plateNo,
        vehicleModel: veh.model,
        startAt: d.startAt,
        endAt: d.endAt,
        reason: d.reason,
        createdBy: adminAuth.user.name,
        createdAt: new Date().toISOString(),
      };

      db.maintenanceBlocks.unshift(newBlock);

      const affectedBookings = db.bookings.filter(
        (bk) =>
          bk.vehicleId === veh.id &&
          bk.status === "CONFIRMED" &&
          hasTimeOverlapWithBuffer(bk.startAt, bk.endAt, d.startAt, d.endAt, 0)
      );

      await saveDbAsync(db);

      appendAuditLog({
        actorId: adminAuth.user.id,
        actorName: adminAuth.user.name,
        actorRole: adminAuth.user.role,
        action: "CREATE_MAINTENANCE_BLOCK",
        entity: "MaintenanceBlock",
        entityId: veh.plateNo,
        summary: `Workplace Solution Admin membuat jadwal maintenance untuk ${veh.plateNo} (${d.reason}). Booking terdampak: ${affectedBookings.length}`,
        after: newBlock,
      });

      return NextResponse.json(
        {
          maintenanceBlock: newBlock,
          maintenanceBlocks: db.maintenanceBlocks,
          affectedBookings,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: "Tipe entitas tidak dikenali." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan data armada." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const adminAuth = await requireWorkplaceAdminUser();
  if (!adminAuth.user || adminAuth.errorResponse) {
    return adminAuth.errorResponse!;
  }

  try {
    const body = await request.json();
    const db = await loadDbAsync();

    if (body.entityType === "CAR_TYPE") {
      const ct = db.carTypes.find((c) => c.id === body.id);
      if (!ct) {
        return NextResponse.json(
          { error: "Tipe mobil tidak ditemukan." },
          { status: 404 }
        );
      }

      const before = { ...ct };
      if (body.name) ct.name = sanitizeText(String(body.name));
      if (body.description)
        ct.description = sanitizeText(String(body.description));
      if (body.badgeText) ct.badgeText = sanitizeText(String(body.badgeText));
      if (typeof body.seats === "number") ct.seats = body.seats;
      if (typeof body.defaultRangeKm === "number")
        ct.defaultRangeKm = body.defaultRangeKm;
      if (typeof body.active === "boolean") ct.active = body.active;
      if (body.powertrain) ct.powertrain = body.powertrain;

      await saveDbAsync(db);

      appendAuditLog({
        actorId: adminAuth.user.id,
        actorName: adminAuth.user.name,
        actorRole: adminAuth.user.role,
        action: "UPDATE_CAR_TYPE",
        entity: "CarType",
        entityId: ct.code,
        summary: `Workplace Solution Admin memperbarui tipe mobil ${ct.name}`,
        before,
        after: ct,
      });

      return NextResponse.json({ carType: ct, carTypes: db.carTypes });
    }

    if (body.entityType === "VEHICLE") {
      const veh = db.vehicles.find((v) => v.id === body.id);
      if (!veh) {
        return NextResponse.json(
          { error: "Kendaraan tidak ditemukan." },
          { status: 404 }
        );
      }

      const before = { ...veh };
      if (body.plateNo)
        veh.plateNo = sanitizeText(String(body.plateNo)).toUpperCase();
      if (body.model) veh.model = sanitizeText(String(body.model));
      if (body.carTypeId) veh.carTypeId = String(body.carTypeId);
      if (body.powertrain) veh.powertrain = body.powertrain;
      if (typeof body.seats === "number") veh.seats = body.seats;
      if (typeof body.usableRangeKm === "number")
        veh.usableRangeKm = body.usableRangeKm;
      if (typeof body.odometerKm === "number") {
        if (body.odometerKm < veh.odometerKm) {
          return NextResponse.json(
            {
              error: `Pembacaan odometer baru (${body.odometerKm} km) tidak boleh lebih rendah dari odometer sebelumnya (${veh.odometerKm} km) [FR-019].`,
            },
            { status: 400 }
          );
        }
        veh.odometerKm = body.odometerKm;
      }
      if (typeof body.currentLevel === "number") {
        veh.currentLevel = Math.min(100, Math.max(0, body.currentLevel));
        veh.needsRefuel =
          veh.currentLevel < db.settings.minChargeFuelPercent;
      }
      if (typeof body.needsRefuel === "boolean") {
        veh.needsRefuel = body.needsRefuel;
        if (!body.needsRefuel && veh.currentLevel < 30) {
          veh.currentLevel = 100;
        }
      }
      if (body.status) {
        veh.status = body.status;
      }
      veh.updatedAt = new Date().toISOString();

      const affectedBookings =
        veh.status === "OUT_OF_SERVICE" || veh.status === "MAINTENANCE"
          ? db.bookings.filter(
              (bk) =>
                bk.vehicleId === veh.id && bk.status === "CONFIRMED"
            )
          : [];

      await saveDbAsync(db);

      appendAuditLog({
        actorId: adminAuth.user.id,
        actorName: adminAuth.user.name,
        actorRole: adminAuth.user.role,
        action: "UPDATE_VEHICLE",
        entity: "Vehicle",
        entityId: veh.plateNo,
        summary: `Workplace Solution Admin memperbarui kendaraan ${veh.plateNo} (Status: ${veh.status}, Level: ${veh.currentLevel}%, Range: ${veh.usableRangeKm} km)`,
        before,
        after: veh,
      });

      return NextResponse.json({
        vehicle: veh,
        vehicles: db.vehicles,
        affectedBookings,
      });
    }

    return NextResponse.json(
      { error: "Tipe entitas tidak valid." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui data kendaraan." },
      { status: 500 }
    );
  }
}
