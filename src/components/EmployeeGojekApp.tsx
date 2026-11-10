"use client";

import React, { useState } from "react";
import {
  Car,
  Zap,
  MapPin,
  Calendar,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Bell,
  Send,
  Edit3,
  ArrowRight,
  ArrowLeft,
  PhoneCall,
  Minus,
  Plus,
  Search,
  Home,
  Compass,
  User as UserIcon,
  ShieldCheck,
  FileText,
  Radio,
  LogOut,
  Lock,
  Mail,
  Building2,
  BadgeCheck,
  Eye,
  EyeOff,
  Play,
} from "lucide-react";
import {
  Booking,
  CarType,
  Driver,
  MaintenanceBlock,
  NotificationItem,
  SafeUser,
  SystemSettings,
  Vehicle,
} from "@/lib/types";
import WorkplaceAdminDashboard from "./WorkplaceAdminDashboard";
import DriverTripApp from "./DriverTripApp";

interface EmployeeGojekAppProps {
  user: SafeUser;
  bookings: Booking[];
  carTypes: CarType[];
  vehicles: Vehicle[];
  drivers: Driver[];
  maintenanceBlocks: MaintenanceBlock[];
  allUsers: SafeUser[];
  notifications: NotificationItem[];
  settings: SystemSettings;
  onRefresh: () => void;
  onUserUpdated: (u: SafeUser) => void;
  onLogout: () => void;
}

export default function EmployeeGojekApp({
  user,
  bookings,
  carTypes,
  vehicles,
  drivers,
  maintenanceBlocks,
  allUsers,
  notifications,
  settings,
  onRefresh,
  onUserUpdated,
  onLogout,
}: EmployeeGojekAppProps) {
  const isAdmin =
    user.role === "WORKPLACE_ADMIN" || user.role === "SUPER_ADMIN";
  const isDriver = user.role === "DRIVER";

  // Gojek Main Bottom Tabs + Ride Booking Sheet
  const [activeTab, setActiveTab] = useState<
    "HOME" | "GOCAR_BOOKING" | "ACTIVITY" | "CHAT" | "ADMIN_WS" | "PROFILE"
  >("HOME");

  const defaultStart = new Date(Date.now() + 3 * 3600_000)
    .toISOString()
    .slice(0, 16);
  const defaultEnd = new Date(Date.now() + 6 * 3600_000)
    .toISOString()
    .slice(0, 16);

  const activeCarTypes = carTypes.filter((c) => c.active);
  const [selectedCarTypeId, setSelectedCarTypeId] = useState<string>(
    activeCarTypes[0]?.id || ""
  );
  const [pickupLocation, setPickupLocation] = useState(
    "Lobby Utama Kantor Pusat"
  );
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [passengers, setPassengers] = useState(2);
  const [estDistanceKm, setEstDistanceKm] = useState(25);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<
    { startAt: string; endAt: string; label: string }[]
  >([]);

  // Edit booking modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDest, setEditDest] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [editPax, setEditPax] = useState(2);
  const [editDist, setEditDist] = useState(30);

  // WhatsApp Bot Simulator state
  const [waPhone] = useState(user.phone || "0812800101");
  const [waInput, setWaInput] = useState("");
  const [waMessages, setWaMessages] = useState<
    { id: string; sender: "USER" | "BOT"; text: string; at: string }[]
  >([
    {
      id: "init-1",
      sender: "BOT",
      text: `Halo ${user.name.split(" ")[0]} 👋\nKetik *1* Pesan Mobil, *2* Cek Pesanan, atau *3* Batalkan.`,
      at: new Date().toISOString(),
    },
  ]);
  const [waLoading, setWaLoading] = useState(false);

  // Profile Form State
  const [profName, setProfName] = useState(user.name);
  const [profEmpNo, setProfEmpNo] = useState(user.employeeNo);
  const [profEmail, setProfEmail] = useState(user.email);
  const [profPhone, setProfPhone] = useState(user.phone);
  const [profDept, setProfDept] = useState(user.department);
  const [profCurrPass, setProfCurrPass] = useState("");
  const [profNewPass, setProfNewPass] = useState("");
  const [showProfPass, setShowProfPass] = useState(false);
  const [profLoading, setProfLoading] = useState(false);
  const [profFeedback, setProfFeedback] = useState<{
    type: "OK" | "ERR";
    text: string;
  } | null>(null);

  const selectedCarType =
    activeCarTypes.find((c) => c.id === selectedCarTypeId) || activeCarTypes[0];

  const requiredEvRange = Math.ceil(
    estDistanceKm * (settings?.evRangeBufferMultiplier || 1.2)
  );
  const showEvRangeWarning =
    selectedCarType?.powertrain === "EV" &&
    requiredEvRange > (selectedCarType?.defaultRangeKm || 350);

  const availableUnitsCount = vehicles.filter(
    (v) => v.status === "AVAILABLE"
  ).length;
  const myBookings = isAdmin
    ? bookings
    : bookings.filter((b) => b.requesterId === user.id);
  const activeOrdersCount = myBookings.filter(
    (b) =>
      b.status === "PENDING_APPROVAL" ||
      b.status === "CONFIRMED" ||
      b.status === "IN_PROGRESS"
  ).length;
  const pendingAdminCount =
    bookings.filter((b) => b.status === "PENDING_APPROVAL").length +
    allUsers.filter((u) => u.status === "PENDING_APPROVAL").length;

  function openGoCarWithType(carTypeId?: string) {
    if (carTypeId) setSelectedCarTypeId(carTypeId);
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab("GOCAR_BOOKING");
  }

  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAlternatives([]);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          pickupLocation,
          destination,
          purpose,
          passengers,
          estDistanceKm,
          preferredCarTypeId: selectedCarType?.id || null,
          preferredPowertrain:
            selectedCarType?.powertrain === "EV"
              ? "EV"
              : selectedCarType?.powertrain === "PETROL"
              ? "PETROL"
              : "ANY",
          channel: "APP",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal memproses pesanan.");
        if (Array.isArray(data.alternatives)) {
          setAlternatives(data.alternatives);
        }
      } else {
        setSuccessMsg("Pesanan CareCar berhasil diajukan!");
        setDestination("");
        setPurpose("");
        onRefresh();
        setTimeout(() => {
          setSuccessMsg(null);
          setActiveTab("ACTIVITY");
        }, 1200);
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          action: "EMPLOYEE_CANCEL",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membatalkan pesanan.");
      } else {
        onRefresh();
      }
    } catch {
      alert("Gagal menghubungi server.");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: editingBooking.id,
          action: "EMPLOYEE_EDIT",
          destination: editDest,
          purpose: editPurpose,
          passengers: editPax,
          estDistanceKm: editDist,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menyimpan perubahan.");
      } else {
        setEditingBooking(null);
        onRefresh();
      }
    } catch {
      alert("Gagal menyimpan perubahan.");
    }
  }

  async function handleSendWhatsApp(customText?: string) {
    const msgToSend = customText ?? waInput;
    if (!msgToSend.trim()) return;
    setWaLoading(true);
    setWaInput("");

    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: waPhone,
          message: msgToSend,
        }),
      });
      const data = await res.json();
      if (data.session?.messages) {
        setWaMessages(data.session.messages);
        onRefresh();
      }
    } catch {
      // ignore
    } finally {
      setWaLoading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfLoading(true);
    setProfFeedback(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profName,
          employeeNo: profEmpNo,
          email: profEmail,
          phone: profPhone,
          department: profDept,
          currentPassword: profCurrPass || undefined,
          newPassword: profNewPass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfFeedback({
          type: "ERR",
          text: data.error || "Gagal menyimpan profil.",
        });
      } else if (data.user) {
        setProfFeedback({
          type: "OK",
          text: "Profil & akun berhasil diperbarui!",
        });
        setProfCurrPass("");
        setProfNewPass("");
        onUserUpdated(data.user);
      }
    } catch {
      setProfFeedback({ type: "ERR", text: "Gagal menghubungi server." });
    } finally {
      setProfLoading(false);
    }
  }

  function renderStatusBadge(status: Booking["status"]) {
    const styles: Record<string, string> = {
      PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
      CONFIRMED: "bg-[#EEF4FF] text-[#1428A0] border-blue-200",
      IN_PROGRESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
      COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
      REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
      REVISION_NEEDED: "bg-orange-50 text-orange-700 border-orange-200",
      CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
      EXPIRED: "bg-slate-100 text-slate-400 border-slate-200",
      NO_SHOW: "bg-rose-50 text-rose-700 border-rose-200",
    };

    const labels: Record<string, string> = {
      PENDING_APPROVAL: "Menunggu WS",
      CONFIRMED: "Disetujui",
      IN_PROGRESS: "On Trip (GPS)",
      COMPLETED: "Selesai",
      REJECTED: "Ditolak",
      REVISION_NEEDED: "Revisi",
      CANCELLED: "Batal",
      EXPIRED: "Expired",
      NO_SHOW: "No-Show",
    };

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
          styles[status] || "bg-slate-100 text-slate-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F8] flex justify-center">
      {/* Authentic Gojek Mobile Super-App Container */}
      <div
        className={`w-full ${
          activeTab === "ADMIN_WS" ? "max-w-4xl" : "max-w-[460px]"
        } min-h-screen bg-[#F7F9FC] sm:shadow-[0_12px_50px_rgba(15,23,42,0.1)] sm:border-x sm:border-slate-200/80 flex flex-col justify-between pb-20 relative transition-all`}
      >
        {/* =================================================================
            SCREEN 1: GOJEK HOME SCREEN (BERANDA)
           ================================================================= */}
        {activeTab === "HOME" && (
          <div className="space-y-4 pb-6">
            {/* 1. Gojek Top Search Bar + Profile Avatar Header */}
            <div className="bg-white px-4 pt-4 pb-3 sticky top-0 z-30 border-b border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => openGoCarWithType()}
                className="flex-1 bg-slate-100 hover:bg-slate-200/70 transition rounded-full px-4 py-2.5 flex items-center gap-2.5 text-left"
              >
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-500 truncate">
                  Mau perjalanan dinas ke mana?
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PROFILE")}
                title="Profil Saya"
                className="w-10 h-10 rounded-full bg-[#1428A0] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm relative"
              >
                {user.name.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
              </button>
            </div>

            <div className="px-4 space-y-4">
              {/* 2. Gojek "GoPay"-Style Blue Wallet / Fleet Status Bar */}
              <div className="bg-gradient-to-r from-[#1428A0] to-[#0055DF] rounded-[22px] p-3.5 text-white shadow-md shadow-blue-900/15 flex items-center justify-between gap-3">
                {/* Left White Balance-Style Card */}
                <button
                  type="button"
                  onClick={() => openGoCarWithType()}
                  className="bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 text-left min-w-[138px] shadow-xs"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#1428A0] uppercase">
                    <Car className="w-3.5 h-3.5 text-[#0066FF]" />
                    <span>Armada Ready</span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">
                    {availableUnitsCount} / {vehicles.length} Mobil
                  </div>
                  <div className="text-[10px] font-bold text-[#0066FF] mt-0.5">
                    Klik untuk pesan →
                  </div>
                </button>

                {/* Right 3 Gojek Quick-Action Squircle Icons */}
                <div className="flex items-center justify-around flex-1 gap-1">
                  <button
                    type="button"
                    onClick={() => openGoCarWithType()}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center text-white transition">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold">Pesan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("ACTIVITY")}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center text-white transition">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold">Riwayat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(isAdmin ? "ADMIN_WS" : "CHAT")
                    }
                    className="flex flex-col items-center gap-1 group relative"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center text-white transition">
                      {isAdmin ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold">
                      {isAdmin ? "Panel WS" : "Chat WA"}
                    </span>
                    {isAdmin && pendingAdminCount > 0 && (
                      <span className="absolute -top-1 right-1 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                        {pendingAdminCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Gojek Circular/Squircle Service Icons Grid */}
              <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] border border-slate-100">
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {/* Dynamic Car Types from DB rendered as Gojek Service Icons */}
                  {activeCarTypes.slice(0, 2).map((ct) => (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => openGoCarWithType(ct.id)}
                      className="flex flex-col items-center text-center group"
                    >
                      <div
                        className={`w-13 h-13 rounded-[20px] flex items-center justify-center mb-1.5 relative shadow-xs transition group-active:scale-95 ${
                          ct.powertrain === "EV"
                            ? "bg-[#EEF4FF] text-[#1428A0]"
                            : "bg-blue-50 text-[#0066FF]"
                        }`}
                      >
                        {ct.powertrain === "EV" ? (
                          <Zap className="w-6 h-6 text-[#0066FF]" />
                        ) : (
                          <Car className="w-6 h-6 text-[#1428A0]" />
                        )}
                        <span className="absolute -top-1 -right-1 bg-[#1428A0] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
                          {ct.powertrain === "EV" ? "EV" : `${ct.seats}K`}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-1">
                        {ct.name.replace("Operasional", "")}
                      </span>
                    </button>
                  ))}

                  {/* WhatsApp Bot Service Icon */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("CHAT")}
                    className="flex flex-col items-center text-center group"
                  >
                    <div className="w-13 h-13 rounded-[20px] bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95">
                      <PhoneCall className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">
                      WA Bot
                    </span>
                  </button>

                  {/* Activity / Schedule Service Icon */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("ACTIVITY")}
                    className="flex flex-col items-center text-center group relative"
                  >
                    <div className="w-13 h-13 rounded-[20px] bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">
                      Pesanan
                    </span>
                  </button>

                  {/* Additional Admin Service Icons if Workplace Solution Admin */}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveTab("ADMIN_WS")}
                        className="flex flex-col items-center text-center group relative"
                      >
                        <div className="w-13 h-13 rounded-[20px] bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95 relative">
                          <CheckCircle2 className="w-6 h-6" />
                          {pendingAdminCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                              {pendingAdminCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">
                          Approval
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("ADMIN_WS")}
                        className="flex flex-col items-center text-center group"
                      >
                        <div className="w-13 h-13 rounded-[20px] bg-indigo-50 text-[#1428A0] flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95">
                          <Car className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">
                          Kelola Mobil
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("ADMIN_WS")}
                        className="flex flex-col items-center text-center group"
                      >
                        <div className="w-13 h-13 rounded-[20px] bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95">
                          <Users className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">
                          Kelola User
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("ADMIN_WS")}
                        className="flex flex-col items-center text-center group"
                      >
                        <div className="w-13 h-13 rounded-[20px] bg-cyan-50 text-[#0066FF] flex items-center justify-center mb-1.5 shadow-xs transition group-active:scale-95">
                          <FileText className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">
                          PDF Report
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 4. Quick Destination Shortcuts (Gojek "Pergi lagi ke sini" Card) */}
              <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900">
                    Tujuan Dinas Populer
                  </h3>
                  <button
                    type="button"
                    onClick={() => openGoCarWithType()}
                    className="text-[11px] font-bold text-[#0066FF]"
                  >
                    Pesan Sekarang →
                  </button>
                </div>

                <div className="space-y-1.5">
                  {[
                    {
                      place: "Pacific Place SCBD, Jakarta Selatan",
                      km: 18,
                    },
                    {
                      place: "Bandara Soekarno-Hatta Terminal 3",
                      km: 35,
                    },
                    {
                      place: "Kawasan Industri Jababeka Cikarang",
                      km: 52,
                    },
                  ].map((item) => (
                    <button
                      key={item.place}
                      type="button"
                      onClick={() => {
                        setDestination(item.place);
                        setEstDistanceKm(item.km);
                        openGoCarWithType();
                      }}
                      className="w-full p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-left transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#EEF4FF] text-[#1428A0] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.place}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">
                        ~{item.km} km
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Active Bookings / Driver Tasks Preview Card */}
              {isDriver ? (
                <DriverTripApp
                  user={user}
                  bookings={bookings}
                  vehicles={vehicles}
                  employees={allUsers.map((u) => ({
                    id: u.id,
                    employeeNo: u.employeeNo,
                    name: u.name,
                    department: u.department,
                  }))}
                  onRefresh={onRefresh}
                />
              ) : (
                myBookings.slice(0, 2).length > 0 && (
                  <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-slate-900">
                        Perjalanan Terkini
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("ACTIVITY")}
                        className="text-[11px] font-bold text-[#0066FF]"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    {myBookings.slice(0, 2).map((bk) => (
                      <div
                        key={bk.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-[#1428A0]">
                              {bk.bookingNo}
                            </span>
                            {renderStatusBadge(bk.status)}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate mt-1">
                            {bk.destination}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(bk.startAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {bk.vehiclePlate ? ` • ${bk.vehiclePlate}` : ""}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            SCREEN 2: GOJEK GOCAR MAP + BOTTOM SHEET BOOKING SCREEN
           ================================================================= */}
        {activeTab === "GOCAR_BOOKING" && (
          <div className="flex-1 flex flex-col justify-between bg-[#E6EEF8]">
            {/* Top Interactive-Style GoCar Street Map Area */}
            <div className="relative h-56 sm:h-64 bg-gradient-to-b from-[#DCE8FA] to-[#CFE0F8] overflow-hidden p-4 flex flex-col justify-between">
              {/* Stylized Street Grid */}
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#94A3B8_1px,transparent_1px),linear-gradient(to_bottom,#94A3B8_1px,transparent_1px)] [background-size:28px_28px]" />

              {/* Top Floating Back Button & Route Distance Pill */}
              <div className="relative z-10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("HOME")}
                  className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full shadow-sm text-[11px] font-extrabold text-[#1428A0]">
                  Estimasi Rute: {estDistanceKm} km
                </span>
              </div>

              {/* Animated Visual Route Pin Path */}
              <div className="relative z-10 my-auto px-4 flex items-center justify-between">
                <div className="bg-white px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 text-[10px] font-extrabold text-[#0066FF]">
                  <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  <span className="truncate max-w-[95px]">
                    {pickupLocation}
                  </span>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#1428A0] mx-2 relative flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-[#1428A0] text-white flex items-center justify-center shadow-md -mt-3.5">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="bg-white px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 text-[10px] font-extrabold text-rose-600">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[95px]">
                    {destination || "Tujuan"}
                  </span>
                </div>
              </div>
            </div>

            {/* Gojek Draggable-Style White Bottom Sheet */}
            <form
              onSubmit={handleCreateBooking}
              className="flex-1 bg-white rounded-t-[32px] -mt-5 relative z-20 shadow-[0_-10px_35px_rgba(15,23,42,0.08)] p-5 space-y-4"
            >
              {/* Drag Handle */}
              <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto -mt-1" />

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs space-y-2">
                  <div className="flex items-start gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  {alternatives.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {alternatives.map((alt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setStartAt(alt.startAt.slice(0, 16));
                            setEndAt(alt.endAt.slice(0, 16));
                            setErrorMsg(null);
                            setAlternatives([]);
                          }}
                          className="bg-white border border-rose-300 text-rose-900 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        >
                          {alt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Gojek Pickup & Destination Card */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF] shrink-0 ml-1" />
                  <input
                    type="text"
                    required
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="Lokasi penjemputan"
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="border-t border-slate-200/80 ml-5" />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Cari lokasi tujuan dinas..."
                    className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Gojek Car Type Selector List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900">
                    Pilih Armada CareCar
                  </span>
                  <span className="text-[11px] font-bold text-[#0066FF]">
                    {availableUnitsCount} Unit Ready
                  </span>
                </div>

                {activeCarTypes.map((ct) => {
                  const isSelected = selectedCarType?.id === ct.id;
                  const availableCount = vehicles.filter(
                    (v) => v.carTypeId === ct.id && v.status === "AVAILABLE"
                  ).length;

                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => setSelectedCarTypeId(ct.id)}
                      className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between gap-3 transition text-left ${
                        isSelected
                          ? "border-[#1428A0] bg-[#EEF4FF]/70"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            ct.powertrain === "EV"
                              ? "bg-[#1428A0] text-[#00C3FF]"
                              : "bg-[#0066FF] text-white"
                          }`}
                        >
                          {ct.powertrain === "EV" ? (
                            <Zap className="w-5 h-5" />
                          ) : (
                            <Car className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{ct.name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              {ct.seats} kursi
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ct.badgeText} • Maks {ct.defaultRangeKm} km
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            availableCount > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {availableCount} Ready
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact Schedule & Passengers */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">
                    Berangkat
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">
                    Kembali
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-slate-400">
                      Penumpang
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {passengers} Orang
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                      className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassengers((p) => Math.min(12, p + 1))}
                      className="w-6 h-6 rounded-full bg-[#1428A0] text-white flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">
                    Jarak PP (KM)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    required
                    value={estDistanceKm}
                    onChange={(e) => setEstDistanceKm(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70">
                <span className="block text-[9px] font-bold uppercase text-slate-400">
                  Agenda / Keperluan Dinas
                </span>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Contoh: Meeting Klien / Kunjungan Site"
                  className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {showEvRangeWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-2.5 text-[11px] font-medium">
                  Jarak tempuh melebihi batas aman baterai EV. Disarankan
                  memilih MPV Petrol.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-between px-6 transition disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? "Memproses..."
                    : `Pesan ${selectedCarType?.name || "CareCar"}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* =================================================================
            SCREEN 3: AKTIVITAS (PESANAN SAYA & TUGAS DRIVER)
           ================================================================= */}
        {activeTab === "ACTIVITY" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">
                Aktivitas Perjalanan
              </h2>
              <button
                type="button"
                onClick={() => openGoCarWithType()}
                className="px-3.5 py-1.5 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
              >
                + Pesan CareCar
              </button>
            </div>

            {(isDriver || isAdmin) && (
              <DriverTripApp
                user={user}
                bookings={bookings}
                vehicles={vehicles}
                employees={allUsers.map((u) => ({
                  id: u.id,
                  employeeNo: u.employeeNo,
                  name: u.name,
                  department: u.department,
                }))}
                onRefresh={onRefresh}
              />
            )}

            <div className="space-y-2.5">
              {myBookings.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-100">
                  Belum ada riwayat pesanan.
                </div>
              ) : (
                myBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-[#1428A0]">
                          {bk.bookingNo}
                        </span>
                        {renderStatusBadge(bk.status)}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(bk.startAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                      <div className="text-[11px] text-slate-500 truncate">
                        Jemput: {bk.pickupLocation}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        Tujuan: {bk.destination}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        {bk.passengers} Kursi • {bk.estDistanceKm} km
                      </span>
                      {bk.vehiclePlate && (
                        <span className="font-extrabold text-[#1428A0]">
                          {bk.vehiclePlate} ({bk.driverName})
                        </span>
                      )}
                    </div>

                    {(bk.status === "PENDING_APPROVAL" ||
                      bk.status === "REVISION_NEEDED" ||
                      bk.status === "CONFIRMED") && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        {(bk.status === "PENDING_APPROVAL" ||
                          bk.status === "REVISION_NEEDED") && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBooking(bk);
                              setEditDest(bk.destination);
                              setEditPurpose(bk.purpose);
                              setEditPax(bk.passengers);
                              setEditDist(bk.estDistanceKm);
                            }}
                            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Ubah</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(bk.id)}
                          className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold"
                        >
                          Batalkan
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            SCREEN 4: CHAT WA BOT & KOTAK MASUK NOTIFIKASI
           ================================================================= */}
        {activeTab === "CHAT" && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Chat & Kotak Masuk
            </h2>

            <div className="bg-white rounded-3xl shadow-xs border border-slate-100 overflow-hidden">
              <div className="bg-[#1428A0] px-4 py-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[#00C3FF]" />
                  <span className="font-extrabold text-xs">
                    WhatsApp Bot Workplace Solution
                  </span>
                </div>
                <div className="flex gap-1">
                  {["MENU", "1", "2", "3"].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => handleSendWhatsApp(cmd)}
                      className="bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 h-72 overflow-y-auto bg-slate-50 space-y-2">
                {waMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.sender === "USER" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs whitespace-pre-line ${
                        m.sender === "USER"
                          ? "bg-[#1428A0] text-white rounded-br-none"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendWhatsApp();
                }}
                className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                  placeholder="Ketik 1, 2, 3 atau pesan..."
                  className="flex-1 px-3.5 py-2 bg-slate-100 rounded-full text-xs font-semibold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={waLoading}
                  className="w-8 h-8 rounded-full bg-[#1428A0] text-white flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900">
                Notifikasi Terbaru ({notifications.length})
              </h3>
              {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-slate-50 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {n.title}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================
            SCREEN 5: WORKPLACE SOLUTION ADMIN PANEL (EMBEDDED IN GOJEK APP)
           ================================================================= */}
        {activeTab === "ADMIN_WS" && isAdmin && (
          <div className="p-4">
            <WorkplaceAdminDashboard
              currentUser={user}
              bookings={bookings}
              carTypes={carTypes}
              vehicles={vehicles}
              drivers={drivers}
              maintenanceBlocks={maintenanceBlocks}
              allUsers={allUsers}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {/* =================================================================
            SCREEN 6: GOJEK PROFILE & ACCOUNT SETTINGS SCREEN
           ================================================================= */}
        {activeTab === "PROFILE" && (
          <div className="p-4 space-y-4">
            {/* Top Gojek Profile Header Card */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-[#1428A0] text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {user.name}
                  </h2>
                  <p className="text-xs font-bold text-[#0066FF]">
                    {user.employeeNo} • {user.role}
                  </p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>

            {/* Edit Profile & Change Password Form */}
            <form
              onSubmit={handleProfileSave}
              className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-3.5"
            >
              <h3 className="text-sm font-extrabold text-slate-900">
                Ubah Profil & Kata Sandi
              </h3>

              {profFeedback && (
                <div
                  className={`rounded-2xl p-3 flex items-center gap-2 text-xs font-bold ${
                    profFeedback.type === "OK"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {profFeedback.type === "OK" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{profFeedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Username / ID
                  </label>
                  <div className="relative">
                    <BadgeCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={profEmpNo}
                      onChange={(e) => setProfEmpNo(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={profEmail}
                      onChange={(e) => setProfEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    No. WhatsApp
                  </label>
                  <div className="relative">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={profPhone}
                      onChange={(e) => setProfPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Departemen
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={profDept}
                    onChange={(e) => setProfDept(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    Ganti Password (Opsional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowProfPass(!showProfPass)}
                    className="text-[11px] font-bold text-[#0066FF] flex items-center gap-1"
                  >
                    {showProfPass ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>{showProfPass ? "Sembunyikan" : "Lihat"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showProfPass ? "text" : "password"}
                      value={profCurrPass}
                      onChange={(e) => setProfCurrPass(e.target.value)}
                      placeholder="Password saat ini"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showProfPass ? "text" : "password"}
                      value={profNewPass}
                      onChange={(e) => setProfNewPass(e.target.value)}
                      placeholder="Password baru (Min 8 kar)"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1428A0]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={profLoading}
                className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
              >
                {profLoading ? "Menyimpan..." : "Simpan Perubahan Profil"}
              </button>
            </form>
          </div>
        )}

        {/* =================================================================
            GOJEK STICKY BOTTOM NAVIGATION BAR
           ================================================================= */}
        <nav
          className={`fixed bottom-0 z-40 w-full ${
            activeTab === "ADMIN_WS" ? "max-w-4xl" : "max-w-[460px]"
          } bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe`}
        >
          <div
            className={`grid ${
              isAdmin ? "grid-cols-5" : "grid-cols-4"
            } h-16 px-2`}
          >
            <button
              type="button"
              onClick={() => setActiveTab("HOME")}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === "HOME" || activeTab === "GOCAR_BOOKING"
                  ? "text-[#1428A0]"
                  : "text-slate-400"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Beranda</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ACTIVITY")}
              className={`flex flex-col items-center justify-center gap-1 relative ${
                activeTab === "ACTIVITY" ? "text-[#1428A0]" : "text-slate-400"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Aktivitas</span>
              {activeOrdersCount > 0 && (
                <span className="absolute top-2 right-5 bg-[#0066FF] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CHAT")}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === "CHAT" ? "text-[#1428A0]" : "text-slate-400"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Chat</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("ADMIN_WS")}
                className={`flex flex-col items-center justify-center gap-1 relative ${
                  activeTab === "ADMIN_WS" ? "text-[#1428A0]" : "text-slate-400"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[10px] font-extrabold">Admin WS</span>
                {pendingAdminCount > 0 && (
                  <span className="absolute top-2 right-4 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingAdminCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("PROFILE")}
              className={`flex flex-col items-center justify-center gap-1 ${
                activeTab === "PROFILE" ? "text-[#1428A0]" : "text-slate-400"
              }`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Profil</span>
            </button>
          </div>
        </nav>

        {/* EDIT BOOKING MODAL */}
        {editingBooking && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3">
              <h4 className="text-base font-extrabold text-slate-900">
                Ubah Pesanan {editingBooking.bookingNo}
              </h4>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={editDest}
                  onChange={(e) => setEditDest(e.target.value)}
                  placeholder="Tujuan"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <input
                  type="text"
                  required
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="Keperluan"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editPax}
                    onChange={(e) => setEditPax(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    required
                    value={editDist}
                    onChange={(e) => setEditDist(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#1428A0] text-white text-xs font-bold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
