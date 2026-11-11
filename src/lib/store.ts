// ============================================================================
// CARE System - Dual-Engine Data Store & Business Rules (PRD Sections 6 & 7)
// Primary Engine: PostgreSQL via Prisma ORM (Vercel Postgres / Neon / Supabase)
// Local Dev Fallback: .data-store.json when DATABASE_URL is not configured
// ============================================================================

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  AuditLogItem,
  Booking,
  BookingStatus,
  CarType,
  Driver,
  MaintenanceBlock,
  NotificationItem,
  SystemSettings,
  User,
  Vehicle,
  WhatsAppSession,
} from "./types";

export const COMPANY_TIMEZONE = "Asia/Jakarta";

export interface DatabaseState {
  users: User[];
  carTypes: CarType[];
  vehicles: Vehicle[];
  drivers: Driver[];
  bookings: Booking[];
  maintenanceBlocks: MaintenanceBlock[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  settings: SystemSettings;
  whatsappSessions: Record<string, WhatsAppSession>;
}

const DATA_FILE_PATH = path.join(process.cwd(), ".data-store.json");

export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(
    url &&
      !url.includes("user:password@localhost") &&
      !url.includes("@host:5432") &&
      !url.includes("host:5432")
  );
}

export function formatJakarta(
  d: Date | string,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  return new Date(d).toLocaleString("id-ID", {
    ...opts,
    timeZone: COMPANY_TIMEZONE,
  });
}

/** Collision-safe booking number using WIB date + cryptographic random suffix. */
export function generateBookingNo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TIMEZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(
    ""
  );
  return `BK-${get("year")}${get("month")}${get("day")}-${suffix}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __careSystemDb: DatabaseState | undefined;
  // eslint-disable-next-line no-var
  var __careSeedGeneratedPassword: string | undefined;
}

function getSeedPasswordHashes() {
  let fallbackPass = global.__careSeedGeneratedPassword;
  if (!fallbackPass) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    fallbackPass =
      "Care" +
      Array.from(bytes, (b) => (b % 36).toString(36)).join("") +
      "9A!";
    global.__careSeedGeneratedPassword = fallbackPass;
    if (process.env.NODE_ENV !== "production" && !process.env.INITIAL_ADMIN_PASSWORD) {
      // Log generated local dev seed password only to server terminal
      console.info(
        `[CARE System Local Seed] No INITIAL_ADMIN_PASSWORD set in .env.local. Generated session seed password for WS-001 / EMP-101 / DRV-201: ${fallbackPass}`
      );
    }
  }

  const adminPass = process.env.INITIAL_ADMIN_PASSWORD || fallbackPass;
  const superPass = process.env.INITIAL_SUPERADMIN_PASSWORD || adminPass;
  const empPass = process.env.INITIAL_EMPLOYEE_PASSWORD || adminPass;
  const drvPass = process.env.INITIAL_DRIVER_PASSWORD || adminPass;

  return {
    HASH_ADMIN: bcrypt.hashSync(adminPass, 10),
    HASH_SUPER: bcrypt.hashSync(superPass, 10),
    HASH_EMP: bcrypt.hashSync(empPass, 10),
    HASH_DRV: bcrypt.hashSync(drvPass, 10),
  };
}

export function createInitialSeed(): DatabaseState {
  const now = new Date();
  const iso = (offsetHours: number) =>
    new Date(now.getTime() + offsetHours * 3600_000).toISOString();

  const { HASH_ADMIN, HASH_SUPER, HASH_EMP, HASH_DRV } =
    getSeedPasswordHashes();

  const users: User[] = [
    {
      id: "usr-ws-001",
      employeeNo: "WS-001",
      email: "admin@company.co.id",
      passwordHash: HASH_ADMIN,
      name: "Rina Kartika (Workplace Solution Lead)",
      department: "Workplace Solution",
      phone: "08119001001",
      role: "WORKPLACE_ADMIN",
      status: "ACTIVE",
      approvedBy: "SYSTEM",
      approvedAt: iso(-720),
      gpsConsent: true,
      createdAt: iso(-720),
      updatedAt: iso(-24),
    },
    {
      id: "usr-it-001",
      employeeNo: "IT-001",
      email: "superadmin@company.co.id",
      passwordHash: HASH_SUPER,
      name: "Dimas Aditya (IT System Owner)",
      department: "IT & Digital Security",
      phone: "08119001002",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      approvedBy: "SYSTEM",
      approvedAt: iso(-720),
      gpsConsent: true,
      createdAt: iso(-720),
      updatedAt: iso(-24),
    },
  ];

  const carTypes: CarType[] = [
    {
      id: "ct-ev-suv",
      name: "CareCar Electric (Hyundai Ioniq 5)",
      code: "EV_SUV",
      powertrain: "EV",
      seats: 4,
      defaultRangeKm: 380,
      description:
        "SUV Listrik ramah lingkungan untuk rapat eksekutif & dalam kota (Zero Emission)",
      badgeText: "Eco EV • 4 Kursi",
      iconType: "EV",
      active: true,
      createdAt: iso(-700),
    },
    {
      id: "ct-mpv-petrol",
      name: "CareCar XL MPV (Hyundai Stargazer)",
      code: "MPV_PETROL",
      powertrain: "PETROL",
      seats: 6,
      defaultRangeKm: 520,
      description:
        "MPV kabin luas 6 penumpang untuk kunjungan tim, klien & perjalanan luar kota",
      badgeText: "Tim & Luar Kota • 6 Kursi",
      iconType: "MPV",
      active: true,
      createdAt: iso(-700),
    },
    {
      id: "ct-vip-sedan",
      name: "CareCar Executive VIP",
      code: "VIP_SEDAN",
      powertrain: "HYBRID",
      seats: 3,
      defaultRangeKm: 580,
      description: "Kenyamanan ekstra untuk direksi & tamu VIP perusahaan",
      badgeText: "VIP Priority • 3 Kursi",
      iconType: "SEDAN",
      active: true,
      createdAt: iso(-300),
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: "veh-ioniq-01",
      plateNo: "B 1015 WSE",
      model: "Hyundai Ioniq 5 Signature Long Range",
      carTypeId: "ct-ev-suv",
      powertrain: "EV",
      seats: 4,
      usableRangeKm: 380,
      odometerKm: 0,
      currentLevel: 100,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-4),
    },
    {
      id: "veh-star-01",
      plateNo: "B 2011 WSP",
      model: "Hyundai Stargazer Prime IVT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 520,
      odometerKm: 0,
      currentLevel: 100,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-6),
    },
  ];

  const drivers: Driver[] = [];
  const bookings: Booking[] = [];
  const maintenanceBlocks: MaintenanceBlock[] = [];
  const notifications: NotificationItem[] = [];
  const auditLogs: AuditLogItem[] = [];

  const settings: SystemSettings = {
    turnaroundBufferMinutes: 30,
    approvalSlaHours: 4,
    cancellationCutoffHours: 2,
    noShowGraceMinutes: 30,
    evRangeBufferMultiplier: 1.2,
    minChargeFuelPercent: 30,
    gpsRetentionDays: 90,
    gpsUpdateIntervalSeconds: 30,
    gpsLostThresholdMinutes: 10,
    minBookingNoticeHours: 2,
    whatsappContactNumber: "+62 811-900-1001 (Workplace Solution Helpdesk)",
    departmentDisplayName: "Workplace Solution",
  };

  return {
    users,
    carTypes,
    vehicles,
    drivers,
    bookings,
    maintenanceBlocks,
    notifications,
    auditLogs,
    settings,
    whatsappSessions: {},
  };
}

// ---------------------------------------------------------------------------
// PostgreSQL <-> DatabaseState synchronization
// ---------------------------------------------------------------------------

export async function persistStateToPostgres(
  state: DatabaseState
): Promise<void> {
  if (!isPostgresConfigured()) return;

  try {
    await prisma.$transaction(async (tx) => {
      for (const u of state.users) {
        await tx.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            employeeNo: u.employeeNo,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            department: u.department,
            phone: u.phone,
            role: u.role,
            status: u.status,
            approvedBy: u.approvedBy ?? null,
            approvedAt: u.approvedAt ? new Date(u.approvedAt) : null,
            rejectedReason: u.rejectedReason ?? null,
            gpsConsent: u.gpsConsent,
            createdAt: new Date(u.createdAt),
          },
          update: {
            employeeNo: u.employeeNo,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            department: u.department,
            phone: u.phone,
            role: u.role,
            status: u.status,
            approvedBy: u.approvedBy ?? null,
            approvedAt: u.approvedAt ? new Date(u.approvedAt) : null,
            rejectedReason: u.rejectedReason ?? null,
            gpsConsent: u.gpsConsent,
          },
        });
      }

      for (const ct of state.carTypes) {
        await tx.carType.upsert({
          where: { id: ct.id },
          create: {
            id: ct.id,
            name: ct.name,
            code: ct.code,
            powertrain: ct.powertrain,
            seats: ct.seats,
            defaultRangeKm: ct.defaultRangeKm,
            description: ct.description,
            badgeText: ct.badgeText,
            iconType: ct.iconType,
            active: ct.active,
            createdAt: new Date(ct.createdAt),
          },
          update: {
            name: ct.name,
            code: ct.code,
            powertrain: ct.powertrain,
            seats: ct.seats,
            defaultRangeKm: ct.defaultRangeKm,
            description: ct.description,
            badgeText: ct.badgeText,
            iconType: ct.iconType,
            active: ct.active,
          },
        });
      }

      for (const v of state.vehicles) {
        await tx.vehicle.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            plateNo: v.plateNo,
            model: v.model,
            carTypeId: v.carTypeId,
            powertrain: v.powertrain,
            seats: v.seats,
            usableRangeKm: v.usableRangeKm,
            odometerKm: v.odometerKm,
            currentLevel: v.currentLevel,
            needsRefuel: v.needsRefuel,
            status: v.status,
            createdAt: new Date(v.createdAt),
          },
          update: {
            plateNo: v.plateNo,
            model: v.model,
            carTypeId: v.carTypeId,
            powertrain: v.powertrain,
            seats: v.seats,
            usableRangeKm: v.usableRangeKm,
            odometerKm: v.odometerKm,
            currentLevel: v.currentLevel,
            needsRefuel: v.needsRefuel,
            status: v.status,
          },
        });
      }

      for (const d of state.drivers) {
        await tx.driver.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            userId: d.userId,
            licenseNo: d.licenseNo,
            deviceId: d.deviceId,
            status: d.status,
          },
          update: {
            licenseNo: d.licenseNo,
            deviceId: d.deviceId,
            status: d.status,
          },
        });
      }

      for (const b of state.bookings) {
        await tx.booking.upsert({
          where: { id: b.id },
          create: {
            id: b.id,
            bookingNo: b.bookingNo,
            requesterId: b.requesterId,
            requesterName: b.requesterName,
            requesterDepartment: b.requesterDepartment,
            requesterPhone: b.requesterPhone,
            startAt: new Date(b.startAt),
            endAt: new Date(b.endAt),
            pickupLocation: b.pickupLocation,
            destination: b.destination,
            purpose: b.purpose,
            passengers: b.passengers,
            estDistanceKm: b.estDistanceKm,
            preferredCarTypeId: b.preferredCarTypeId ?? null,
            preferredCarTypeName: b.preferredCarTypeName ?? null,
            preferredPowertrain: b.preferredPowertrain,
            channel: b.channel,
            status: b.status,
            vehicleId: b.vehicleId ?? null,
            vehiclePlate: b.vehiclePlate ?? null,
            vehicleModel: b.vehicleModel ?? null,
            vehiclePowertrain: b.vehiclePowertrain ?? null,
            driverId: b.driverId ?? null,
            driverName: b.driverName ?? null,
            driverPhone: b.driverPhone ?? null,
            decidedById: b.decidedById ?? null,
            decidedByName: b.decidedByName ?? null,
            decidedAt: b.decidedAt ? new Date(b.decidedAt) : null,
            decisionNote: b.decisionNote ?? null,
            lateCancelFlag: b.lateCancelFlag,
            overrideFlag: b.overrideFlag,
            evRangeWarning: b.evRangeWarning,
            createdAt: new Date(b.createdAt),
          },
          update: {
            startAt: new Date(b.startAt),
            endAt: new Date(b.endAt),
            pickupLocation: b.pickupLocation,
            destination: b.destination,
            purpose: b.purpose,
            passengers: b.passengers,
            estDistanceKm: b.estDistanceKm,
            preferredCarTypeId: b.preferredCarTypeId ?? null,
            preferredCarTypeName: b.preferredCarTypeName ?? null,
            preferredPowertrain: b.preferredPowertrain,
            status: b.status,
            vehicleId: b.vehicleId ?? null,
            vehiclePlate: b.vehiclePlate ?? null,
            vehicleModel: b.vehicleModel ?? null,
            vehiclePowertrain: b.vehiclePowertrain ?? null,
            driverId: b.driverId ?? null,
            driverName: b.driverName ?? null,
            driverPhone: b.driverPhone ?? null,
            decidedById: b.decidedById ?? null,
            decidedByName: b.decidedByName ?? null,
            decidedAt: b.decidedAt ? new Date(b.decidedAt) : null,
            decisionNote: b.decisionNote ?? null,
            lateCancelFlag: b.lateCancelFlag,
            overrideFlag: b.overrideFlag,
            evRangeWarning: b.evRangeWarning,
          },
        });

        for (const h of b.history) {
          await tx.bookingStatusHistory.upsert({
            where: { id: h.id },
            create: {
              id: h.id,
              bookingId: b.id,
              fromStatus: h.fromStatus,
              toStatus: h.toStatus,
              actorId: h.actorId,
              actorName: h.actorName,
              reason: h.reason ?? null,
              at: new Date(h.at),
            },
            update: {},
          });
        }

        if (b.trip) {
          const t = b.trip;
          await tx.trip.upsert({
            where: { id: t.id },
            create: {
              id: t.id,
              bookingId: b.id,
              checkoutAt: t.checkoutAt ? new Date(t.checkoutAt) : null,
              checkinAt: t.checkinAt ? new Date(t.checkinAt) : null,
              odoStart: t.odoStart ?? null,
              odoEnd: t.odoEnd ?? null,
              distanceKm: t.distanceKm ?? null,
              levelStart: t.levelStart ?? null,
              levelEnd: t.levelEnd ?? null,
              actualUsers: t.actualUsers,
              actualUserIds: t.actualUserIds,
              requesterMatched: t.requesterMatched,
              incidentNote: t.incidentNote ?? null,
              lateReturn: t.lateReturn,
              lowFuelFlag: t.lowFuelFlag,
              gpsLostFlag: t.gpsLostFlag,
            },
            update: {
              checkoutAt: t.checkoutAt ? new Date(t.checkoutAt) : null,
              checkinAt: t.checkinAt ? new Date(t.checkinAt) : null,
              odoStart: t.odoStart ?? null,
              odoEnd: t.odoEnd ?? null,
              distanceKm: t.distanceKm ?? null,
              levelStart: t.levelStart ?? null,
              levelEnd: t.levelEnd ?? null,
              actualUsers: t.actualUsers,
              actualUserIds: t.actualUserIds,
              requesterMatched: t.requesterMatched,
              incidentNote: t.incidentNote ?? null,
              lateReturn: t.lateReturn,
              lowFuelFlag: t.lowFuelFlag,
              gpsLostFlag: t.gpsLostFlag,
            },
          });

          for (const pt of t.gpsPoints) {
            await tx.gpsPoint.upsert({
              where: { id: pt.id },
              create: {
                id: pt.id,
                tripId: t.id,
                lat: pt.lat,
                lng: pt.lng,
                label: pt.label,
                speedKmh: pt.speedKmh ?? null,
                recordedAt: new Date(pt.recordedAt),
              },
              update: {},
            });
          }
        }
      }

      for (const mb of state.maintenanceBlocks) {
        await tx.maintenanceBlock.upsert({
          where: { id: mb.id },
          create: {
            id: mb.id,
            vehicleId: mb.vehicleId,
            startAt: new Date(mb.startAt),
            endAt: new Date(mb.endAt),
            reason: mb.reason,
            createdBy: mb.createdBy,
            createdAt: new Date(mb.createdAt),
          },
          update: {
            startAt: new Date(mb.startAt),
            endAt: new Date(mb.endAt),
            reason: mb.reason,
          },
        });
      }

      await tx.setting.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          value: state.settings as unknown as Prisma.InputJsonValue,
        },
        update: {
          value: state.settings as unknown as Prisma.InputJsonValue,
        },
      });

      for (const [phone, sess] of Object.entries(state.whatsappSessions)) {
        await tx.whatsAppSession.upsert({
          where: { phone },
          create: {
            phone,
            data: sess as unknown as Prisma.InputJsonValue,
            lastActivityAt: new Date(sess.lastActivityAt),
          },
          update: {
            data: sess as unknown as Prisma.InputJsonValue,
            lastActivityAt: new Date(sess.lastActivityAt),
          },
        });
      }
    });
  } catch (err) {
    console.error("[CARE System] PostgreSQL sync error:", err);
  }
}

export async function loadDbAsync(): Promise<DatabaseState> {
  if (isPostgresConfigured()) {
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        const seed = createInitialSeed();
        await persistStateToPostgres(seed);
        for (const n of seed.notifications) {
          await prisma.notification.create({
            data: {
              id: n.id,
              userId: n.userId,
              event: n.event,
              title: n.title,
              message: n.message,
              bookingId: n.bookingId ?? null,
              channel: n.channel,
              status: n.status,
              read: n.read,
              sentAt: new Date(n.sentAt),
            },
          });
        }
        for (const a of seed.auditLogs) {
          await prisma.auditLog.create({
            data: {
              id: a.id,
              actorId: a.actorId,
              actorName: a.actorName,
              actorRole: a.actorRole,
              action: a.action,
              entity: a.entity,
              entityId: a.entityId,
              summary: a.summary,
              before: a.before ?? null,
              after: a.after ?? null,
              at: new Date(a.at),
            },
          });
        }
        global.__careSystemDb = seed;
        return seed;
      }

      const [
        users,
        carTypes,
        vehicles,
        drivers,
        bookings,
        maint,
        notifs,
        audits,
        settingRow,
        waRows,
      ] = await Promise.all([
        prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.carType.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.vehicle.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.driver.findMany({ include: { user: true } }),
        prisma.booking.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            history: { orderBy: { at: "asc" } },
            trip: { include: { gpsPoints: { orderBy: { recordedAt: "asc" } } } },
          },
        }),
        prisma.maintenanceBlock.findMany({
          orderBy: { createdAt: "desc" },
          include: { vehicle: true },
        }),
        prisma.notification.findMany({ orderBy: { sentAt: "desc" } }),
        prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 300 }),
        prisma.setting.findUnique({ where: { id: "global" } }),
        prisma.whatsAppSession.findMany(),
      ]);

      const seedDefaults = createInitialSeed().settings;
      const whatsappSessions: Record<string, WhatsAppSession> = {};
      for (const w of waRows) {
        whatsappSessions[w.phone] = w.data as unknown as WhatsAppSession;
      }

      const state: DatabaseState = {
        users: users.map((u) => ({
          id: u.id,
          employeeNo: u.employeeNo,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          department: u.department,
          phone: u.phone,
          role: u.role as User["role"],
          status: u.status as User["status"],
          approvedBy: u.approvedBy,
          approvedAt: u.approvedAt?.toISOString() ?? null,
          rejectedReason: u.rejectedReason,
          gpsConsent: u.gpsConsent,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        })),
        carTypes: carTypes.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          powertrain: c.powertrain as CarType["powertrain"],
          seats: c.seats,
          defaultRangeKm: c.defaultRangeKm,
          description: c.description,
          badgeText: c.badgeText,
          iconType: c.iconType as CarType["iconType"],
          active: c.active,
          createdAt: c.createdAt.toISOString(),
        })),
        vehicles: vehicles.map((v) => ({
          id: v.id,
          plateNo: v.plateNo,
          model: v.model,
          carTypeId: v.carTypeId,
          powertrain: v.powertrain as Vehicle["powertrain"],
          seats: v.seats,
          usableRangeKm: v.usableRangeKm,
          odometerKm: v.odometerKm,
          currentLevel: v.currentLevel,
          needsRefuel: v.needsRefuel,
          status: v.status as Vehicle["status"],
          createdAt: v.createdAt.toISOString(),
          updatedAt: v.updatedAt.toISOString(),
        })),
        drivers: drivers.map((d) => ({
          id: d.id,
          userId: d.userId,
          name: d.user.name,
          phone: d.user.phone,
          employeeNo: d.user.employeeNo,
          licenseNo: d.licenseNo,
          deviceId: d.deviceId,
          status: d.status as Driver["status"],
        })),
        bookings: bookings.map((b) => ({
          id: b.id,
          bookingNo: b.bookingNo,
          requesterId: b.requesterId,
          requesterName: b.requesterName,
          requesterDepartment: b.requesterDepartment,
          requesterPhone: b.requesterPhone,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
          pickupLocation: b.pickupLocation,
          destination: b.destination,
          purpose: b.purpose,
          passengers: b.passengers,
          estDistanceKm: b.estDistanceKm,
          preferredCarTypeId: b.preferredCarTypeId,
          preferredCarTypeName: b.preferredCarTypeName,
          preferredPowertrain:
            b.preferredPowertrain as Booking["preferredPowertrain"],
          channel: b.channel as Booking["channel"],
          status: b.status as BookingStatus,
          vehicleId: b.vehicleId,
          vehiclePlate: b.vehiclePlate,
          vehicleModel: b.vehicleModel,
          vehiclePowertrain:
            b.vehiclePowertrain as Booking["vehiclePowertrain"],
          driverId: b.driverId,
          driverName: b.driverName,
          driverPhone: b.driverPhone,
          decidedById: b.decidedById,
          decidedByName: b.decidedByName,
          decidedAt: b.decidedAt?.toISOString() ?? null,
          decisionNote: b.decisionNote,
          lateCancelFlag: b.lateCancelFlag,
          overrideFlag: b.overrideFlag,
          evRangeWarning: b.evRangeWarning,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
          history: b.history.map((h) => ({
            id: h.id,
            bookingId: h.bookingId,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            actorId: h.actorId,
            actorName: h.actorName,
            reason: h.reason ?? undefined,
            at: h.at.toISOString(),
          })),
          trip: b.trip
            ? {
                id: b.trip.id,
                bookingId: b.trip.bookingId,
                checkoutAt: b.trip.checkoutAt?.toISOString() ?? null,
                checkinAt: b.trip.checkinAt?.toISOString() ?? null,
                odoStart: b.trip.odoStart,
                odoEnd: b.trip.odoEnd,
                distanceKm: b.trip.distanceKm,
                levelStart: b.trip.levelStart,
                levelEnd: b.trip.levelEnd,
                actualUsers: b.trip.actualUsers,
                actualUserIds: b.trip.actualUserIds,
                requesterMatched: b.trip.requesterMatched,
                incidentNote: b.trip.incidentNote,
                lateReturn: b.trip.lateReturn,
                lowFuelFlag: b.trip.lowFuelFlag,
                gpsLostFlag: b.trip.gpsLostFlag,
                gpsPoints: b.trip.gpsPoints.map((p) => ({
                  id: p.id,
                  tripId: p.tripId,
                  lat: p.lat,
                  lng: p.lng,
                  label: p.label,
                  speedKmh: p.speedKmh ?? undefined,
                  recordedAt: p.recordedAt.toISOString(),
                })),
              }
            : null,
        })),
        maintenanceBlocks: maint.map((m) => ({
          id: m.id,
          vehicleId: m.vehicleId,
          vehiclePlate: m.vehicle.plateNo,
          vehicleModel: m.vehicle.model,
          startAt: m.startAt.toISOString(),
          endAt: m.endAt.toISOString(),
          reason: m.reason,
          createdBy: m.createdBy,
          createdAt: m.createdAt.toISOString(),
        })),
        notifications: notifs.map((n) => ({
          id: n.id,
          userId: n.userId,
          event: n.event,
          title: n.title,
          message: n.message,
          bookingId: n.bookingId ?? undefined,
          channel: n.channel as NotificationItem["channel"],
          status: n.status as NotificationItem["status"],
          read: n.read,
          sentAt: n.sentAt.toISOString(),
        })),
        auditLogs: audits.map((a) => ({
          ...a,
          at: a.at.toISOString(),
        })),
        settings: settingRow
          ? { ...seedDefaults, ...(settingRow.value as Partial<SystemSettings>) }
          : seedDefaults,
        whatsappSessions,
      };

      global.__careSystemDb = state;
      return state;
    } catch (err) {
      console.error("[CARE System] PostgreSQL read fallback:", err);
    }
  }

  return getDb();
}

export function getDb(): DatabaseState {
  if (global.__careSystemDb) {
    return global.__careSystemDb;
  }

  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as DatabaseState;
      if (
        parsed &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.vehicles)
      ) {
        global.__careSystemDb = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to seed
  }

  const seed = createInitialSeed();
  global.__careSystemDb = seed;
  saveDb(seed);
  return seed;
}

export function saveDb(state?: DatabaseState): void {
  const db = state || global.__careSystemDb;
  if (!db) return;
  global.__careSystemDb = db;
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // Read-only filesystem
  }
  if (isPostgresConfigured()) {
    void persistStateToPostgres(db);
  }
}

export async function saveDbAsync(state?: DatabaseState): Promise<void> {
  const db = state || global.__careSystemDb;
  if (!db) return;
  global.__careSystemDb = db;
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // Read-only filesystem
  }
  if (isPostgresConfigured()) {
    await persistStateToPostgres(db);
  }
}

export function appendAuditLog(params: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}): void {
  const db = getDb();
  const entry: AuditLogItem = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    summary: params.summary,
    before: params.before ? JSON.stringify(params.before) : null,
    after: params.after ? JSON.stringify(params.after) : null,
    at: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // ignore
  }
  if (isPostgresConfigured()) {
    void prisma.auditLog
      .create({
        data: {
          id: entry.id,
          actorId: entry.actorId,
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          summary: entry.summary,
          before: entry.before,
          after: entry.after,
          at: new Date(entry.at),
        },
      })
      .catch(() => {});
  }
}

export function pushNotification(params: {
  userId: string;
  event: string;
  title: string;
  message: string;
  bookingId?: string;
  channel?: "APP" | "WHATSAPP";
}): void {
  const db = getDb();
  const item: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId,
    event: params.event,
    title: params.title,
    message: params.message,
    bookingId: params.bookingId,
    channel: params.channel || "APP",
    status: "SENT",
    read: false,
    sentAt: new Date().toISOString(),
  };
  db.notifications.unshift(item);
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // ignore
  }
  if (isPostgresConfigured()) {
    void prisma.notification
      .create({
        data: {
          id: item.id,
          userId: item.userId,
          event: item.event,
          title: item.title,
          message: item.message,
          bookingId: item.bookingId ?? null,
          channel: item.channel,
          status: item.status,
          read: item.read,
          sentAt: new Date(item.sentAt),
        },
      })
      .catch(() => {});
  }
}

export function notifyAllWorkplaceAdmins(params: {
  event: string;
  title: string;
  message: string;
  bookingId?: string;
}): void {
  const db = getDb();
  const admins = db.users.filter(
    (u) =>
      (u.role === "WORKPLACE_ADMIN" || u.role === "SUPER_ADMIN") &&
      u.status === "ACTIVE"
  );
  for (const admin of admins) {
    pushNotification({
      userId: admin.id,
      event: params.event,
      title: params.title,
      message: params.message,
      bookingId: params.bookingId,
    });
  }
}

export function hasTimeOverlapWithBuffer(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date,
  bufferMinutes: number = 30
): boolean {
  const bufferMs = bufferMinutes * 60_000;
  const a0 = new Date(startA).getTime() - bufferMs;
  const a1 = new Date(endA).getTime() + bufferMs;
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  return a0 < b1 && b0 < a1;
}

export function findAvailableVehicles(params: {
  startAt: string;
  endAt: string;
  passengers: number;
  preferredCarTypeId?: string | null;
  preferredPowertrain?: "EV" | "PETROL" | "ANY";
  excludeBookingId?: string;
}): Vehicle[] {
  const db = getDb();
  const buffer = db.settings.turnaroundBufferMinutes;

  return db.vehicles.filter((v) => {
    if (v.status === "MAINTENANCE" || v.status === "OUT_OF_SERVICE") {
      return false;
    }
    if (v.seats < params.passengers) {
      return false;
    }
    if (params.preferredCarTypeId && v.carTypeId !== params.preferredCarTypeId) {
      return false;
    }
    if (
      params.preferredPowertrain &&
      params.preferredPowertrain !== "ANY" &&
      v.powertrain !== params.preferredPowertrain
    ) {
      return false;
    }

    const hasMaintConflict = db.maintenanceBlocks.some(
      (mb) =>
        mb.vehicleId === v.id &&
        hasTimeOverlapWithBuffer(
          params.startAt,
          params.endAt,
          mb.startAt,
          mb.endAt,
          0
        )
    );
    if (hasMaintConflict) return false;

    const hasBookingConflict = db.bookings.some(
      (bk) =>
        bk.id !== params.excludeBookingId &&
        bk.vehicleId === v.id &&
        (bk.status === "CONFIRMED" || bk.status === "IN_PROGRESS") &&
        hasTimeOverlapWithBuffer(
          params.startAt,
          params.endAt,
          bk.startAt,
          bk.endAt,
          buffer
        )
    );
    if (hasBookingConflict) return false;

    return true;
  });
}

export function findAvailableDrivers(params: {
  startAt: string;
  endAt: string;
  excludeBookingId?: string;
}): Driver[] {
  const db = getDb();
  const buffer = db.settings.turnaroundBufferMinutes;

  return db.drivers.filter((drv) => {
    if (drv.status === "OFF_DUTY") return false;
    const linkedUser = db.users.find((u) => u.id === drv.userId);
    if (linkedUser && linkedUser.status !== "ACTIVE") return false;

    const hasConflict = db.bookings.some(
      (bk) =>
        bk.id !== params.excludeBookingId &&
        bk.driverId === drv.id &&
        (bk.status === "CONFIRMED" || bk.status === "IN_PROGRESS") &&
        hasTimeOverlapWithBuffer(
          params.startAt,
          params.endAt,
          bk.startAt,
          bk.endAt,
          buffer
        )
    );
    return !hasConflict;
  });
}

export function suggestAlternativeSlots(params: {
  startAt: string;
  endAt: string;
  passengers: number;
  preferredCarTypeId?: string | null;
  preferredPowertrain?: "EV" | "PETROL" | "ANY";
}): { startAt: string; endAt: string; label: string }[] {
  const suggestions: { startAt: string; endAt: string; label: string }[] = [];
  const startMs = new Date(params.startAt).getTime();
  const durationMs = Math.max(
    3600_000,
    new Date(params.endAt).getTime() - startMs
  );

  const offsetsHours = [1, 2, 3, 4, 6, 24, 26];
  for (const offset of offsetsHours) {
    if (suggestions.length >= 3) break;
    const candStart = new Date(startMs + offset * 3600_000).toISOString();
    const candEnd = new Date(
      startMs + offset * 3600_000 + durationMs
    ).toISOString();
    const free = findAvailableVehicles({
      startAt: candStart,
      endAt: candEnd,
      passengers: params.passengers,
      preferredCarTypeId: params.preferredCarTypeId,
      preferredPowertrain: params.preferredPowertrain,
    });
    if (free.length > 0) {
      suggestions.push({
        startAt: candStart,
        endAt: candEnd,
        label: `${formatJakarta(candStart)} – ${formatJakarta(
          candEnd
        )} WIB (${free.length} unit tersedia)`,
      });
    }
  }
  return suggestions;
}
