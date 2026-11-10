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
  PhoneCall,
  Minus,
  Plus,
  Route,
} from "lucide-react";
import {
  Booking,
  CarType,
  NotificationItem,
  SafeUser,
  SystemSettings,
  Vehicle,
} from "@/lib/types";

interface EmployeeGojekAppProps {
  user: SafeUser;
  bookings: Booking[];
  carTypes: CarType[];
  vehicles: Vehicle[];
  notifications: NotificationItem[];
  settings: SystemSettings;
  onRefresh: () => void;
}

export default function EmployeeGojekApp({
  user,
  bookings,
  carTypes,
  vehicles,
  notifications,
  settings,
  onRefresh,
}: EmployeeGojekAppProps) {
  const [activeTab, setActiveTab] = useState<
    "BOOK_CAR" | "MY_BOOKINGS" | "WHATSAPP_BOT" | "NOTIFICATIONS"
  >("BOOK_CAR");

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
  const [estDistanceKm, setEstDistanceKm] = useState(35);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<
    { startAt: string; endAt: string; label: string }[]
  >([]);

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDest, setEditDest] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [editPax, setEditPax] = useState(2);
  const [editDist, setEditDist] = useState(30);

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
  const activeOrdersCount = bookings.filter(
    (b) =>
      b.status === "PENDING_APPROVAL" ||
      b.status === "CONFIRMED" ||
      b.status === "IN_PROGRESS"
  ).length;

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
        setSuccessMsg("Pesanan terkirim ke Workplace Solution!");
        setDestination("");
        setPurpose("");
        onRefresh();
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
      IN_PROGRESS: "Dalam Perjalanan",
      COMPLETED: "Selesai",
      REJECTED: "Ditolak",
      REVISION_NEEDED: "Perlu Revisi",
      CANCELLED: "Dibatalkan",
      EXPIRED: "Kedaluwarsa",
      NO_SHOW: "No-Show",
    };

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
          styles[status] || "bg-slate-100 text-slate-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  }

  const navItems = [
    { id: "BOOK_CAR", label: "CareCar", icon: Car, badge: 0 },
    {
      id: "MY_BOOKINGS",
      label: "Pesanan",
      icon: Calendar,
      badge: activeOrdersCount,
    },
    { id: "WHATSAPP_BOT", label: "Chat WA", icon: MessageSquare, badge: 0 },
    {
      id: "NOTIFICATIONS",
      label: "Kotak Masuk",
      icon: Bell,
      badge: notifications.length,
    },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Gojek-Style Compact Wallet/Status Card */}
      <div className="bg-[#1428A0] rounded-3xl p-4 sm:p-5 text-white shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-blue-200 font-medium">
            {user.department}
          </div>
          <h2 className="text-base sm:text-lg font-extrabold truncate">
            Halo, {user.name.split(" ")[0]}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2 text-center border border-white/10">
            <div className="text-xs font-extrabold text-[#00C3FF]">
              {availableUnitsCount} Unit
            </div>
            <div className="text-[10px] text-blue-100">Tersedia</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2 text-center border border-white/10">
            <div className="text-xs font-extrabold text-white">
              {activeOrdersCount}
            </div>
            <div className="text-[10px] text-blue-100">Pesanan Aktif</div>
          </div>
        </div>
      </div>

      {/* Gojek 4-Service Icon Launcher (Desktop & Mobile Top Strip) */}
      <div className="bg-white rounded-3xl p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 grid grid-cols-4 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition relative ${
                active
                  ? "bg-[#EEF4FF] text-[#1428A0]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-1 transition ${
                  active
                    ? "bg-[#1428A0] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="absolute top-1.5 right-3 sm:right-6 bg-[#0066FF] text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: GOJEK GOCAR RIDE BOOKING UI
         ===================================================================== */}
      {activeTab === "BOOK_CAR" && (
        <form
          id="carecar-booking-form"
          onSubmit={handleCreateBooking}
          className="space-y-4"
        >
          {/* Visual Map & Floating Route Card (Gojek GoCar Style) */}
          <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 overflow-hidden">
            {/* Clean Stylized Route Map Header */}
            <div className="bg-gradient-to-br from-[#EEF4FF] via-[#E2ECFF] to-[#F5F7FB] px-5 py-4 relative border-b border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-[#1428A0]">
                <div className="flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-[#0066FF]" />
                  <span className="truncate max-w-[160px] sm:max-w-[240px]">
                    {pickupLocation || "Titik Jemput"}
                  </span>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#0066FF]/40 mx-3 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white text-[#1428A0] text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm border border-blue-100 whitespace-nowrap">
                    {estDistanceKm} km
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">
                    {destination || "Pilih Tujuan"}
                  </span>
                </div>
              </div>
            </div>

            {/* Pickup & Destination Input Box */}
            <div className="p-4 sm:p-5 space-y-3">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200/80 text-rose-800 rounded-2xl p-3.5 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{errorMsg}</span>
                  </div>

                  {alternatives.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200/80">
                      <div className="text-[11px] font-bold mb-1.5">
                        Jadwal alternatif tersedia:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
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
                            className="bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-full text-[11px] font-bold transition"
                          >
                            {alt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Gojek Dual Location Box */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Lokasi Jemput
                    </div>
                    <input
                      type="text"
                      required
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/80 ml-9" />

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Tujuan
                    </div>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Mau ke mana hari ini?"
                      className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Compact Schedule & Passengers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/70">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                    Waktu Berangkat
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/70">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                    Waktu Kembali
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stepper for Passengers + Distance + Purpose */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Penumpang
                    </div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {passengers} Orang
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassengers((p) => Math.min(12, p + 1))}
                      className="w-7 h-7 rounded-full bg-[#1428A0] text-white flex items-center justify-center hover:bg-[#0066FF]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/70">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">
                    Estimasi Jarak (PP)
                  </label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      min={1}
                      max={1500}
                      required
                      value={estDistanceKm}
                      onChange={(e) => setEstDistanceKm(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-400">km</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl px-3.5 py-2.5 border border-slate-200/70">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                  Keperluan Dinas
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Contoh: Meeting Klien SCBD / Kunjungan Pabrik"
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {showEvRangeWarning && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 flex items-center gap-2.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Jarak {estDistanceKm} km mendekati batas baterai EV (~
                    {selectedCarType?.defaultRangeKm} km). Disarankan memilih{" "}
                    <strong>MPV Petrol</strong>.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Gojek Bottom-Sheet Style Car Type Selector */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Pilih Tipe Kendaraan
              </h3>
              <span className="text-[11px] font-bold text-[#0066FF]">
                {availableUnitsCount} Unit Siap Jalan
              </span>
            </div>

            <div className="space-y-2">
              {activeCarTypes.map((ct) => {
                const isSelected = selectedCarType?.id === ct.id;
                const matchingVehicles = vehicles.filter(
                  (v) => v.carTypeId === ct.id
                );
                const availableCount = matchingVehicles.filter(
                  (v) => v.status === "AVAILABLE"
                ).length;
                const seatsTooSmall = passengers > ct.seats;

                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setSelectedCarTypeId(ct.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-[#0066FF] bg-[#EEF4FF]/60"
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                    } ${seatsTooSmall ? "opacity-55" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                            {ct.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                            <Users className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                            {ct.seats}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{ct.powertrain}</span>
                          <span>•</span>
                          <span>Range {ct.defaultRangeKm} km</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                          availableCount > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {availableCount} Ready
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-[#0066FF] bg-[#0066FF] text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sticky-like Order Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-900/15 transition flex items-center justify-between disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "Memproses..."
                      : `Pesan ${selectedCarType?.name || "CareCar"}`}
                  </span>
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <span>Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          TAB 2: MY BOOKINGS
         ===================================================================== */}
      {activeTab === "MY_BOOKINGS" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Pesanan Saya ({bookings.length})
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab("BOOK_CAR")}
              className="px-3.5 py-1.5 rounded-full bg-[#1428A0] text-white text-xs font-bold hover:bg-[#0066FF] transition"
            >
              + Pesan Baru
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-100">
              Belum ada riwayat pesanan.
            </div>
          ) : (
            bookings.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#1428A0]">
                      {bk.bookingNo}
                    </span>
                    {renderStatusBadge(bk.status)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(bk.startAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Navigation className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                    <span className="truncate">{bk.pickupLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{bk.destination}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    {bk.passengers} Penumpang • {bk.estDistanceKm} km •{" "}
                    {bk.purpose}
                  </span>
                  {bk.vehiclePlate && (
                    <span className="bg-[#EEF4FF] text-[#1428A0] font-bold px-2.5 py-1 rounded-full">
                      {bk.vehiclePlate} • {bk.driverName}
                    </span>
                  )}
                </div>

                {bk.decisionNote && (
                  <div className="text-xs bg-blue-50/70 text-[#1428A0] px-3 py-2 rounded-xl">
                    <strong>Catatan WS:</strong> {bk.decisionNote}
                  </div>
                )}

                {(bk.status === "PENDING_APPROVAL" ||
                  bk.status === "REVISION_NEEDED" ||
                  bk.status === "CONFIRMED") && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                        className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Ubah</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(bk.id)}
                      className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: WHATSAPP BOT SIMULATOR
         ===================================================================== */}
      {activeTab === "WHATSAPP_BOT" && (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 overflow-hidden">
          <div className="bg-[#1428A0] px-5 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-[#00C3FF]" />
              </div>
              <div>
                <div className="font-extrabold text-xs">
                  WhatsApp Bot Workplace Solution
                </div>
                <div className="text-[10px] text-blue-200">{waPhone}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {["MENU", "1", "2", "3"].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => handleSendWhatsApp(cmd)}
                  className="bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full text-[10px] font-bold"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 h-[340px] overflow-y-auto bg-slate-50 space-y-2.5">
            {waMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.sender === "USER" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-line ${
                    m.sender === "USER"
                      ? "bg-[#1428A0] text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm"
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
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={waInput}
              onChange={(e) => setWaInput(e.target.value)}
              placeholder="Ketik 1, 2, 3 atau pesan..."
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
            <button
              type="submit"
              disabled={waLoading}
              className="w-9 h-9 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 4: NOTIFICATIONS
         ===================================================================== */}
      {activeTab === "NOTIFICATIONS" && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-2.5">
          <h3 className="text-sm font-extrabold text-slate-900 px-1">
            Kotak Masuk ({notifications.length})
          </h3>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada notifikasi.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    {n.title}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(n.sentAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h4 className="text-base font-extrabold text-slate-900">
              Ubah Pesanan {editingBooking.bookingNo}
            </h4>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tujuan
                </label>
                <input
                  type="text"
                  required
                  value={editDest}
                  onChange={(e) => setEditDest(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Keperluan
                </label>
                <input
                  type="text"
                  required
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Penumpang
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editPax}
                    onChange={(e) => setEditPax(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jarak (km)
                  </label>
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

      {/* Native Android & iOS Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe">
        <div className="grid grid-cols-4 h-15 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 relative ${
                  active ? "text-[#1428A0]" : "text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-1.5 right-6 bg-[#0066FF] text-white text-[9px] font-extrabold min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
