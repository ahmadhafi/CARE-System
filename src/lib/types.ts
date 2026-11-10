export type UserRole =
  | "EMPLOYEE"
  | "DRIVER"
  | "WORKPLACE_ADMIN"
  | "SUPER_ADMIN";

export type UserStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "DEACTIVATED"
  | "REJECTED";

export type PowertrainType = "EV" | "PETROL" | "HYBRID";

export type VehicleStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "MAINTENANCE"
  | "OUT_OF_SERVICE";

export type BookingStatus =
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "REVISION_NEEDED"
  | "CANCELLED"
  | "EXPIRED"
  | "NO_SHOW";

export interface User {
  id: string;
  employeeNo: string;
  email: string;
  passwordHash: string;
  name: string;
  department: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  gpsConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface CarType {
  id: string;
  name: string;
  code: string;
  powertrain: PowertrainType;
  seats: number;
  defaultRangeKm: number;
  description: string;
  badgeText: string;
  iconType: "EV" | "MPV" | "SEDAN" | "VAN";
  active: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plateNo: string;
  model: string;
  carTypeId: string;
  powertrain: "EV" | "PETROL";
  seats: number;
  usableRangeKm: number;
  odometerKm: number;
  currentLevel: number; // % battery or fuel
  needsRefuel: boolean;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  employeeNo: string;
  licenseNo: string;
  deviceId: string;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY";
}

export interface BookingStatusHistoryItem {
  id: string;
  bookingId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  actorName: string;
  reason?: string;
  at: string;
}

export interface GpsPoint {
  id: string;
  tripId: string;
  lat: number;
  lng: number;
  label: string;
  speedKmh?: number;
  recordedAt: string;
}

export interface Trip {
  id: string;
  bookingId: string;
  checkoutAt?: string | null;
  checkinAt?: string | null;
  odoStart?: number | null;
  odoEnd?: number | null;
  distanceKm?: number | null;
  levelStart?: number | null;
  levelEnd?: number | null;
  actualUsers: string[]; // Array of employee names/IDs
  actualUserIds: string[];
  requesterMatched: boolean;
  incidentNote?: string | null;
  lateReturn: boolean;
  lowFuelFlag: boolean;
  gpsLostFlag: boolean;
  gpsPoints: GpsPoint[];
}

export interface Booking {
  id: string;
  bookingNo: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  requesterPhone: string;
  startAt: string;
  endAt: string;
  pickupLocation: string;
  destination: string;
  purpose: string;
  passengers: number;
  estDistanceKm: number;
  preferredCarTypeId?: string | null;
  preferredCarTypeName?: string | null;
  preferredPowertrain: "EV" | "PETROL" | "ANY";
  channel: "APP" | "WHATSAPP";
  status: BookingStatus;
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  vehiclePowertrain?: "EV" | "PETROL" | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  decidedById?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  lateCancelFlag: boolean;
  overrideFlag: boolean;
  evRangeWarning: boolean;
  createdAt: string;
  updatedAt: string;
  history: BookingStatusHistoryItem[];
  trip?: Trip | null;
}

export interface MaintenanceBlock {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  event: string;
  title: string;
  message: string;
  bookingId?: string;
  channel: "APP" | "WHATSAPP";
  status: "SENT" | "FAILED";
  read: boolean;
  sentAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  before?: string | null;
  after?: string | null;
  at: string;
}

export interface SystemSettings {
  turnaroundBufferMinutes: number; // BR-01: default 30
  approvalSlaHours: number;        // BR-02: default 4
  cancellationCutoffHours: number; // BR-03: default 2
  noShowGraceMinutes: number;      // BR-05: default 30
  evRangeBufferMultiplier: number; // BR-08: default 1.2
  minChargeFuelPercent: number;    // BR-08: default 30
  gpsRetentionDays: number;        // BR-10: default 90
  gpsUpdateIntervalSeconds: number;// FR-038: default 30
  gpsLostThresholdMinutes: number; // FR-036: default 10
  minBookingNoticeHours: number;   // BR-11: default 2
  whatsappContactNumber: string;   // Workplace Solution contact
  departmentDisplayName: string;   // "Workplace Solution"
}

export interface WhatsAppSession {
  phone: string;
  userId?: string;
  userName?: string;
  step:
    | "MENU"
    | "ASK_DATE"
    | "ASK_TIME"
    | "ASK_DESTINATION"
    | "ASK_PASSENGERS"
    | "ASK_PURPOSE"
    | "ASK_CAR_TYPE"
    | "CONFIRM"
    | "CANCEL_SELECT";
  retryCount: number;
  draft: {
    dateStr?: string;
    timeRangeStr?: string;
    startAt?: string;
    endAt?: string;
    destination?: string;
    passengers?: number;
    purpose?: string;
    preferredPowertrain?: "EV" | "PETROL" | "ANY";
  };
  messages: {
    id: string;
    sender: "USER" | "BOT";
    text: string;
    at: string;
  }[];
  lastActivityAt: string;
}
