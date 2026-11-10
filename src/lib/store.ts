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
  return Boolean(url && !url.includes("user:password@localhost"));
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
    {
      id: "usr-emp-101",
      employeeNo: "EMP-101",
      email: "budi.santoso@company.co.id",
      passwordHash: HASH_EMP,
      name: "Budi Santoso",
      department: "Commercial & Sales",
      phone: "0812800101",
      role: "EMPLOYEE",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-400),
      gpsConsent: true,
      createdAt: iso(-400),
      updatedAt: iso(-48),
    },
    {
      id: "usr-emp-102",
      employeeNo: "EMP-102",
      email: "siti.rahmawati@company.co.id",
      passwordHash: HASH_EMP,
      name: "Siti Rahmawati",
      department: "Corporate Finance",
      phone: "0812800102",
      role: "EMPLOYEE",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-350),
      gpsConsent: true,
      createdAt: iso(-350),
      updatedAt: iso(-20),
    },
    {
      id: "usr-emp-103",
      employeeNo: "EMP-103",
      email: "andi.pratama@company.co.id",
      passwordHash: HASH_EMP,
      name: "Andi Pratama",
      department: "Product Engineering",
      phone: "0812800103",
      role: "EMPLOYEE",
      status: "PENDING_APPROVAL",
      approvedBy: null,
      approvedAt: null,
      gpsConsent: true,
      createdAt: iso(-3),
      updatedAt: iso(-3),
    },
    {
      id: "usr-emp-104",
      employeeNo: "EMP-104",
      email: "dewi.lestari@company.co.id",
      passwordHash: HASH_EMP,
      name: "Dewi Lestari",
      department: "People & Culture",
      phone: "0812800104",
      role: "EMPLOYEE",
      status: "DEACTIVATED",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-500),
      rejectedReason: "Mutasi ke kantor cabang Surabaya (Non-aktif)",
      gpsConsent: true,
      createdAt: iso(-500),
      updatedAt: iso(-12),
    },
    {
      id: "usr-drv-201",
      employeeNo: "DRV-201",
      email: "hendra.driver@company.co.id",
      passwordHash: HASH_DRV,
      name: "Pak Hendra Wijaya",
      department: "Workplace Solution Fleet",
      phone: "0813700201",
      role: "DRIVER",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-600),
      gpsConsent: true,
      createdAt: iso(-600),
      updatedAt: iso(-5),
    },
    {
      id: "usr-drv-202",
      employeeNo: "DRV-202",
      email: "agus.driver@company.co.id",
      passwordHash: HASH_DRV,
      name: "Pak Agus Setiawan",
      department: "Workplace Solution Fleet",
      phone: "0813700202",
      role: "DRIVER",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-600),
      gpsConsent: true,
      createdAt: iso(-600),
      updatedAt: iso(-5),
    },
    {
      id: "usr-drv-203",
      employeeNo: "DRV-203",
      email: "rudi.driver@company.co.id",
      passwordHash: HASH_DRV,
      name: "Pak Rudi Hartono",
      department: "Workplace Solution Fleet",
      phone: "0813700203",
      role: "DRIVER",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-600),
      gpsConsent: true,
      createdAt: iso(-600),
      updatedAt: iso(-5),
    },
    {
      id: "usr-drv-204",
      employeeNo: "DRV-204",
      email: "bambang.driver@company.co.id",
      passwordHash: HASH_DRV,
      name: "Pak Bambang Sutrisno",
      department: "Workplace Solution Fleet",
      phone: "0813700204",
      role: "DRIVER",
      status: "ACTIVE",
      approvedBy: "usr-ws-001",
      approvedAt: iso(-600),
      gpsConsent: true,
      createdAt: iso(-600),
      updatedAt: iso(-5),
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
      odometerKm: 14250,
      currentLevel: 92,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-4),
    },
    {
      id: "veh-ioniq-02",
      plateNo: "B 1025 WSE",
      model: "Hyundai Ioniq 5 Prime Long Range",
      carTypeId: "ct-ev-suv",
      powertrain: "EV",
      seats: 4,
      usableRangeKm: 380,
      odometerKm: 18910,
      currentLevel: 78,
      needsRefuel: false,
      status: "IN_USE",
      createdAt: iso(-700),
      updatedAt: iso(-1),
    },
    {
      id: "veh-ioniq-03",
      plateNo: "B 1035 WSE",
      model: "Hyundai Ioniq 5 Prime Standard",
      carTypeId: "ct-ev-suv",
      powertrain: "EV",
      seats: 4,
      usableRangeKm: 340,
      odometerKm: 21430,
      currentLevel: 24,
      needsRefuel: true,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-2),
    },
    {
      id: "veh-star-01",
      plateNo: "B 2011 WSP",
      model: "Hyundai Stargazer Prime IVT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 520,
      odometerKm: 32100,
      currentLevel: 88,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-6),
    },
    {
      id: "veh-star-02",
      plateNo: "B 2022 WSP",
      model: "Hyundai Stargazer Prime IVT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 520,
      odometerKm: 28740,
      currentLevel: 76,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-10),
    },
    {
      id: "veh-star-03",
      plateNo: "B 2033 WSP",
      model: "Hyundai Stargazer Style IVT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 500,
      odometerKm: 41200,
      currentLevel: 95,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-12),
    },
    {
      id: "veh-star-04",
      plateNo: "B 2044 WSP",
      model: "Hyundai Stargazer Style IVT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 500,
      odometerKm: 45890,
      currentLevel: 65,
      needsRefuel: false,
      status: "MAINTENANCE",
      createdAt: iso(-700),
      updatedAt: iso(-24),
    },
    {
      id: "veh-star-05",
      plateNo: "B 2055 WSP",
      model: "Hyundai Stargazer Active MT",
      carTypeId: "ct-mpv-petrol",
      powertrain: "PETROL",
      seats: 6,
      usableRangeKm: 500,
      odometerKm: 19650,
      currentLevel: 82,
      needsRefuel: false,
      status: "AVAILABLE",
      createdAt: iso(-700),
      updatedAt: iso(-18),
    },
  ];

  const drivers: Driver[] = [
    {
      id: "drv-01",
      userId: "usr-drv-201",
      name: "Pak Hendra Wijaya",
      phone: "0813700201",
      employeeNo: "DRV-201",
      licenseNo: "SIM-A-8821901",
      deviceId: "SM-A556E-HENDRA",
      status: "ON_TRIP",
    },
    {
      id: "drv-02",
      userId: "usr-drv-202",
      name: "Pak Agus Setiawan",
      phone: "0813700202",
      employeeNo: "DRV-202",
      licenseNo: "SIM-A-8821902",
      deviceId: "SM-A356E-AGUS",
      status: "AVAILABLE",
    },
    {
      id: "drv-03",
      userId: "usr-drv-203",
      name: "Pak Rudi Hartono",
      phone: "0813700203",
      employeeNo: "DRV-203",
      licenseNo: "SIM-A-8821903",
      deviceId: "SM-A256E-RUDI",
      status: "AVAILABLE",
    },
    {
      id: "drv-04",
      userId: "usr-drv-204",
      name: "Pak Bambang Sutrisno",
      phone: "0813700204",
      employeeNo: "DRV-204",
      licenseNo: "SIM-A-8821904",
      deviceId: "SM-A156E-BAMBANG",
      status: "AVAILABLE",
    },
  ];

  const bookings: Booking[] = [
    {
      id: "bk-001",
      bookingNo: "BK-261101",
      requesterId: "usr-emp-101",
      requesterName: "Budi Santoso",
      requesterDepartment: "Commercial & Sales",
      requesterPhone: "0812800101",
      startAt: iso(-28),
      endAt: iso(-24),
      pickupLocation: "Samsung Tower Lobby Utama, Jl. Jend. Sudirman",
      destination: "Pacific Place SCBD & Kementerian Perdagangan Gambir",
      purpose: "Presentasi kontrak korporat Q4 bersama tim Commercial",
      passengers: 3,
      estDistanceKm: 35,
      preferredCarTypeId: "ct-ev-suv",
      preferredCarTypeName: "CareCar Electric (Hyundai Ioniq 5)",
      preferredPowertrain: "EV",
      channel: "APP",
      status: "COMPLETED",
      vehicleId: "veh-ioniq-01",
      vehiclePlate: "B 1015 WSE",
      vehicleModel: "Hyundai Ioniq 5 Signature Long Range",
      vehiclePowertrain: "EV",
      driverId: "drv-02",
      driverName: "Pak Agus Setiawan",
      driverPhone: "0813700202",
      decidedById: "usr-ws-001",
      decidedByName: "Rina Kartika (Workplace Solution Lead)",
      decidedAt: iso(-30),
      decisionNote: "Disetujui unit Ioniq 5 B 1015 WSE",
      lateCancelFlag: false,
      overrideFlag: false,
      evRangeWarning: false,
      createdAt: iso(-31),
      updatedAt: iso(-24),
      history: [
        {
          id: "h-1",
          bookingId: "bk-001",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-101",
          actorName: "Budi Santoso",
          at: iso(-31),
        },
        {
          id: "h-2",
          bookingId: "bk-001",
          fromStatus: "PENDING_APPROVAL",
          toStatus: "CONFIRMED",
          actorId: "usr-ws-001",
          actorName: "Rina Kartika (Workplace Solution Lead)",
          reason: "Disetujui unit Ioniq 5 B 1015 WSE",
          at: iso(-30),
        },
        {
          id: "h-3",
          bookingId: "bk-001",
          fromStatus: "CONFIRMED",
          toStatus: "COMPLETED",
          actorId: "usr-drv-202",
          actorName: "Pak Agus Setiawan",
          at: iso(-24),
        },
      ],
      trip: {
        id: "trp-001",
        bookingId: "bk-001",
        checkoutAt: iso(-28),
        checkinAt: iso(-24.2),
        odoStart: 14212,
        odoEnd: 14250,
        distanceKm: 38,
        levelStart: 98,
        levelEnd: 86,
        actualUsers: ["Budi Santoso (EMP-101)", "Siti Rahmawati (EMP-102)"],
        actualUserIds: ["usr-emp-101", "usr-emp-102"],
        requesterMatched: true,
        incidentNote: "Perjalanan lancar, parkir gedung B2.",
        lateReturn: false,
        lowFuelFlag: false,
        gpsLostFlag: false,
        gpsPoints: [
          {
            id: "gps-101",
            tripId: "trp-001",
            lat: -6.2185,
            lng: 106.8122,
            label: "Sudirman HQ",
            speedKmh: 32,
            recordedAt: iso(-27.8),
          },
          {
            id: "gps-102",
            tripId: "trp-001",
            lat: -6.2243,
            lng: 106.8097,
            label: "SCBD Pacific Place",
            speedKmh: 28,
            recordedAt: iso(-26.5),
          },
          {
            id: "gps-103",
            tripId: "trp-001",
            lat: -6.1805,
            lng: 106.8332,
            label: "Gambir Kemendag",
            speedKmh: 41,
            recordedAt: iso(-25.1),
          },
        ],
      },
    },
    {
      id: "bk-002",
      bookingNo: "BK-261102",
      requesterId: "usr-emp-102",
      requesterName: "Siti Rahmawati",
      requesterDepartment: "Corporate Finance",
      requesterPhone: "0812800102",
      startAt: iso(-22),
      endAt: iso(-17),
      pickupLocation: "Lobby Menara Utama",
      destination: "Kawasan Industri Cikarang & Karawang Plant",
      purpose: "Audit inventaris gudang & rekonsiliasi aset pabrik",
      passengers: 5,
      estDistanceKm: 115,
      preferredCarTypeId: "ct-mpv-petrol",
      preferredCarTypeName: "CareCar XL MPV (Hyundai Stargazer)",
      preferredPowertrain: "PETROL",
      channel: "WHATSAPP",
      status: "COMPLETED",
      vehicleId: "veh-star-01",
      vehiclePlate: "B 2011 WSP",
      vehicleModel: "Hyundai Stargazer Prime IVT",
      vehiclePowertrain: "PETROL",
      driverId: "drv-03",
      driverName: "Pak Rudi Hartono",
      driverPhone: "0813700203",
      decidedById: "usr-ws-001",
      decidedByName: "Rina Kartika (Workplace Solution Lead)",
      decidedAt: iso(-23.5),
      decisionNote: "Disetujui Stargazer 6 kursi untuk tim audit",
      lateCancelFlag: false,
      overrideFlag: false,
      evRangeWarning: false,
      createdAt: iso(-24.5),
      updatedAt: iso(-16.5),
      history: [
        {
          id: "h-4",
          bookingId: "bk-002",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-102",
          actorName: "Siti Rahmawati",
          at: iso(-24.5),
        },
        {
          id: "h-5",
          bookingId: "bk-002",
          fromStatus: "PENDING_APPROVAL",
          toStatus: "CONFIRMED",
          actorId: "usr-ws-001",
          actorName: "Rina Kartika (Workplace Solution Lead)",
          at: iso(-23.5),
        },
        {
          id: "h-6",
          bookingId: "bk-002",
          fromStatus: "CONFIRMED",
          toStatus: "COMPLETED",
          actorId: "usr-drv-203",
          actorName: "Pak Rudi Hartono",
          at: iso(-16.5),
        },
      ],
      trip: {
        id: "trp-002",
        bookingId: "bk-002",
        checkoutAt: iso(-22),
        checkinAt: iso(-16.5),
        odoStart: 31972,
        odoEnd: 32100,
        distanceKm: 128,
        levelStart: 95,
        levelEnd: 58,
        actualUsers: ["Budi Santoso (EMP-101)"],
        actualUserIds: ["usr-emp-101"],
        requesterMatched: false,
        incidentNote:
          "Siti berhalangan hadir mendadak, diwakilkan oleh Budi Santoso. Macet di Tol Japek KM 32.",
        lateReturn: true,
        lowFuelFlag: false,
        gpsLostFlag: false,
        gpsPoints: [
          {
            id: "gps-201",
            tripId: "trp-002",
            lat: -6.2185,
            lng: 106.8122,
            label: "Jakarta HQ",
            speedKmh: 45,
            recordedAt: iso(-21.8),
          },
          {
            id: "gps-202",
            tripId: "trp-002",
            lat: -6.3054,
            lng: 107.1425,
            label: "Cikarang Industrial Estate",
            speedKmh: 62,
            recordedAt: iso(-19.5),
          },
        ],
      },
    },
    {
      id: "bk-003",
      bookingNo: "BK-261103",
      requesterId: "usr-emp-101",
      requesterName: "Budi Santoso",
      requesterDepartment: "Commercial & Sales",
      requesterPhone: "0812800101",
      startAt: iso(-1.2),
      endAt: iso(2.5),
      pickupLocation: "Lobby Utama Samsung One Tower",
      destination: "Bandara Soekarno-Hatta Terminal 3 & Kantor Klien PIK 2",
      purpose: "Penjemputan delegasi regional & site visit",
      passengers: 3,
      estDistanceKm: 64,
      preferredCarTypeId: "ct-ev-suv",
      preferredCarTypeName: "CareCar Electric (Hyundai Ioniq 5)",
      preferredPowertrain: "EV",
      channel: "APP",
      status: "IN_PROGRESS",
      vehicleId: "veh-ioniq-02",
      vehiclePlate: "B 1025 WSE",
      vehicleModel: "Hyundai Ioniq 5 Prime Long Range",
      vehiclePowertrain: "EV",
      driverId: "drv-01",
      driverName: "Pak Hendra Wijaya",
      driverPhone: "0813700201",
      decidedById: "usr-ws-001",
      decidedByName: "Rina Kartika (Workplace Solution Lead)",
      decidedAt: iso(-4),
      decisionNote: "Unit EV Ioniq 5 siap di Lobby Utara",
      lateCancelFlag: false,
      overrideFlag: false,
      evRangeWarning: false,
      createdAt: iso(-5),
      updatedAt: iso(-1),
      history: [
        {
          id: "h-7",
          bookingId: "bk-003",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-101",
          actorName: "Budi Santoso",
          at: iso(-5),
        },
        {
          id: "h-8",
          bookingId: "bk-003",
          fromStatus: "PENDING_APPROVAL",
          toStatus: "CONFIRMED",
          actorId: "usr-ws-001",
          actorName: "Rina Kartika (Workplace Solution Lead)",
          at: iso(-4),
        },
        {
          id: "h-9",
          bookingId: "bk-003",
          fromStatus: "CONFIRMED",
          toStatus: "IN_PROGRESS",
          actorId: "usr-drv-201",
          actorName: "Pak Hendra Wijaya",
          at: iso(-1),
        },
      ],
      trip: {
        id: "trp-003",
        bookingId: "bk-003",
        checkoutAt: iso(-1),
        checkinAt: null,
        odoStart: 18885,
        odoEnd: null,
        distanceKm: null,
        levelStart: 88,
        levelEnd: null,
        actualUsers: ["Budi Santoso (EMP-101)"],
        actualUserIds: ["usr-emp-101"],
        requesterMatched: true,
        incidentNote: "Sedang melintas di Tol Sedyatmo arah Bandara Soetta.",
        lateReturn: false,
        lowFuelFlag: false,
        gpsLostFlag: false,
        gpsPoints: [
          {
            id: "gps-301",
            tripId: "trp-003",
            lat: -6.2185,
            lng: 106.8122,
            label: "Start: Sudirman HQ",
            speedKmh: 38,
            recordedAt: iso(-0.9),
          },
          {
            id: "gps-302",
            tripId: "trp-003",
            lat: -6.1745,
            lng: 106.7891,
            label: "Tol Dalam Kota Tomang",
            speedKmh: 68,
            recordedAt: iso(-0.5),
          },
          {
            id: "gps-303",
            tripId: "trp-003",
            lat: -6.1182,
            lng: 106.6825,
            label: "Tol Prof. Dr. Ir. Sedyatmo KM 24",
            speedKmh: 74,
            recordedAt: iso(-0.05),
          },
        ],
      },
    },
    {
      id: "bk-004",
      bookingNo: "BK-261104",
      requesterId: "usr-emp-102",
      requesterName: "Siti Rahmawati",
      requesterDepartment: "Corporate Finance",
      requesterPhone: "0812800102",
      startAt: iso(1.5),
      endAt: iso(5),
      pickupLocation: "Lobby Utama HQ",
      destination: "Kantor Pajak Pratama & Bank Indonesia Thamrin",
      purpose: "Verifikasi dokumen pajak korporat & perbankan",
      passengers: 2,
      estDistanceKm: 22,
      preferredCarTypeId: "ct-ev-suv",
      preferredCarTypeName: "CareCar Electric (Hyundai Ioniq 5)",
      preferredPowertrain: "EV",
      channel: "APP",
      status: "CONFIRMED",
      vehicleId: "veh-ioniq-01",
      vehiclePlate: "B 1015 WSE",
      vehicleModel: "Hyundai Ioniq 5 Signature Long Range",
      vehiclePowertrain: "EV",
      driverId: "drv-02",
      driverName: "Pak Agus Setiawan",
      driverPhone: "0813700202",
      decidedById: "usr-ws-001",
      decidedByName: "Rina Kartika (Workplace Solution Lead)",
      decidedAt: iso(-2),
      decisionNote: "Silakan hubungi Pak Agus 15 menit sebelum keberangkatan.",
      lateCancelFlag: false,
      overrideFlag: false,
      evRangeWarning: false,
      createdAt: iso(-3.5),
      updatedAt: iso(-2),
      history: [
        {
          id: "h-10",
          bookingId: "bk-004",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-102",
          actorName: "Siti Rahmawati",
          at: iso(-3.5),
        },
        {
          id: "h-11",
          bookingId: "bk-004",
          fromStatus: "PENDING_APPROVAL",
          toStatus: "CONFIRMED",
          actorId: "usr-ws-001",
          actorName: "Rina Kartika (Workplace Solution Lead)",
          at: iso(-2),
        },
      ],
      trip: null,
    },
    {
      id: "bk-005",
      bookingNo: "BK-261105",
      requesterId: "usr-emp-101",
      requesterName: "Budi Santoso",
      requesterDepartment: "Commercial & Sales",
      requesterPhone: "0812800101",
      startAt: iso(4),
      endAt: iso(8),
      pickupLocation: "Lobby Utama HQ",
      destination: "BSD Digital Hub & ICE BSD City Tangerang",
      purpose: "Kunjungan pameran mitra teknologi & negosiasi vendor",
      passengers: 5,
      estDistanceKm: 65,
      preferredCarTypeId: "ct-mpv-petrol",
      preferredCarTypeName: "CareCar XL MPV (Hyundai Stargazer)",
      preferredPowertrain: "PETROL",
      channel: "APP",
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
      createdAt: iso(-2.2),
      updatedAt: iso(-2.2),
      history: [
        {
          id: "h-12",
          bookingId: "bk-005",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-101",
          actorName: "Budi Santoso",
          at: iso(-2.2),
        },
      ],
      trip: null,
    },
    {
      id: "bk-006",
      bookingNo: "BK-261106",
      requesterId: "usr-emp-102",
      requesterName: "Siti Rahmawati",
      requesterDepartment: "Corporate Finance",
      requesterPhone: "0812800102",
      startAt: iso(6),
      endAt: iso(10),
      pickupLocation: "Lobby Utama HQ",
      destination: "Kantor Akuntan Publik Kuningan & Mega Kuningan",
      purpose: "Review laporan keuangan kuartal III",
      passengers: 3,
      estDistanceKm: 18,
      preferredCarTypeId: "ct-ev-suv",
      preferredCarTypeName: "CareCar Electric (Hyundai Ioniq 5)",
      preferredPowertrain: "EV",
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
      createdAt: iso(-0.8),
      updatedAt: iso(-0.8),
      history: [
        {
          id: "h-13",
          bookingId: "bk-006",
          fromStatus: "NEW",
          toStatus: "PENDING_APPROVAL",
          actorId: "usr-emp-102",
          actorName: "Siti Rahmawati",
          reason: "Submitted via WhatsApp Bot",
          at: iso(-0.8),
        },
      ],
      trip: null,
    },
  ];

  const maintenanceBlocks: MaintenanceBlock[] = [
    {
      id: "mb-001",
      vehicleId: "veh-star-04",
      vehiclePlate: "B 2044 WSP",
      vehicleModel: "Hyundai Stargazer Style IVT",
      startAt: iso(-12),
      endAt: iso(24),
      reason:
        "Servis Berkala 45.000 KM & Spooring Balancing di Bengkel Resmi Hyundai",
      createdBy: "Rina Kartika (Workplace Solution Lead)",
      createdAt: iso(-24),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: "notif-001",
      userId: "usr-ws-001",
      event: "USER_REGISTRATION_PENDING",
      title: "Persetujuan Akun Baru: Andi Pratama (EMP-103)",
      message:
        "Karyawan Andi Pratama (Product Engineering) mendaftar akun CARE dan menunggu persetujuan Workplace Solution Admin.",
      channel: "APP",
      status: "SENT",
      read: false,
      sentAt: iso(-3),
    },
    {
      id: "notif-002",
      userId: "usr-ws-001",
      event: "LOW_CHARGE_ALERT",
      title: "Peringatan Baterai EV Rendah: B 1035 WSE (24%)",
      message:
        "Unit Hyundai Ioniq 5 (B 1035 WSE) kembali dengan baterai 24% (< batas minimum 30%). Harap jadwalkan pengisian daya.",
      channel: "APP",
      status: "SENT",
      read: false,
      sentAt: iso(-2),
    },
    {
      id: "notif-003",
      userId: "usr-emp-102",
      event: "BOOKING_APPROVED",
      title: "Booking BK-261104 Disetujui Workplace Solution",
      message:
        "Permintaan mobil ke Kantor Pajak & BI Thamrin telah disetujui. Kendaraan: Hyundai Ioniq 5 (B 1015 WSE), Driver: Pak Agus Setiawan.",
      bookingId: "bk-004",
      channel: "APP",
      status: "SENT",
      read: false,
      sentAt: iso(-2),
    },
  ];

  const auditLogs: AuditLogItem[] = [
    {
      id: "aud-001",
      actorId: "usr-ws-001",
      actorName: "Rina Kartika (Workplace Solution Lead)",
      actorRole: "WORKPLACE_ADMIN",
      action: "APPROVE_BOOKING",
      entity: "Booking",
      entityId: "BK-261104",
      summary:
        "Menyetujui booking BK-261104 (Siti Rahmawati) dengan unit B 1015 WSE & driver Pak Agus Setiawan",
      before: JSON.stringify({ status: "PENDING_APPROVAL" }),
      after: JSON.stringify({
        status: "CONFIRMED",
        vehiclePlate: "B 1015 WSE",
        driverName: "Pak Agus Setiawan",
      }),
      at: iso(-2),
    },
    {
      id: "aud-002",
      actorId: "usr-drv-201",
      actorName: "Pak Hendra Wijaya",
      actorRole: "DRIVER",
      action: "TRIP_CHECKOUT",
      entity: "Trip",
      entityId: "BK-261103",
      summary:
        "Driver check-out perjalanan BK-261103 (Odo awal: 18.885 km, Baterai EV: 88%, Penumpang aktual: Budi Santoso)",
      before: JSON.stringify({ status: "CONFIRMED" }),
      after: JSON.stringify({ status: "IN_PROGRESS", odoStart: 18885 }),
      at: iso(-1),
    },
    {
      id: "aud-003",
      actorId: "usr-ws-001",
      actorName: "Rina Kartika (Workplace Solution Lead)",
      actorRole: "WORKPLACE_ADMIN",
      action: "DEACTIVATE_USER",
      entity: "User",
      entityId: "EMP-104",
      summary:
        "Menonaktifkan akun Dewi Lestari (EMP-104) karena mutasi cabang Surabaya",
      before: JSON.stringify({ status: "ACTIVE" }),
      after: JSON.stringify({ status: "DEACTIVATED" }),
      at: iso(-12),
    },
  ];

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
