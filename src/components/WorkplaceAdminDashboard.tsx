"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  Users,
  MapPin,
  Calendar,
  ShieldAlert,
  Settings,
  Plus,
  Zap,
  Fuel,
  Wrench,
  UserCheck,
  UserX,
  Radio,
  Clock,
  RefreshCw,
  Edit3,
  History,
  Layers,
} from "lucide-react";
import {
  Booking,
  CarType,
  Driver,
  MaintenanceBlock,
  SafeUser,
  SystemSettings,
  UserRole,
  Vehicle,
  VehicleStatus,
} from "@/lib/types";
import {
  exportFleetReportToCsv,
  FleetReportPayload,
  generateFleetTripPdfReport,
} from "@/lib/pdf-report";

interface WorkplaceAdminDashboardProps {
  currentUser: SafeUser;
  bookings: Booking[];
  carTypes: CarType[];
  vehicles: Vehicle[];
  drivers: Driver[];
  maintenanceBlocks: MaintenanceBlock[];
  allUsers: SafeUser[];
  onRefresh: () => void;
}

export default function WorkplaceAdminDashboard({
  currentUser,
  bookings,
  carTypes,
  vehicles,
  drivers,
  maintenanceBlocks,
  allUsers,
  onRefresh,
}: WorkplaceAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    | "APPROVAL_QUEUE"
    | "FLEET_AND_TYPES"
    | "USERS_AND_DRIVERS"
    | "TIMELINE_AND_MAP"
    | "REPORTS_AND_AUDIT"
  >("APPROVAL_QUEUE");

  // Report & Audit API data
  const [reportData, setReportData] = useState<
    | (FleetReportPayload & {
        departmentReport: {
          department: string;
          bookingsCount: number;
          completedCount: number;
          lateCancelCount: number;
          totalDistanceKm: number;
        }[];
        auditLogs: {
          id: string;
          actorName: string;
          actorRole: string;
          action: string;
          entity: string;
          entityId: string;
          summary: string;
          at: string;
        }[];
        settings: SystemSettings;
      })
    | null
  >(null);

  const [reportPowertrain, setReportPowertrain] = useState("ALL");
  const [feedback, setFeedback] = useState<{
    type: "OK" | "ERR";
    text: string;
  } | null>(null);

  // Booking Approval Decision Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [decisionAction, setDecisionAction] = useState<
    "APPROVE" | "REJECT" | "REVISION" | "OVERRIDE" | "REASSIGN"
  >("APPROVE");
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignDriverId, setAssignDriverId] = useState("");
  const [decisionReason, setDecisionReason] = useState("");

  // Add Car Type Form State
  const [showAddCarType, setShowAddCarType] = useState(false);
  const [ctName, setCtName] = useState("");
  const [ctCode, setCtCode] = useState("");
  const [ctPowertrain, setCtPowertrain] = useState<"EV" | "PETROL" | "HYBRID">(
    "EV"
  );
  const [ctSeats, setCtSeats] = useState(4);
  const [ctRange, setCtRange] = useState(380);
  const [ctBadge, setCtBadge] = useState("Eco EV • 4 Kursi");
  const [ctDesc, setCtDesc] = useState("");

  // Add Vehicle Form State
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehPlate, setVehPlate] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehCarTypeId, setVehCarTypeId] = useState(carTypes[0]?.id || "");
  const [vehPowertrain, setVehPowertrain] = useState<"EV" | "PETROL">("EV");
  const [vehSeats, setVehSeats] = useState(4);
  const [vehRange, setVehRange] = useState(380);
  const [vehOdo, setVehOdo] = useState(1000);

  // Edit Vehicle Modal State
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehStatus, setEditVehStatus] =
    useState<VehicleStatus>("AVAILABLE");
  const [editVehRange, setEditVehRange] = useState(380);
  const [editVehLevel, setEditVehLevel] = useState(100);
  const [editVehSeats, setEditVehSeats] = useState(4);
  const [editVehModel, setEditVehModel] = useState("");

  // Add Maintenance Block State
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [maintVehId, setMaintVehId] = useState(vehicles[0]?.id || "");
  const [maintStart, setMaintStart] = useState(
    new Date(Date.now() + 12 * 3600_000).toISOString().slice(0, 16)
  );
  const [maintEnd, setMaintEnd] = useState(
    new Date(Date.now() + 36 * 3600_000).toISOString().slice(0, 16)
  );
  const [maintReason, setMaintReason] = useState("");

  // Add User Modal State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmpNo, setNewUserEmpNo] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("Commercial & Sales");
  const [newUserPhone, setNewUserPhone] = useState("0812900900");
  const [newUserRole, setNewUserRole] = useState<UserRole>("EMPLOYEE");
  const [newUserPass, setNewUserPass] = useState("CareUser2026!");

  async function fetchReportsData() {
    try {
      const res = await fetch(
        `/api/reports?powertrain=${encodeURIComponent(reportPowertrain)}`
      );
      if (res.ok) {
        const data = await res.json();
        setReportData({
          ...data,
          generatedBy: currentUser.name,
          periodLabel: `Semua Riwayat Perjalanan (${
            reportPowertrain === "ALL" ? "EV & Petrol" : reportPowertrain
          })`,
        });
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, vehicles, allUsers, reportPowertrain]);

  const pendingBookings = bookings
    .filter((b) => b.status === "PENDING_APPROVAL")
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

  const pendingUsers = allUsers.filter((u) => u.status === "PENDING_APPROVAL");
  const lowChargeVehicles = vehicles.filter(
    (v) => v.needsRefuel || v.currentLevel < 30
  );
  const activeGpsBookings = bookings.filter((b) => b.status === "IN_PROGRESS");

  function openBookingDecisionModal(
    bk: Booking,
    defaultAction: "APPROVE" | "REJECT" | "REVISION" | "REASSIGN" = "APPROVE"
  ) {
    setSelectedBooking(bk);
    setDecisionAction(defaultAction);
    setDecisionReason("");

    // Pre-select a matching available vehicle & driver
    const candidateVehicles = vehicles.filter(
      (v) =>
        v.status === "AVAILABLE" &&
        v.seats >= bk.passengers &&
        (!bk.preferredCarTypeId || v.carTypeId === bk.preferredCarTypeId)
    );
    const fallbackVehicles = vehicles.filter(
      (v) => v.status === "AVAILABLE" && v.seats >= bk.passengers
    );
    setAssignVehicleId(
      bk.vehicleId ||
        candidateVehicles[0]?.id ||
        fallbackVehicles[0]?.id ||
        vehicles[0]?.id ||
        ""
    );

    const freeDrivers = drivers.filter((d) => d.status === "AVAILABLE");
    setAssignDriverId(
      bk.driverId || freeDrivers[0]?.id || drivers[0]?.id || ""
    );
  }

  async function handleBookingDecisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking) return;
    setFeedback(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: decisionAction,
          vehicleId: assignVehicleId,
          driverId: assignDriverId,
          reason: decisionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "ERR", text: data.error || "Gagal memproses." });
      } else {
        setFeedback({ type: "OK", text: data.message });
        setSelectedBooking(null);
        onRefresh();
      }
    } catch {
      setFeedback({ type: "ERR", text: "Kesalahan jaringan." });
    }
  }

  async function handleUserAction(
    userId: string,
    action:
      | "APPROVE"
      | "REJECT"
      | "DEACTIVATE"
      | "ACTIVATE"
      | "UPDATE_ROLE_AND_INFO",
    role?: UserRole,
    reason?: string
  ) {
    setFeedback(null);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error || "Gagal memperbarui akun." });
    } else {
      setFeedback({
        type: "OK",
        text: `Status/Peran pengguna berhasil diperbarui (${action}).`,
      });
      onRefresh();
    }
  }

  async function handleAddUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeNo: newUserEmpNo,
        name: newUserName,
        email: newUserEmail,
        department: newUserDept,
        phone: newUserPhone,
        role: newUserRole,
        password: newUserPass,
        status: "ACTIVE",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error });
    } else {
      setFeedback({
        type: "OK",
        text: `Akun ${newUserName} (${newUserEmpNo}) berhasil dibuat & langsung aktif!`,
      });
      setShowAddUser(false);
      setNewUserEmpNo("");
      setNewUserName("");
      setNewUserEmail("");
      onRefresh();
    }
  }

  async function handleCreateCarType(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "CAR_TYPE",
        name: ctName,
        code: ctCode,
        powertrain: ctPowertrain,
        seats: ctSeats,
        defaultRangeKm: ctRange,
        badgeText: ctBadge,
        description: ctDesc,
        iconType: ctPowertrain === "EV" ? "EV" : "MPV",
        active: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error });
    } else {
      setFeedback({
        type: "OK",
        text: `Tipe mobil baru "${ctName}" berhasil ditambahkan ke pemilih ala Gojek!`,
      });
      setShowAddCarType(false);
      setCtName("");
      setCtCode("");
      setCtDesc("");
      onRefresh();
    }
  }

  async function handleToggleCarTypeActive(ct: CarType) {
    await fetch("/api/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "CAR_TYPE",
        id: ct.id,
        active: !ct.active,
      }),
    });
    onRefresh();
  }

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "VEHICLE",
        plateNo: vehPlate,
        model: vehModel,
        carTypeId: vehCarTypeId,
        powertrain: vehPowertrain,
        seats: vehSeats,
        usableRangeKm: vehRange,
        odometerKm: vehOdo,
        currentLevel: 100,
        status: "AVAILABLE",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error });
    } else {
      setFeedback({
        type: "OK",
        text: `Kendaraan baru ${vehPlate} (${vehModel}) berhasil ditambahkan ke armada!`,
      });
      setShowAddVehicle(false);
      setVehPlate("");
      setVehModel("");
      onRefresh();
    }
  }

  async function handleUpdateVehicleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVehicle) return;
    const res = await fetch("/api/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "VEHICLE",
        id: editingVehicle.id,
        model: editVehModel,
        status: editVehStatus,
        usableRangeKm: editVehRange,
        currentLevel: editVehLevel,
        seats: editVehSeats,
        needsRefuel: editVehLevel < 30,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error });
    } else {
      setFeedback({
        type: "OK",
        text: `Data kendaraan ${editingVehicle.plateNo} berhasil diperbarui.`,
      });
      setEditingVehicle(null);
      onRefresh();
    }
  }

  async function handleCreateMaintenance(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "MAINTENANCE_BLOCK",
        vehicleId: maintVehId,
        startAt: new Date(maintStart).toISOString(),
        endAt: new Date(maintEnd).toISOString(),
        reason: maintReason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: "ERR", text: data.error });
    } else {
      const affectedCount = data.affectedBookings?.length || 0;
      setFeedback({
        type: "OK",
        text: `Jadwal Maintenance disimpan.${
          affectedCount > 0
            ? ` Perhatian: Terdapat ${affectedCount} booking CONFIRMED yang terdampak dan harus dijadwalkan ulang (FR-016)!`
            : ""
        }`,
      });
      setShowAddMaint(false);
      setMaintReason("");
      onRefresh();
    }
  }

  function handleDownloadPdf() {
    if (!reportData) return;
    generateFleetTripPdfReport(reportData);
    setFeedback({
      type: "OK",
      text: "Laporan PDF Perjalanan Armada (Fleet Trip Report) berhasil diunduh!",
    });
  }

  function handleDownloadCsv() {
    if (!reportData) return;
    exportFleetReportToCsv(reportData);
    setFeedback({
      type: "OK",
      text: "Data Laporan Perjalanan berhasil diekspor ke format CSV/Excel!",
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Executive Header with Instant PDF Report Generator */}
      <div className="bg-gradient-to-r from-[#0A143C] via-[#1428A0] to-[#0066FF] rounded-[28px] p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 px-3.5 py-1 rounded-full text-xs font-extrabold mb-2 border border-white/20">
              <span>WORKPLACE SOLUTION COMMAND CENTER</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Workplace Solution Admin Dashboard
            </h2>
            <p className="text-blue-100 text-xs md:text-sm mt-1">
              Kelola persetujuan pemesanan mobil, persetujuan akun karyawan baru,
              konfigurasi tipe mobil ala Gojek, pelacakan GPS, dan laporan PDF
              perjalanan armada.
            </p>
          </div>

          {/* Direct One-Click PDF Report & CSV Export Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-5 py-3 rounded-full bg-white text-[#1428A0] hover:bg-blue-50 font-extrabold text-xs shadow-lg flex items-center gap-2 transition"
            >
              <FileText className="w-4 h-4 text-[#0066FF]" />
              <span>Generate PDF Fleet Trip Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-5 py-3 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#00C3FF]" />
              <span>Export Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Strip (S-G1) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Antrean Booking
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-amber-300">
              {pendingBookings.length}
            </div>
            <div className="text-[11px] text-blue-100">
              Menunggu Keputusan WS
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Persetujuan Akun
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-[#00C3FF]">
              {pendingUsers.length}
            </div>
            <div className="text-[11px] text-blue-100">
              Registrasi User Baru
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Trip Aktif (GPS)
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-emerald-300">
              {activeGpsBookings.length}
            </div>
            <div className="text-[11px] text-blue-100">
              Sedang di Jalan
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Total Armada
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-white">
              {vehicles.length} Unit
            </div>
            <div className="text-[11px] text-blue-100">
              {vehicles.filter((v) => v.powertrain === "EV").length} EV •{" "}
              {vehicles.filter((v) => v.powertrain === "PETROL").length} Petrol
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Total Jarak Trip
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-white">
              {reportData?.kpis.totalDistanceKm || 230} KM
            </div>
            <div className="text-[11px] text-blue-100">
              Tercatat via Odometer
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
            <div className="text-[11px] text-blue-200 font-bold uppercase">
              Peringatan Armada
            </div>
            <div className="text-2xl font-extrabold mt-0.5 text-rose-300">
              {lowChargeVehicles.length}
            </div>
            <div className="text-[11px] text-blue-100">
              Baterai/BBM &lt; 30%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills (Samsung One UI Style) */}
      <div className="bg-white p-2 rounded-full shadow-sm border border-slate-200 flex flex-wrap gap-1.5">
        {[
          {
            id: "APPROVAL_QUEUE",
            label: `1. Antrean Persetujuan Booking (${pendingBookings.length})`,
            icon: CheckCircle2,
          },
          {
            id: "USERS_AND_DRIVERS",
            label: `2. Persetujuan Akun, Role & Driver (${pendingUsers.length} Pending)`,
            icon: Users,
          },
          {
            id: "FLEET_AND_TYPES",
            label: `3. Kelola Tipe Mobil & Armada (${vehicles.length} Mobil)`,
            icon: Car,
          },
          {
            id: "TIMELINE_AND_MAP",
            label: `4. Timeline Jadwal & Live GPS Map (${activeGpsBookings.length} Live)`,
            icon: MapPin,
          },
          {
            id: "REPORTS_AND_AUDIT",
            label: "5. Laporan PDF Armada, Audit Log & Rules",
            icon: FileText,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id as typeof activeTab)
              }
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all ${
                active
                  ? "bg-[#1428A0] text-white shadow-md"
                  : "text-slate-600 hover:bg-[#F4F6FA] hover:text-[#1428A0]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-bold border ${
            feedback.type === "OK"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "OK" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: BOOKING APPROVAL QUEUE & ALL BOOKINGS (S-G2, S-G3)
         ===================================================================== */}
      {activeTab === "APPROVAL_QUEUE" && (
        <div className="space-y-6">
          {/* Active Alerts Banner (S-G1) */}
          {(pendingUsers.length > 0 || lowChargeVehicles.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950">
                      <strong className="block text-sm">
                        {pendingUsers.length} Pendaftaran Akun Baru Menunggu
                        Persetujuan Workplace Solution
                      </strong>
                      Karyawan belum dapat login sebelum akun mereka disetujui.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("USERS_AND_DRIVERS")}
                    className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0"
                  >
                    Tinjau Akun
                  </button>
                </div>
              )}

              {lowChargeVehicles.length > 0 && (
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-950">
                      <strong className="block text-sm">
                        Peringatan Pengisian Daya EV / BBM (FR-029)
                      </strong>
                      Unit{" "}
                      {lowChargeVehicles.map((v) => `${v.plateNo} (${v.currentLevel}%)`).join(", ")}{" "}
                      berada di bawah batas minimum 30%.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("FLEET_AND_TYPES")}
                    className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0"
                  >
                    Kelola Unit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pending Requests Queue (FR-007) */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Antrean Permintaan Menunggu Persetujuan Workplace Solution
                  (S-G2)
                </h3>
                <p className="text-xs text-slate-500">
                  Diurutkan berdasarkan jadwal keberangkatan terdekat (FR-007).
                  Sistem mengecek ulang konflik kendaraan & driver saat
                  persetujuan (FR-011).
                </p>
              </div>
              <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-3.5 py-1.5 rounded-full">
                {pendingBookings.length} Pending
              </span>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="text-center py-10 bg-[#F4F6FA] rounded-2xl text-sm text-slate-500">
                Seluruh permintaan pemesanan mobil telah diproses!
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((bk) => {
                  const waitHours = Math.max(
                    0.1,
                    Number(
                      (
                        (Date.now() - new Date(bk.createdAt).getTime()) /
                        3600_000
                      ).toFixed(1)
                    )
                  );

                  return (
                    <div
                      key={bk.id}
                      className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-[#1428A0] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                            {bk.bookingNo}
                          </span>
                          <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            Channel: {bk.channel}
                          </span>
                          <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                            Menunggu {waitHours} jam
                          </span>
                          <span className="bg-blue-100 text-[#1428A0] text-xs font-bold px-2.5 py-1 rounded-full">
                            Preferensi: {bk.preferredCarTypeName || bk.preferredPowertrain}
                          </span>
                        </div>

                        <div className="text-base font-extrabold text-slate-900">
                          {bk.requesterName} ({bk.requesterDepartment}) →{" "}
                          <span className="text-[#0066FF]">{bk.destination}</span>
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                          <span>
                            <strong>Jadwal:</strong>{" "}
                            {new Date(bk.startAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}{" "}
                            –{" "}
                            {new Date(bk.endAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            <strong>Penumpang:</strong> {bk.passengers} orang
                          </span>
                          <span>•</span>
                          <span>
                            <strong>Est. Jarak:</strong> {bk.estDistanceKm} km
                          </span>
                        </div>

                        <div className="text-xs text-slate-500">
                          <strong>Keperluan:</strong> {bk.purpose}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openBookingDecisionModal(bk, "APPROVE")}
                          className="px-5 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui & Tugaskan Mobil</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openBookingDecisionModal(bk, "REVISION")}
                          className="px-4 py-2.5 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs transition"
                        >
                          Minta Revisi
                        </button>

                        <button
                          type="button"
                          onClick={() => openBookingDecisionModal(bk, "REJECT")}
                          className="px-4 py-2.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Confirmed & Completed Bookings Table */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">
              Daftar Seluruh Jadwal & Perjalanan Operasional ({bookings.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase">
                    <th className="py-3 px-3">No. Booking</th>
                    <th className="py-3 px-3">Pemohon & Penumpang Aktual</th>
                    <th className="py-3 px-3">Tujuan & Jadwal</th>
                    <th className="py-3 px-3">Unit & Driver</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi WS Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {bookings.map((bk) => (
                    <tr key={bk.id} className="hover:bg-[#F4F6FA]/70">
                      <td className="py-3.5 px-3 font-extrabold text-[#1428A0]">
                        {bk.bookingNo}
                        <div className="text-[10px] text-slate-400 font-normal">
                          via {bk.channel}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {bk.requesterName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {bk.requesterDepartment} ({bk.passengers} kursi)
                        </div>
                        {bk.trip && (
                          <div
                            className={`text-[10px] font-bold mt-1 ${
                              bk.trip.requesterMatched
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }`}
                          >
                            Aktual: {bk.trip.actualUsers.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {bk.destination}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(bk.startAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {bk.vehiclePlate ? (
                          <div>
                            <span className="font-extrabold text-slate-900">
                              {bk.vehiclePlate}
                            </span>{" "}
                            ({bk.vehiclePowertrain})
                            <div className="text-[11px] text-slate-500">
                              {bk.driverName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Belum ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                          {bk.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {(bk.status === "CONFIRMED" ||
                          bk.status === "PENDING_APPROVAL") && (
                          <button
                            type="button"
                            onClick={() =>
                              openBookingDecisionModal(
                                bk,
                                bk.status === "CONFIRMED"
                                  ? "REASSIGN"
                                  : "APPROVE"
                              )
                            }
                            className="px-3 py-1.5 rounded-full bg-[#E8F0FE] hover:bg-[#1428A0] hover:text-white text-[#1428A0] font-bold transition"
                          >
                            {bk.status === "CONFIRMED"
                              ? "Ubah Unit / Override"
                              : "Proses"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: USER APPROVALS, DEACTIVATION, ROLES & DRIVERS (S-A1, S-G7)
         ===================================================================== */}
      {activeTab === "USERS_AND_DRIVERS" && (
        <div className="space-y-6">
          {/* Pending Account Registrations Card */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border-2 border-[#0066FF]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <span className="bg-[#E8F0FE] text-[#1428A0] text-xs font-extrabold px-3 py-1 rounded-full">
                  Otorisasi Workplace Solution
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  Persetujuan Pendaftaran Akun Baru ({pendingUsers.length}{" "}
                  Menunggu)
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap pendaftaran akun internal wajib disetujui oleh{" "}
                  <strong>Workplace Solution Admin</strong> sebelum dapat masuk
                  ke sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddUser(true)}
                className="px-5 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah User / Driver Langsung</span>
              </button>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F4F6FA] text-center text-xs text-slate-500">
                Tidak ada pendaftaran akun baru yang menunggu persetujuan.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {u.name}
                        </span>
                        <span className="bg-[#1428A0] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {u.employeeNo}
                        </span>
                        <span className="bg-amber-200 text-amber-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                          PENDING APPROVAL
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Email: <strong>{u.email}</strong> • Dept:{" "}
                        <strong>{u.department}</strong> • WhatsApp:{" "}
                        <strong>{u.phone}</strong> • Peran Diajukan:{" "}
                        <strong>{u.role}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleUserAction(u.id, "APPROVE", u.role)
                        }
                        className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Setujui Akun (Approve)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleUserAction(
                            u.id,
                            "REJECT",
                            u.role,
                            "Data NIK tidak sesuai direktori Workplace Solution"
                          )
                        }
                        className="px-4 py-2 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Users Directory: Activate / Deactivate / Change Role */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Manajemen Seluruh Pengguna, Hak Akses & Deaktivasi (S-A1)
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Workplace Solution Admin dapat menonaktifkan (Deactivate) akun
              karyawan/driver kapan saja atau mengubah peran akses.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase">
                    <th className="py-3 px-3">NIK / Nama</th>
                    <th className="py-3 px-3">Email & WhatsApp</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Peran (Role)</th>
                    <th className="py-3 px-3">Status Akun</th>
                    <th className="py-3 px-3 text-right">Kontrol Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F4F6FA]/60">
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900">
                          {u.name}
                        </div>
                        <div className="text-[11px] font-bold text-[#0066FF]">
                          {u.employeeNo}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div>{u.email}</div>
                        <div className="text-slate-500">{u.phone}</div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {u.department}
                      </td>
                      <td className="py-3.5 px-3">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleUserAction(
                              u.id,
                              "UPDATE_ROLE_AND_INFO",
                              e.target.value as UserRole
                            )
                          }
                          className="bg-[#F4F6FA] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1428A0]"
                        >
                          <option value="EMPLOYEE">EMPLOYEE</option>
                          <option value="DRIVER">DRIVER</option>
                          <option value="WORKPLACE_ADMIN">
                            WORKPLACE_ADMIN
                          </option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : u.status === "PENDING_APPROVAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        {u.status === "PENDING_APPROVAL" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUserAction(u.id, "APPROVE", u.role)
                            }
                            className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold"
                          >
                            Approve
                          </button>
                        )}
                        {u.status === "ACTIVE" && u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUserAction(
                                u.id,
                                "DEACTIVATE",
                                u.role,
                                "Dinonaktifkan oleh Workplace Solution Admin"
                              )
                            }
                            className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold"
                          >
                            Nonaktifkan (Deactivate)
                          </button>
                        )}
                        {(u.status === "DEACTIVATED" ||
                          u.status === "REJECTED") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUserAction(u.id, "ACTIVATE", u.role)
                            }
                            className="px-3 py-1.5 rounded-full bg-[#E8F0FE] hover:bg-[#1428A0] hover:text-white text-[#1428A0] font-bold"
                          >
                            Aktifkan Kembali
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: CAR TYPES & FLEET VEHICLES MANAGER (S-G6, FR-014 to FR-019)
         ===================================================================== */}
      {activeTab === "FLEET_AND_TYPES" && (
        <div className="space-y-6">
          {/* Section A: Gojek-Style Car Types Configuration */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <span className="bg-[#E8F0FE] text-[#1428A0] text-xs font-extrabold px-3 py-1 rounded-full">
                  Katalog Tipe Mobil Gojek-Style
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  Kategori Tipe Mobil Operasional ({carTypes.length} Tipe)
                </h3>
                <p className="text-xs text-slate-500">
                  Tambahkan atau modifikasi kategori tipe mobil yang muncul pada
                  layar pemesanan karyawan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCarType(true)}
                className="px-5 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tipe Mobil Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {carTypes.map((ct) => (
                <div
                  key={ct.id}
                  className={`rounded-2xl p-5 border-2 transition ${
                    ct.active
                      ? "border-blue-200 bg-[#F4F6FA]"
                      : "border-slate-200 bg-slate-100 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-[#0066FF] uppercase">
                      {ct.code} • {ct.powertrain}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleCarTypeActive(ct)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        ct.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {ct.active ? "Aktif di App" : "Nonaktif"}
                    </button>
                  </div>
                  <div className="font-extrabold text-base text-slate-900">
                    {ct.name}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {ct.description}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Kapasitas: {ct.seats} Kursi</span>
                    <span>Range: {ct.defaultRangeKm} KM</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Individual Operational Vehicles Manager (FR-014, FR-015, FR-017) */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Armada Kendaraan Operasional ({vehicles.length} Unit)
                </h3>
                <p className="text-xs text-slate-500">
                  Tambah unit baru, ubah status ketersediaan, perbarui jarak
                  tempuh (range), atau tandai pengisian baterai/BBM selesai.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaint(true)}
                  className="px-4 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Jadwalkan Maintenance (FR-016)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(true)}
                  className="px-5 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kendaraan Baru (FR-014)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 p-4 bg-[#F9FAFC] flex flex-col justify-between hover:border-blue-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-extrabold text-sm bg-[#1428A0] text-white px-3 py-1 rounded-full">
                        {v.plateNo}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          v.status === "AVAILABLE"
                            ? "bg-emerald-100 text-emerald-800"
                            : v.status === "IN_USE"
                            ? "bg-blue-100 text-[#1428A0]"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-slate-900">
                      {v.model}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Powertrain: <strong>{v.powertrain}</strong> •{" "}
                      <strong>{v.seats} Kursi</strong>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Odometer:</span>
                        <strong className="text-slate-900">
                          {v.odometerKm.toLocaleString("id-ID")} km
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Usable Range:</span>
                        <strong className="text-slate-900">
                          {v.usableRangeKm} km
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {v.powertrain === "EV" ? "Baterai EV:" : "Level BBM:"}
                        </span>
                        <strong
                          className={
                            v.currentLevel < 30
                              ? "text-rose-600 font-extrabold"
                              : "text-emerald-700"
                          }
                        >
                          {v.currentLevel}%{" "}
                          {v.currentLevel < 30 ? "(Perlu Isi Daya!)" : ""}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVehicle(v);
                        setEditVehModel(v.model);
                        setEditVehStatus(v.status);
                        setEditVehRange(v.usableRangeKm);
                        setEditVehLevel(v.currentLevel);
                        setEditVehSeats(v.seats);
                      }}
                      className="flex-1 py-2 px-3 rounded-full bg-[#E8F0FE] hover:bg-[#1428A0] hover:text-white text-[#1428A0] text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit / Status</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: SCHEDULE TIMELINE & LIVE FLEET GPS MAP (S-G4, S-G5)
         ===================================================================== */}
      {activeTab === "TIMELINE_AND_MAP" && (
        <div className="space-y-6">
          {/* Live Fleet GPS Map (S-G5, FR-034) */}
          <div className="bg-[#0B1536] rounded-[28px] p-6 md:p-8 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-extrabold mb-2">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>LIVE GPS TELEMETRY MAP (FR-034)</span>
                </div>
                <h3 className="text-xl font-extrabold">
                  Peta Lokasi Real-Time Armada Operasional Aktif
                </h3>
                <p className="text-xs text-blue-200">
                  Menampilkan posisi terakhir kendaraan yang sedang dalam
                  perjalanan (antara Check-Out dan Check-In).
                </p>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Posisi GPS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Interactive Jakarta SVG Radar Map */}
              <div className="lg:col-span-7 bg-[#112255] rounded-2xl p-5 border border-white/15 relative overflow-hidden min-h-[290px] flex flex-col justify-between">
                <div className="text-xs text-blue-200 flex items-center justify-between z-10">
                  <span>Koridor Jabodetabek (WIB / Asia-Jakarta)</span>
                  <span className="text-emerald-300 font-bold">
                    Interval Update: 30 dtk
                  </span>
                </div>

                {/* Stylized Route Grid */}
                <div className="my-6 relative h-44 bg-[#0B173D] rounded-xl border border-blue-400/20 p-4 flex items-center justify-around">
                  <div className="text-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-400 mx-auto mb-1" />
                    <div className="text-[10px] text-blue-200 font-bold">
                      Bandara Soetta
                    </div>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-[#00C3FF]/50 mx-2 relative">
                    {activeGpsBookings.map((bk) => {
                      const latestGps =
                        bk.trip?.gpsPoints[bk.trip.gpsPoints.length - 1];
                      return (
                        <div
                          key={bk.id}
                          className=" -top-5 left-1/3 bg-[#0066FF] text-white px-3 py-1 rounded-full text-[11px] font-extrabold shadow-lg inline-flex items-center gap-1.5 border border-white"
                        >
                          <Car className="w-3.5 h-3.5 text-[#00C3FF]" />
                          <span>
                            {bk.vehiclePlate} ({latestGps?.speedKmh || 65} km/j)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 rounded-full bg-[#00C3FF] mx-auto mb-1 ring-4 ring-cyan-400/30" />
                    <div className="text-[10px] text-white font-bold">
                      Sudirman HQ / SCBD
                    </div>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-blue-400/30 mx-2" />
                  <div className="text-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-400 mx-auto mb-1" />
                    <div className="text-[10px] text-blue-200 font-bold">
                      Cikarang Plant
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-blue-200/80 z-10">
                  Privasi NFR-005: Koordinat GPS hanya direkam saat trip aktif
                  dan hanya dapat dilihat oleh Workplace Solution Admin.
                </div>
              </div>

              {/* Active Trip Telemetry Cards */}
              <div className="lg:col-span-5 space-y-3">
                {activeGpsBookings.length === 0 ? (
                  <div className="bg-white/10 rounded-2xl p-6 text-center text-xs text-blue-200">
                    Saat ini tidak ada kendaraan yang sedang dalam perjalanan
                    aktif.
                  </div>
                ) : (
                  activeGpsBookings.map((bk) => {
                    const pts = bk.trip?.gpsPoints || [];
                    const lastPt = pts[pts.length - 1];
                    return (
                      <div
                        key={bk.id}
                        className="bg-white/10 rounded-2xl p-4 border border-white/15 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="bg-[#0066FF] text-white text-xs font-extrabold px-3 py-0.5 rounded-full">
                            {bk.vehiclePlate} • {bk.bookingNo}
                          </span>
                          <span className="text-[11px] text-emerald-300 font-bold">
                            GPS Sinyal Kuat
                          </span>
                        </div>
                        <div className="font-bold text-sm">
                          {bk.destination}
                        </div>
                        <div className="text-xs text-blue-100">
                          Driver: <strong>{bk.driverName}</strong> • Penumpang:{" "}
                          <strong>{bk.trip?.actualUsers.join(", ")}</strong>
                        </div>
                        {lastPt && (
                          <div className="bg-[#0B1536] rounded-xl p-2.5 text-[11px] text-cyan-200">
                            📍 <strong>Posisi Terakhir:</strong> {lastPt.label}{" "}
                            ({lastPt.lat.toFixed(4)}, {lastPt.lng.toFixed(4)}) •{" "}
                            {new Date(lastPt.recordedAt).toLocaleTimeString(
                              "id-ID"
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Schedule Timeline & Maintenance Blocks (S-G4, FR-020) */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Timeline Jadwal Armada & Blokir Maintenance (S-G4 / FR-020)
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Pantau alokasi setiap kendaraan operasional, slot kosong, dan
              jadwal perawatan berkala.
            </p>

            <div className="space-y-3">
              {vehicles.map((v) => {
                const vBookings = bookings.filter(
                  (b) =>
                    b.vehicleId === v.id &&
                    (b.status === "CONFIRMED" || b.status === "IN_PROGRESS")
                );
                const vMaint = maintenanceBlocks.filter(
                  (m) => m.vehicleId === v.id
                );

                return (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-[#F4F6FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="md:w-64 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs bg-[#1428A0] text-white px-2.5 py-0.5 rounded-full">
                          {v.plateNo}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {v.powertrain}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        {v.model}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-2">
                      {vBookings.length === 0 && vMaint.length === 0 && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold">
                          ✓ Slot Kosong — Siap Ditugaskan
                        </span>
                      )}

                      {vBookings.map((b) => (
                        <div
                          key={b.id}
                          className="bg-[#E8F0FE] border border-blue-300 text-[#1428A0] px-3 py-1.5 rounded-xl text-xs"
                        >
                          <div className="font-extrabold">
                            {b.bookingNo}: {b.destination}
                          </div>
                          <div className="text-[11px]">
                            {new Date(b.startAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}{" "}
                            • {b.driverName}
                          </div>
                        </div>
                      ))}

                      {vMaint.map((m) => (
                        <div
                          key={m.id}
                          className="bg-rose-50 border border-rose-300 text-rose-900 px-3 py-1.5 rounded-xl text-xs"
                        >
                          <div className="font-extrabold">
                            🔧 MAINTENANCE BLOCK
                          </div>
                          <div className="text-[11px]">{m.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: FLEET TRIP PDF REPORTS, ANALYTICS, AUDIT LOG & SETTINGS
         ===================================================================== */}
      {activeTab === "REPORTS_AND_AUDIT" && reportData && (
        <div className="space-y-6">
          {/* Report Generator Control Card */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="bg-[#E8F0FE] text-[#1428A0] text-xs font-extrabold px-3 py-1 rounded-full">
                PRD Section 6.9 & Section 14
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                Pusat Laporan Perjalanan Armada (Fleet Trip PDF & Excel Report)
              </h3>
              <p className="text-xs text-slate-500">
                Unduh laporan resmi berformat PDF siap cetak atau CSV/Excel
                dengan perbandingan Pemohon vs Penumpang Aktual (FR-053) dan EV
                vs Petrol (FR-055).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={reportPowertrain}
                onChange={(e) => setReportPowertrain(e.target.value)}
                className="px-4 py-2.5 rounded-full bg-[#F4F6FA] border border-slate-200 text-xs font-bold text-slate-800"
              >
                <option value="ALL">Semua Powertrain (EV + Petrol)</option>
                <option value="EV">Khusus Mobil Listrik (EV)</option>
                <option value="PETROL">Khusus Mobil Bensin (Petrol)</option>
              </select>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Cetak PDF Fleet Trip Report</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="px-5 py-3 rounded-full bg-[#F4F6FA] hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Export CSV / Excel (FR-056)</span>
              </button>
            </div>
          </div>

          {/* EV vs Petrol Usage Comparison Cards (FR-055) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportData.powertrainComparison.map((pt) => (
              <div
                key={pt.powertrain}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-extrabold uppercase text-[#0066FF]">
                    Performa Armada {pt.powertrain} (FR-055)
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {pt.distanceKm.toLocaleString("id-ID")} KM Tempuh
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Total {pt.trips} Perjalanan • {pt.hours} Jam Operasional •{" "}
                    {pt.vehiclesCount} Unit Kendaraan
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#E8F0FE] text-[#1428A0] flex items-center justify-center">
                  {pt.powertrain === "EV" ? (
                    <Zap className="w-7 h-7" />
                  ) : (
                    <Fuel className="w-7 h-7" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Requester vs Actual User Comparison Table (FR-053) */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900 mb-1">
              Tabel Audit Perjalanan: Pemohon (Requester) vs Penumpang Aktual
              (FR-053)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Setiap ketidakcocokan antara pemohon awal dan penumpang aktual yang
              dicatat driver saat Check-Out ditandai khusus.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase">
                    <th className="py-3 px-3">Booking</th>
                    <th className="py-3 px-3">Kendaraan & Driver</th>
                    <th className="py-3 px-3">Pemohon Awal</th>
                    <th className="py-3 px-3">Penumpang Aktual (FR-028)</th>
                    <th className="py-3 px-3">Status Audit</th>
                    <th className="py-3 px-3">Odometer & Jarak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {reportData.tripComparisonReport.map((t) => (
                    <tr
                      key={t.bookingNo}
                      className={
                        !t.requesterMatched ? "bg-rose-50/70" : "hover:bg-slate-50"
                      }
                    >
                      <td className="py-3 px-3 font-extrabold text-[#1428A0]">
                        {t.bookingNo}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {t.destination}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold">{t.vehiclePlate}</div>
                        <div className="text-slate-500">{t.driverName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold">{t.requesterName}</div>
                        <div className="text-slate-500">
                          {t.requesterDepartment}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {t.actualUsers.join(", ")}
                      </td>
                      <td className="py-3 px-3">
                        {t.requesterMatched ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                            SESUAI
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-extrabold text-[11px]">
                            MISMATCH (!)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold">
                        {t.distanceKm} km ({t.odoStart.toLocaleString("id-ID")}{" "}
                        → {t.odoEnd ? t.odoEnd.toLocaleString("id-ID") : "Aktif"}
                        )
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Audit Log (S-A2, FR-013, NFR-006) */}
          <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900 mb-1 flex items-center gap-2">
              <History className="w-5 h-5 text-[#1428A0]" />
              <span>Audit Log Sistem (S-A2 — Immutable Security Trail)</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Seluruh tindakan persetujuan, perubahan role, penambahan mobil,
              dan eksekusi perjalanan tercatat permanen dan tidak dapat diedit
              (FR-013 / NFR-006).
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {reportData.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F4F6FA] border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#1428A0] bg-[#E8F0FE] px-2 py-0.5 rounded-md mr-2">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {log.summary}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {log.actorName} ({log.actorRole}) •{" "}
                    {new Date(log.at).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: BOOKING APPROVAL / REJECTION / ASSIGNMENT (S-G3)
         ===================================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200">
            <h4 className="text-xl font-extrabold text-slate-900">
              Keputusan Workplace Solution — {selectedBooking.bookingNo}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Pemohon: <strong>{selectedBooking.requesterName}</strong> • Tujuan:{" "}
              <strong>{selectedBooking.destination}</strong> (
              {selectedBooking.passengers} penumpang)
            </p>

            <form
              onSubmit={handleBookingDecisionSubmit}
              className="space-y-4 mt-5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tindakan Workplace Solution Admin
                </label>
                <select
                  value={decisionAction}
                  onChange={(e) =>
                    setDecisionAction(
                      e.target.value as typeof decisionAction
                    )
                  }
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                >
                  <option value="APPROVE">
                    Setujui & Tugaskan Mobil + Driver (FR-008)
                  </option>
                  <option value="REASSIGN">
                    Pindahkan Unit / Jadwal Ulang (FR-021)
                  </option>
                  <option value="OVERRIDE">
                    Override Prioritas Mendesak (FR-022)
                  </option>
                  <option value="REVISION">
                    Minta Revisi ke Pemohon (FR-010)
                  </option>
                  <option value="REJECT">
                    Tolak Permintaan — Wajib Alasan (FR-009)
                  </option>
                </select>
              </div>

              {(decisionAction === "APPROVE" ||
                decisionAction === "REASSIGN" ||
                decisionAction === "OVERRIDE") && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Kendaraan Operasional ({selectedBooking.passengers}{" "}
                      kursi dibutuhkan) *
                    </label>
                    <select
                      required
                      value={assignVehicleId}
                      onChange={(e) => setAssignVehicleId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-semibold"
                    >
                      {vehicles
                        .filter(
                          (v) =>
                            v.status !== "OUT_OF_SERVICE" &&
                            v.seats >= selectedBooking.passengers
                        )
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plateNo} — {v.model} ({v.powertrain}, {v.seats}{" "}
                            kursi, Baterai/BBM {v.currentLevel}%) [{v.status}]
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Pengemudi (Company Driver) *
                    </label>
                    <select
                      required
                      value={assignDriverId}
                      onChange={(e) => setAssignDriverId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-semibold"
                    >
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.phone}) — [{d.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Alasan Keputusan{" "}
                  {(decisionAction === "REJECT" ||
                    decisionAction === "REVISION" ||
                    decisionAction === "OVERRIDE") &&
                    "(WAJIB DIISI) *"}
                </label>
                <textarea
                  rows={2}
                  required={
                    decisionAction === "REJECT" ||
                    decisionAction === "REVISION" ||
                    decisionAction === "OVERRIDE"
                  }
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Masukkan catatan persetujuan atau alasan penolakan/revisi..."
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold"
                >
                  Simpan Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CAR TYPE (Gojek-style Option) */}
      {showAddCarType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200">
            <h4 className="text-xl font-extrabold text-slate-900">
              Tambah Kategori Tipe Mobil Baru (Gojek-Style Selector)
            </h4>
            <form onSubmit={handleCreateCarType} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Tipe Mobil *
                  </label>
                  <input
                    type="text"
                    required
                    value={ctName}
                    onChange={(e) => setCtName(e.target.value)}
                    placeholder="Contoh: CareCar Hiace Van"
                    className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Unik *
                  </label>
                  <input
                    type="text"
                    required
                    value={ctCode}
                    onChange={(e) => setCtCode(e.target.value)}
                    placeholder="HIACE_VAN"
                    className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Powertrain
                  </label>
                  <select
                    value={ctPowertrain}
                    onChange={(e) =>
                      setCtPowertrain(
                        e.target.value as "EV" | "PETROL" | "HYBRID"
                      )
                    }
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    <option value="EV">EV (Listrik)</option>
                    <option value="PETROL">PETROL (Bensin)</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={ctSeats}
                    onChange={(e) => setCtSeats(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Range (KM)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1200}
                    value={ctRange}
                    onChange={(e) => setCtRange(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teks Badge (Muncul di Kartu Gojek UI) *
                </label>
                <input
                  type="text"
                  required
                  value={ctBadge}
                  onChange={(e) => setCtBadge(e.target.value)}
                  placeholder="Contoh: Rombongan Tim • 12 Kursi"
                  className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Singkat *
                </label>
                <input
                  type="text"
                  required
                  value={ctDesc}
                  onChange={(e) => setCtDesc(e.target.value)}
                  placeholder="Contoh: Kendaraan rombongan besar untuk site visit pabrik"
                  className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCarType(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan Tipe Mobil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW VEHICLE (FR-014) */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200">
            <h4 className="text-xl font-extrabold text-slate-900">
              Tambah Unit Kendaraan Operasional Baru (FR-014)
            </h4>
            <form onSubmit={handleCreateVehicle} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Plat *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value)}
                    placeholder="B 1099 WSE"
                    className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Model Kendaraan *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    placeholder="Hyundai Ioniq 5 / Stargazer"
                    className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Tipe Mobil *
                  </label>
                  <select
                    value={vehCarTypeId}
                    onChange={(e) => setVehCarTypeId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    {carTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Powertrain *
                  </label>
                  <select
                    value={vehPowertrain}
                    onChange={(e) =>
                      setVehPowertrain(e.target.value as "EV" | "PETROL")
                    }
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    <option value="EV">EV (Listrik)</option>
                    <option value="PETROL">PETROL (Bensin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kursi Penumpang
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={vehSeats}
                    onChange={(e) => setVehSeats(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usable Range (KM)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1200}
                    value={vehRange}
                    onChange={(e) => setVehRange(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Odometer Awal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={vehOdo}
                    onChange={(e) => setVehOdo(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Tambahkan ke Armada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE STATUS / RANGE / CHARGE */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900">
              Edit Kendaraan {editingVehicle.plateNo}
            </h4>
            <form
              onSubmit={handleUpdateVehicleSubmit}
              className="space-y-3.5 mt-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Model
                </label>
                <input
                  type="text"
                  required
                  value={editVehModel}
                  onChange={(e) => setEditVehModel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Kendaraan (FR-015)
                </label>
                <select
                  value={editVehStatus}
                  onChange={(e) =>
                    setEditVehStatus(e.target.value as VehicleStatus)
                  }
                  className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                >
                  <option value="AVAILABLE">AVAILABLE (Siap Dipesan)</option>
                  <option value="IN_USE">IN_USE (Sedang Dipakai)</option>
                  <option value="MAINTENANCE">
                    MAINTENANCE (Perawatan Bengkel)
                  </option>
                  <option value="OUT_OF_SERVICE">
                    OUT_OF_SERVICE (Nonaktif Sementara)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Range (KM)
                  </label>
                  <input
                    type="number"
                    value={editVehRange}
                    onChange={(e) => setEditVehRange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Baterai/BBM (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editVehLevel}
                    onChange={(e) => setEditVehLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={editVehSeats}
                    onChange={(e) => setEditVehSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MAINTENANCE BLOCK (FR-016) */}
      {showAddMaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900">
              Jadwalkan Maintenance Block (FR-016)
            </h4>
            <form
              onSubmit={handleCreateMaintenance}
              className="space-y-3.5 mt-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Kendaraan
                </label>
                <select
                  value={maintVehId}
                  onChange={(e) => setMaintVehId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNo} — {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mulai Maintenance
                </label>
                <input
                  type="datetime-local"
                  required
                  value={maintStart}
                  onChange={(e) => setMaintStart(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selesai Maintenance
                </label>
                <input
                  type="datetime-local"
                  required
                  value={maintEnd}
                  onChange={(e) => setMaintEnd(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Perawatan / Servis *
                </label>
                <input
                  type="text"
                  required
                  value={maintReason}
                  onChange={(e) => setMaintReason(e.target.value)}
                  placeholder="Contoh: Servis berkala 20.000 KM Hyundai"
                  className="w-full px-3.5 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMaint(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan Blokir Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRE-APPROVED USER / DRIVER BY WORKPLACE ADMIN */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900">
              Tambah Akun Pengguna / Driver Baru
            </h4>
            <form onSubmit={handleAddUserSubmit} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID Karyawan (NIK) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserEmpNo}
                    onChange={(e) => setNewUserEmpNo(e.target.value)}
                    placeholder="EMP-108 / DRV-205"
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran (Role) *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="DRIVER">DRIVER</option>
                    <option value="WORKPLACE_ADMIN">WORKPLACE_ADMIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Perusahaan *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="text"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Buat & Aktifkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
