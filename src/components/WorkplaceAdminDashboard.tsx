"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Car,
  Users,
  MapPin,
  Plus,
  Zap,
  Wrench,
  UserCheck,
  Radio,
  Clock,
  Edit3,
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
    | "USERS_AND_DRIVERS"
    | "FLEET_AND_TYPES"
    | "TIMELINE_AND_MAP"
    | "REPORTS_AND_AUDIT"
  >("APPROVAL_QUEUE");

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

  // Booking Decision Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [decisionAction, setDecisionAction] = useState<
    "APPROVE" | "REJECT" | "REVISION" | "OVERRIDE" | "REASSIGN"
  >("APPROVE");
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignDriverId, setAssignDriverId] = useState("");
  const [decisionReason, setDecisionReason] = useState("");

  // Add Car Type Modal
  const [showAddCarType, setShowAddCarType] = useState(false);
  const [ctName, setCtName] = useState("");
  const [ctCode, setCtCode] = useState("");
  const [ctPowertrain, setCtPowertrain] = useState<"EV" | "PETROL" | "HYBRID">(
    "EV"
  );
  const [ctSeats, setCtSeats] = useState(4);
  const [ctRange, setCtRange] = useState(380);
  const [ctBadge, setCtBadge] = useState("Eco EV");
  const [ctDesc, setCtDesc] = useState("");

  // Add Vehicle Modal
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehPlate, setVehPlate] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehCarTypeId, setVehCarTypeId] = useState(carTypes[0]?.id || "");
  const [vehPowertrain, setVehPowertrain] = useState<"EV" | "PETROL">("EV");
  const [vehSeats, setVehSeats] = useState(4);
  const [vehRange, setVehRange] = useState(380);
  const [vehOdo, setVehOdo] = useState(1000);

  // Edit Vehicle Modal
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehStatus, setEditVehStatus] =
    useState<VehicleStatus>("AVAILABLE");
  const [editVehRange, setEditVehRange] = useState(380);
  const [editVehLevel, setEditVehLevel] = useState(100);
  const [editVehSeats, setEditVehSeats] = useState(4);
  const [editVehModel, setEditVehModel] = useState("");

  // Maintenance Block Modal
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [maintVehId, setMaintVehId] = useState(vehicles[0]?.id || "");
  const [maintStart, setMaintStart] = useState(
    new Date(Date.now() + 12 * 3600_000).toISOString().slice(0, 16)
  );
  const [maintEnd, setMaintEnd] = useState(
    new Date(Date.now() + 36 * 3600_000).toISOString().slice(0, 16)
  );
  const [maintReason, setMaintReason] = useState("");

  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmpNo, setNewUserEmpNo] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("Commercial & Sales");
  const [newUserPhone, setNewUserPhone] = useState("0812900900");
  const [newUserRole, setNewUserRole] = useState<UserRole>("EMPLOYEE");
  const [newUserPass, setNewUserPass] = useState("");

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
          periodLabel: `Laporan Perjalanan (${
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
      setFeedback({
        type: "ERR",
        text: data.error || "Gagal memperbarui akun.",
      });
    } else {
      setFeedback({
        type: "OK",
        text: "Data pengguna berhasil diperbarui.",
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
        text: `Akun ${newUserName} (${newUserEmpNo}) berhasil dibuat.`,
      });
      setShowAddUser(false);
      setNewUserEmpNo("");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPass("");
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
        text: `Tipe mobil "${ctName}" berhasil ditambahkan.`,
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
        text: `Kendaraan ${vehPlate} berhasil ditambahkan.`,
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
        text: `Unit ${editingVehicle.plateNo} diperbarui.`,
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
      setFeedback({
        type: "OK",
        text: "Jadwal servis berhasil disimpan.",
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
      text: "Laporan PDF berhasil diunduh.",
    });
  }

  function handleDownloadCsv() {
    if (!reportData) return;
    exportFleetReportToCsv(reportData);
    setFeedback({
      type: "OK",
      text: "Laporan CSV berhasil diunduh.",
    });
  }

  const tabs = [
    {
      id: "APPROVAL_QUEUE",
      label: "Booking",
      badge: pendingBookings.length,
      icon: CheckCircle2,
    },
    {
      id: "USERS_AND_DRIVERS",
      label: "Pengguna",
      badge: pendingUsers.length,
      icon: Users,
    },
    {
      id: "FLEET_AND_TYPES",
      label: "Armada",
      badge: lowChargeVehicles.length,
      icon: Car,
    },
    {
      id: "TIMELINE_AND_MAP",
      label: "Live GPS",
      badge: activeGpsBookings.length,
      icon: MapPin,
    },
    {
      id: "REPORTS_AND_AUDIT",
      label: "Laporan",
      badge: 0,
      icon: FileText,
    },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Compact Executive Top Card */}
      <div className="bg-[#1428A0] rounded-3xl p-4 sm:p-5 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
              Workplace Solution Admin
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold">
              Manajemen Armada & Persetujuan
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-full bg-white text-[#1428A0] hover:bg-blue-50 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>PDF Report</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00C3FF]" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Clean 4-Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-blue-200 font-bold uppercase">
              Booking Pending
            </div>
            <div className="text-xl font-extrabold text-amber-300 mt-0.5">
              {pendingBookings.length}
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-blue-200 font-bold uppercase">
              Akun Pending
            </div>
            <div className="text-xl font-extrabold text-[#00C3FF] mt-0.5">
              {pendingUsers.length}
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-blue-200 font-bold uppercase">
              Trip Aktif (GPS)
            </div>
            <div className="text-xl font-extrabold text-emerald-300 mt-0.5">
              {activeGpsBookings.length}
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <div className="text-[10px] text-blue-200 font-bold uppercase">
              Total Armada
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {vehicles.length} Unit
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Pill Tabs */}
      <div className="bg-white p-1.5 rounded-full shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? "bg-[#1428A0] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#EEF4FF] text-[#1428A0]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-3.5 flex items-center justify-between gap-2 text-xs font-semibold border ${
            feedback.type === "OK"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "OK" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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
          TAB 1: BOOKING APPROVAL QUEUE & ALL BOOKINGS
         ===================================================================== */}
      {activeTab === "APPROVAL_QUEUE" && (
        <div className="space-y-4">
          {pendingUsers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {pendingUsers.length} pendaftaran akun baru menunggu
                  persetujuan.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("USERS_AND_DRIVERS")}
                className="px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs font-bold shrink-0"
              >
                Tinjau
              </button>
            </div>
          )}

          {/* Pending Requests */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Menunggu Persetujuan ({pendingBookings.length})
              </h3>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl text-xs text-slate-400">
                Semua permintaan booking sudah diproses.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-[#1428A0] text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {bk.bookingNo}
                        </span>
                        <span className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {bk.preferredCarTypeName || bk.preferredPowertrain}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {bk.passengers} org • {bk.estDistanceKm} km
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {bk.requesterName} →{" "}
                        <span className="text-[#0066FF]">{bk.destination}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0066FF]" />
                        <span>
                          {new Date(bk.startAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {bk.purpose}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openBookingDecisionModal(bk, "APPROVE")}
                        className="px-4 py-2 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold transition"
                      >
                        Setujui & Pilih Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => openBookingDecisionModal(bk, "REJECT")}
                        className="px-3.5 py-2 rounded-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Bookings List */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Semua Pesanan ({bookings.length})
            </h3>
            <div className="space-y-2">
              {bookings.map((bk) => (
                <div
                  key={bk.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1428A0]">
                        {bk.bookingNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                        {bk.status}
                      </span>
                      {bk.vehiclePlate && (
                        <span className="text-[#0066FF] font-bold">
                          {bk.vehiclePlate} ({bk.driverName})
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900">
                      {bk.requesterName} → {bk.destination}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(bk.startAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {bk.passengers} org • {bk.estDistanceKm} km
                    </div>
                  </div>

                  {bk.status === "CONFIRMED" && (
                    <button
                      type="button"
                      onClick={() => openBookingDecisionModal(bk, "REASSIGN")}
                      className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-[#0066FF] text-slate-700 font-bold text-[11px] self-start sm:self-center shrink-0"
                    >
                      Ubah Unit/Driver
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: USERS & DRIVERS
         ===================================================================== */}
      {activeTab === "USERS_AND_DRIVERS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Daftar Pengguna ({allUsers.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUser(true)}
                className="px-3.5 py-2 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white text-xs font-extrabold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akun</span>
              </button>
            </div>

            <div className="space-y-2">
              {allUsers.map((u) => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    u.status === "PENDING_APPROVAL"
                      ? "bg-amber-50/50 border-amber-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">
                        {u.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#1428A0]">
                        {u.employeeNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : u.status === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {u.email} • {u.department} • {u.phone}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={(e) =>
                        handleUserAction(
                          u.id,
                          "UPDATE_ROLE_AND_INFO",
                          e.target.value as UserRole
                        )
                      }
                      className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700"
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="DRIVER">DRIVER</option>
                      <option value="WORKPLACE_ADMIN">WORKPLACE_ADMIN</option>
                      {currentUser.role === "SUPER_ADMIN" && (
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      )}
                    </select>

                    {u.status === "PENDING_APPROVAL" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(u.id, "APPROVE", u.role)
                          }
                          className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-[11px]"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUserAction(
                              u.id,
                              "REJECT",
                              u.role,
                              "Ditolak oleh Workplace Solution"
                            )
                          }
                          className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px]"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {u.status === "ACTIVE" && u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleUserAction(u.id, "DEACTIVATE")}
                        className="px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 font-bold text-[11px]"
                      >
                        Nonaktifkan
                      </button>
                    )}

                    {(u.status === "DEACTIVATED" ||
                      u.status === "REJECTED") && (
                      <button
                        type="button"
                        onClick={() => handleUserAction(u.id, "ACTIVATE")}
                        className="px-3 py-1.5 rounded-full bg-[#EEF4FF] text-[#1428A0] font-bold text-[11px]"
                      >
                        Aktifkan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: FLEET & CAR TYPES
         ===================================================================== */}
      {activeTab === "FLEET_AND_TYPES" && (
        <div className="space-y-4">
          {/* Dynamic Gojek Car Types */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Kategori Tipe Mobil ({carTypes.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCarType(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#1428A0] text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tipe Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {carTypes.map((ct) => (
                <div
                  key={ct.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#1428A0] text-white flex items-center justify-center shrink-0">
                      {ct.powertrain === "EV" ? (
                        <Zap className="w-4 h-4 text-[#00C3FF]" />
                      ) : (
                        <Car className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 truncate">
                        {ct.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ct.powertrain} • {ct.seats} kursi • {ct.defaultRangeKm}{" "}
                        km
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCarTypeActive(ct)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      ct.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {ct.active ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicles List */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Unit Armada ({vehicles.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaint(true)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Jadwal Servis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#1428A0] text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Mobil</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-[#1428A0]">
                        {v.plateNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.status === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-700"
                            : v.status === "IN_USE"
                            ? "bg-blue-50 text-[#0066FF]"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {v.model}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {v.powertrain} • Level {v.currentLevel}% • Odo{" "}
                      {v.odometerKm.toLocaleString("id-ID")} km
                    </div>
                  </div>

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
                    className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#1428A0] shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: LIVE GPS & TIMELINE
         ===================================================================== */}
      {activeTab === "TIMELINE_AND_MAP" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Peta GPS Perjalanan Aktif ({activeGpsBookings.length})</span>
              </h3>
            </div>

            {activeGpsBookings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl text-xs text-slate-400">
                Tidak ada perjalanan aktif yang sedang membagikan GPS.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeGpsBookings.map((bk) => {
                  const lastGps =
                    bk.trip?.gpsPoints[bk.trip.gpsPoints.length - 1];
                  return (
                    <div
                      key={bk.id}
                      className="p-4 rounded-2xl bg-[#EEF4FF]/60 border border-blue-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-[#1428A0]">
                          {bk.vehiclePlate} • {bk.driverName}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          {lastGps?.speedKmh || 40} km/j
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Tujuan: {bk.destination} (Penumpang:{" "}
                        {bk.trip?.actualUsers.join(", ")})
                      </div>
                      {lastGps && (
                        <div className="text-xs text-[#0066FF] flex items-center gap-1.5 font-semibold">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Lokasi Terakhir: {lastGps.label} ({lastGps.lat},{" "}
                            {lastGps.lng})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {maintenanceBlocks.length > 0 && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Jadwal Servis Kendaraan ({maintenanceBlocks.length})
              </h3>
              {maintenanceBlocks.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[#1428A0]">
                      {m.vehiclePlate}
                    </span>{" "}
                    — {m.reason}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(m.startAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: REPORTS & AUDIT LOGS
         ===================================================================== */}
      {activeTab === "REPORTS_AND_AUDIT" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Laporan Perjalanan Armada
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={reportPowertrain}
                  onChange={(e) => setReportPowertrain(e.target.value)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-bold text-slate-700"
                >
                  <option value="ALL">Semua (EV & Petrol)</option>
                  <option value="EV">Khusus EV</option>
                  <option value="PETROL">Khusus Petrol</option>
                </select>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-4 py-1.5 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Unduh PDF
                </button>
              </div>
            </div>

            {reportData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Booking
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {reportData.kpis.totalBookings}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Trip Selesai
                  </div>
                  <div className="text-base font-extrabold text-emerald-700">
                    {reportData.kpis.completedTrips}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Total Jarak
                  </div>
                  <div className="text-base font-extrabold text-[#1428A0]">
                    {reportData.kpis.totalDistanceKm} km
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    SLA Approval
                  </div>
                  <div className="text-base font-extrabold text-[#0066FF]">
                    {reportData.kpis.medianApprovalHours} jam
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audit Logs */}
          {reportData?.auditLogs && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Log Aktivitas Terbaru
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {reportData.auditLogs.slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-bold text-[#1428A0]">
                        {log.actorName}
                      </span>{" "}
                      — {log.summary}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(log.at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODALS
         ===================================================================== */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h4 className="text-base font-extrabold text-slate-900">
              Keputusan Booking {selectedBooking.bookingNo}
            </h4>
            <form onSubmit={handleBookingDecisionSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tindakan
                </label>
                <select
                  value={decisionAction}
                  onChange={(e) =>
                    setDecisionAction(
                      e.target.value as typeof decisionAction
                    )
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="APPROVE">Setujui & Tugaskan Unit</option>
                  <option value="REASSIGN">Ubah Unit / Driver</option>
                  <option value="REVISION">Minta Revisi</option>
                  <option value="REJECT">Tolak Permintaan</option>
                </select>
              </div>

              {(decisionAction === "APPROVE" ||
                decisionAction === "REASSIGN" ||
                decisionAction === "OVERRIDE") && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Pilih Mobil
                    </label>
                    <select
                      value={assignVehicleId}
                      onChange={(e) => setAssignVehicleId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plateNo} — {v.model} ({v.seats} kursi,{" "}
                          {v.currentLevel}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Pilih Driver
                    </label>
                    <select
                      value={assignDriverId}
                      onChange={(e) => setAssignDriverId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.employeeNo}) — {d.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan / Alasan
                </label>
                <input
                  type="text"
                  required={
                    decisionAction === "REJECT" || decisionAction === "REVISION"
                  }
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Catatan untuk pemohon..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCarType && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Tambah Tipe Mobil Baru
            </h4>
            <form onSubmit={handleCreateCarType} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  placeholder="Nama (mis. CareCar VIP)"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="text"
                  required
                  value={ctCode}
                  onChange={(e) => setCtCode(e.target.value)}
                  placeholder="Kode (CARECAR_VIP)"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={ctPowertrain}
                  onChange={(e) =>
                    setCtPowertrain(
                      e.target.value as "EV" | "PETROL" | "HYBRID"
                    )
                  }
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="EV">EV</option>
                  <option value="PETROL">PETROL</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={ctSeats}
                  onChange={(e) => setCtSeats(Number(e.target.value))}
                  placeholder="Kursi"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="number"
                  min={50}
                  max={1200}
                  value={ctRange}
                  onChange={(e) => setCtRange(Number(e.target.value))}
                  placeholder="Range KM"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <input
                type="text"
                required
                value={ctBadge}
                onChange={(e) => setCtBadge(e.target.value)}
                placeholder="Label Badge (mis. Eco EV)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <input
                type="text"
                required
                value={ctDesc}
                onChange={(e) => setCtDesc(e.target.value)}
                placeholder="Deskripsi singkat"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCarType(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Tambah Kendaraan Baru
            </h4>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={vehPlate}
                  onChange={(e) => setVehPlate(e.target.value)}
                  placeholder="Plat (B 1099 SJE)"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="text"
                  required
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                  placeholder="Model Mobil"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={vehCarTypeId}
                  onChange={(e) => setVehCarTypeId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {carTypes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={vehPowertrain}
                  onChange={(e) =>
                    setVehPowertrain(e.target.value as "EV" | "PETROL")
                  }
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="EV">EV</option>
                  <option value="PETROL">PETROL</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={vehSeats}
                  onChange={(e) => setVehSeats(Number(e.target.value))}
                  placeholder="Kursi"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="number"
                  value={vehRange}
                  onChange={(e) => setVehRange(Number(e.target.value))}
                  placeholder="Range"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="number"
                  value={vehOdo}
                  onChange={(e) => setVehOdo(Number(e.target.value))}
                  placeholder="Odometer"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Edit Unit {editingVehicle.plateNo}
            </h4>
            <form onSubmit={handleUpdateVehicleSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={editVehModel}
                onChange={(e) => setEditVehModel(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editVehStatus}
                  onChange={(e) =>
                    setEditVehStatus(e.target.value as VehicleStatus)
                  }
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="IN_USE">IN_USE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editVehLevel}
                  onChange={(e) => setEditVehLevel(Number(e.target.value))}
                  placeholder="Level %"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Jadwalkan Servis Mobil
            </h4>
            <form onSubmit={handleCreateMaintenance} className="space-y-3">
              <select
                value={maintVehId}
                onChange={(e) => setMaintVehId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNo} — {v.model}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  required
                  value={maintStart}
                  onChange={(e) => setMaintStart(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <input
                  type="datetime-local"
                  required
                  value={maintEnd}
                  onChange={(e) => setMaintEnd(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <input
                type="text"
                required
                value={maintReason}
                onChange={(e) => setMaintReason(e.target.value)}
                placeholder="Alasan servis berkala"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaint(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Tambah Akun Pengguna Baru
            </h4>
            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newUserEmpNo}
                  onChange={(e) => setNewUserEmpNo(e.target.value)}
                  placeholder="NIK (EMP-108)"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="DRIVER">DRIVER</option>
                  <option value="WORKPLACE_ADMIN">WORKPLACE_ADMIN</option>
                </select>
              </div>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email Perusahaan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  placeholder="Departemen"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="No. WhatsApp"
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                placeholder="Password Awal (Min 8 karakter, Huruf Besar, Kecil & Angka)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
