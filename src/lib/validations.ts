import { z } from "zod";

// Strip dangerous HTML / script characters to prevent stored XSS
export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .trim();
}

const cleanString = (min: number, max: number, msg: string) =>
  z
    .string(msg)
    .trim()
    .min(min, msg)
    .max(max, `Maksimal ${max} karakter / Max ${max} chars`)
    .transform((s): string => sanitizeText(s));

export const loginSchema = z.object({
  identifier: cleanString(
    3,
    100,
    "ID Karyawan atau Email wajib diisi (Employee ID or Email is required)"
  ),
  password: z
    .string("Kata sandi wajib diisi (Password is required)")
    .min(6, "Kata sandi minimal 6 karakter (Minimum 6 characters)")
    .max(128),
});

export const registerSchema = z.object({
  employeeNo: z
    .string()
    .trim()
    .min(2, "Nama Panggilan / Username minimal 2 karakter")
    .max(30, "Maksimal 30 karakter")
    .regex(
      /^[A-Za-z0-9._ -]+$/,
      "Nama Panggilan / Username hanya boleh huruf, angka, spasi, titik, garis bawah, atau tanda hubung"
    )
    .transform((s): string => sanitizeText(s)),
  name: cleanString(
    2,
    80,
    "Nama asli wajib diisi dan bukan nama palsu (Real full name is required)"
  ),
  department: cleanString(
    2,
    60,
    "Departemen wajib diisi (Department is required)"
  ),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(120)
    .transform((s): string => s.toLowerCase())
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(25)
    .transform((s): string => sanitizeText(s))
    .optional()
    .or(z.literal("")),
  requestedRole: z.enum(["EMPLOYEE", "DRIVER"]).default("EMPLOYEE"),
  password: z
    .string()
    .min(6, "Kata sandi minimal 6 karakter (Password minimum 6 characters)")
    .max(128),
});

export const bookingCreateSchema = z.object({
  startAt: z.string().min(10, "Waktu berangkat wajib diisi (Start time required)"),
  endAt: z.string().min(10, "Waktu kembali wajib diisi (End time required)"),
  pickupLocation: cleanString(
    2,
    140,
    "Lokasi penjemputan wajib diisi (Pickup location required)"
  ).default("Head Office Lobby"),
  destination: cleanString(
    3,
    160,
    "Tujuan perjalanan wajib diisi (Destination is required)"
  ),
  purpose: cleanString(
    4,
    250,
    "Keperluan perjalanan dinas wajib diisi (Business purpose is required)"
  ),
  passengers: z
    .number("Jumlah penumpang harus berupa angka")
    .int()
    .min(1, "Minimal 1 penumpang (At least 1 passenger)")
    .max(15, "Jumlah penumpang melebihi kapasitas armada (Exceeds fleet capacity)"),
  estDistanceKm: z
    .number("Estimasi jarak harus berupa angka")
    .int()
    .min(1, "Estimasi jarak minimal 1 km")
    .max(2000, "Estimasi jarak maksimal 2000 km"),
  preferredCarTypeId: z.string().optional().nullable(),
  preferredPowertrain: z.enum(["EV", "PETROL", "ANY"]).default("ANY"),
  channel: z.enum(["APP", "WHATSAPP"]).default("APP"),
  urgentOverrideByAdmin: z.boolean().optional().default(false),
  behalfOfUserId: z.string().optional().nullable(),
});

export const bookingDecisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REVISION", "OVERRIDE", "REASSIGN"]),
  vehicleId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  reason: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v): string | null | undefined => (v ? sanitizeText(v) : v)),
  newStartAt: z.string().optional().nullable(),
  newEndAt: z.string().optional().nullable(),
});

export const carTypeSchema = z.object({
  name: cleanString(2, 60, "Nama tipe mobil wajib diisi (Car type name required)"),
  code: z
    .string("Kode tipe mobil wajib diisi (Code required)")
    .trim()
    .min(2, "Kode minimal 2 karakter")
    .max(30)
    .transform((s): string => sanitizeText(s).toUpperCase().replace(/\s+/g, "_")),
  powertrain: z.enum(["EV", "PETROL", "HYBRID"]),
  seats: z.number().int().min(1).max(20),
  defaultRangeKm: z.number().int().min(50).max(1500),
  description: cleanString(3, 180, "Deskripsi singkat wajib diisi"),
  badgeText: cleanString(2, 40, "Label badge wajib diisi"),
  iconType: z.enum(["EV", "MPV", "SEDAN", "VAN"]).default("MPV"),
  active: z.boolean().default(true),
});

export const vehicleSchema = z.object({
  plateNo: z
    .string("Nomor plat kendaraan wajib diisi")
    .trim()
    .min(4, "Nomor plat minimal 4 karakter")
    .max(20)
    .transform((s): string => sanitizeText(s).toUpperCase()),
  model: cleanString(2, 80, "Model kendaraan wajib diisi"),
  carTypeId: z.string().min(1, "Tipe mobil wajib dipilih"),
  powertrain: z.enum(["EV", "PETROL"]),
  seats: z.number().int().min(1).max(20),
  usableRangeKm: z.number().int().min(50).max(1500),
  odometerKm: z.number().int().min(0).max(999999),
  currentLevel: z.number().int().min(0).max(100).default(100),
  status: z
    .enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"])
    .default("AVAILABLE"),
});

export const maintenanceBlockSchema = z.object({
  vehicleId: z.string().min(1, "Kendaraan wajib dipilih"),
  startAt: z.string().min(10, "Waktu mulai maintenance wajib diisi"),
  endAt: z.string().min(10, "Waktu selesai maintenance wajib diisi"),
  reason: cleanString(3, 200, "Alasan maintenance wajib diisi"),
});

export const tripCheckoutSchema = z.object({
  bookingId: z.string().min(1),
  odoStart: z.number().int().min(0, "Odometer awal tidak valid"),
  levelStart: z.number().int().min(1).max(100, "Level baterai/BBM harus 1-100%"),
  actualUserIds: z
    .array(z.string().min(1))
    .min(
      1,
      "Wajib memilih minimal 1 penumpang aktual yang naik kendaraan (FR-028: Actual user must be recorded)"
    ),
  incidentNote: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v): string | null | undefined => (v ? sanitizeText(v) : v)),
});

export const tripCheckinSchema = z.object({
  bookingId: z.string().min(1),
  odoEnd: z.number().int().min(1, "Odometer akhir wajib diisi"),
  levelEnd: z.number().int().min(0).max(100, "Level baterai/BBM akhir harus 0-100%"),
  incidentNote: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v): string | null | undefined => (v ? sanitizeText(v) : v)),
});
