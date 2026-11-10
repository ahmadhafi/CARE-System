"use client";

import React, { useState } from "react";
import {
  Car,
  Zap,
  Fuel,
  MapPin,
  Calendar,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Bell,
  Send,
  Edit3,
  ArrowRight,
  Sparkles,
  Shield,
  PhoneCall,
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

  // Default start time: +3 hours from now, end time: +6 hours
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
    "Samsung One Tower Lobby Utama, Sudirman"
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

  // Edit modal state (FR-005)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDest, setEditDest] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [editPax, setEditPax] = useState(2);
  const [editDist, setEditDist] = useState(30);

  // WhatsApp Bot Simulator state (FR-039 to FR-045)
  const [waPhone, setWaPhone] = useState(user.phone || "0812800101");
  const [waInput, setWaInput] = useState("");
  const [waMessages, setWaMessages] = useState<
    { id: string; sender: "USER" | "BOT"; text: string; at: string }[]
  >([
    {
      id: "init-1",
      sender: "BOT",
      text: `Halo ${user.name} 👋\nSelamat datang di Layanan WhatsApp CARE Workplace Solution.\nKetik *1* untuk Pesan Mobil, *2* untuk Lihat Booking Saya, atau *3* untuk Batalkan Booking.`,
      at: new Date().toISOString(),
    },
  ]);
  const [waLoading, setWaLoading] = useState(false);

  const selectedCarType =
    activeCarTypes.find((c) => c.id === selectedCarTypeId) || activeCarTypes[0];

  // FR-006: Live EV range warning check with 1.2x buffer
  const requiredEvRange = Math.ceil(
    estDistanceKm * (settings?.evRangeBufferMultiplier || 1.2)
  );
  const showEvRangeWarning =
    selectedCarType?.powertrain === "EV" &&
    requiredEvRange > (selectedCarType?.defaultRangeKm || 350);

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
        setErrorMsg(data.error || "Gagal mengirim permintaan pemesanan.");
        if (Array.isArray(data.alternatives)) {
          setAlternatives(data.alternatives);
        }
      } else {
        setSuccessMsg(
          data.message ||
            "Permintaan berhasil dikirim ke Workplace Solution Admin!"
        );
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
        alert(data.error || "Gagal membatalkan booking.");
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
      PENDING_APPROVAL: "bg-amber-100 text-amber-800 border-amber-300",
      CONFIRMED: "bg-blue-100 text-[#1428A0] border-blue-300",
      IN_PROGRESS: "bg-emerald-100 text-emerald-800 border-emerald-300",
      COMPLETED: "bg-slate-100 text-slate-700 border-slate-300",
      REJECTED: "bg-rose-100 text-rose-800 border-rose-300",
      REVISION_NEEDED: "bg-orange-100 text-orange-800 border-orange-300",
      CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
      EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
      NO_SHOW: "bg-rose-100 text-rose-800 border-rose-300",
    };

    const labels: Record<string, string> = {
      PENDING_APPROVAL: "Menunggu Workplace Solution",
      CONFIRMED: "Disetujui • Unit Siap",
      IN_PROGRESS: "Perjalanan Aktif (GPS ON)",
      COMPLETED: "Selesai",
      REJECTED: "Ditolak",
      REVISION_NEEDED: "Perlu Revisi",
      CANCELLED: "Dibatalkan",
      EXPIRED: "Kedaluwarsa",
      NO_SHOW: "No-Show",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          styles[status] || "bg-slate-100 text-slate-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gojek-Inspired Hero & Quick ServiceLauncher in Samsung One UI Blue */}
      <div className="bg-gradient-to-r from-[#1428A0] via-[#0F2499] to-[#0066FF] rounded-[28px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 px-3.5 py-1 rounded-full text-xs font-bold mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#00C3FF]" />
              <span>CareCar by Workplace Solution</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Mau perjalanan dinas ke mana, {user.name.split(" ")[0]}?
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Pilih tipe mobil operasional ala GoCar dengan standar kenyamanan &
              keamanan <strong>Workplace Solution</strong>.
            </p>
          </div>

          {/* Gojek-Style Pill Service Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("BOOK_CAR")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
                activeTab === "BOOK_CAR"
                  ? "bg-white text-[#1428A0] border-white shadow-lg font-extrabold"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Car className="w-6 h-6 mb-1" />
              <span className="text-xs">Pesan CareCar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("MY_BOOKINGS")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all relative ${
                activeTab === "MY_BOOKINGS"
                  ? "bg-white text-[#1428A0] border-white shadow-lg font-extrabold"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Calendar className="w-6 h-6 mb-1" />
              <span className="text-xs">Booking Saya ({bookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("WHATSAPP_BOT")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
                activeTab === "WHATSAPP_BOT"
                  ? "bg-white text-[#1428A0] border-white shadow-lg font-extrabold"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <MessageSquare className="w-6 h-6 mb-1" />
              <span className="text-xs">WhatsApp Bot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("NOTIFICATIONS")}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all relative ${
                activeTab === "NOTIFICATIONS"
                  ? "bg-white text-[#1428A0] border-white shadow-lg font-extrabold"
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              }`}
            >
              <Bell className="w-6 h-6 mb-1" />
              <span className="text-xs">
                Notifikasi ({notifications.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GOJEK-STYLE CAR BOOKING FLOW */}
      {activeTab === "BOOK_CAR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Pickup, Destination & Trip Details */}
          <div className="lg:col-span-7 bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  1. Detail Rute & Waktu Perjalanan Dinas
                </h3>
                <p className="text-xs text-slate-500">
                  Semua permintaan diverifikasi oleh Workplace Solution Admin
                  (Target SLA: {settings.approvalSlaHours} jam kerja)
                </p>
              </div>
              <span className="bg-[#E8F0FE] text-[#1428A0] text-xs font-bold px-3.5 py-1.5 rounded-full">
                Min. Notice {settings.minBookingNoticeHours} Jam
              </span>
            </div>

            {errorMsg && (
              <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Permintaan Ditolak Sistem</div>
                    <div className="text-xs mt-1">{errorMsg}</div>
                  </div>
                </div>

                {/* FR-002: Up to 3 Alternative Time Slots */}
                {alternatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-rose-200">
                    <div className="text-xs font-bold text-rose-900 mb-2">
                      Rekomendasi 3 Slot Waktu Alternatif yang Tersedia (Klik
                      untuk Pilih):
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                          className="bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 px-3 py-1.5 rounded-full text-xs font-bold transition"
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
              <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Berhasil Diajukan!</div>
                  <div className="text-xs mt-0.5">{successMsg}</div>
                </div>
              </div>
            )}

            <form
              id="carecar-booking-form"
              onSubmit={handleCreateBooking}
              className="space-y-4"
            >
              {/* Gojek-style Route Box */}
              <div className="bg-[#F4F6FA] rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Titik Penjemputan (Pickup)
                    </label>
                    <input
                      type="text"
                      required
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-1" />

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1428A0] text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Tujuan Perjalanan Dinas (Destination) *
                    </label>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Contoh: Pacific Place SCBD / Kawasan Industri Cikarang"
                      className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Waktu Berangkat (Start) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estimasi Kembali (Return) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jumlah Penumpang (Orang) *
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      className="w-full pl-11 pr-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estimasi Jarak Pulang-Pergi (KM) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    required
                    value={estDistanceKm}
                    onChange={(e) => setEstDistanceKm(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Keperluan Perjalanan Dinas (Purpose) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Jelaskan agenda rapat, nama klien/instansi yang dikunjungi..."
                  className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              {/* FR-006: EV Range Warning */}
              {showEvRangeWarning && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sm">
                      Peringatan Jarak Tempuh EV (FR-006 / BR-08)
                    </strong>
                    Estimasi jarak Anda ({estDistanceKm} km × buffer 1.2 ={" "}
                    <strong>{requiredEvRange} km</strong>) melebihi jarak pakai
                    aman baterai penuh EV ({selectedCarType?.defaultRangeKm} km).
                    Anda tetap dapat mengirim permintaan, namun kami sarankan
                    memilih tipe <strong>CareCar XL MPV (Petrol)</strong>.
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Gojek-Style Car Type Selector & Order Button */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200/80">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    2. Pilih Tipe CareCar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Opsi tipe mobil dikelola secara dinamis oleh Workplace
                    Solution
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0066FF]">
                  {
                    vehicles.filter((v) => v.status === "AVAILABLE").length
                  }{" "}
                  Unit Ready
                </span>
              </div>

              {/* Gojek-Style Selectable Vehicle Cards */}
              <div className="space-y-3">
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
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? "border-[#0066FF] bg-[#E8F0FE]/60 shadow-md shadow-blue-900/5"
                          : "border-slate-200 hover:border-blue-300 bg-white"
                      } ${seatsTooSmall ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 p-3 ${
                            ct.powertrain === "EV"
                              ? "bg-gradient-to-br from-[#1428A0] to-[#00C3FF] text-white"
                              : "bg-gradient-to-br from-[#1428A0] to-[#0066FF] text-white"
                          }`}
                        >
                          {ct.powertrain === "EV" ? (
                            <Zap className="w-6 h-6" />
                          ) : (
                            <Car className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900">
                              {ct.name}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                ct.powertrain === "EV"
                                  ? "bg-cyan-100 text-cyan-900"
                                  : "bg-blue-100 text-[#1428A0]"
                              }`}
                            >
                              {ct.badgeText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {ct.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-600">
                            <span>Maks. {ct.seats} Penumpang</span>
                            <span>•</span>
                            <span>Range ~{ct.defaultRangeKm} KM</span>
                            <span>•</span>
                            <span
                              className={
                                availableCount > 0
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }
                            >
                              {availableCount} Unit Tersedia
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-[#0066FF] bg-[#0066FF] text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Gojek-style Sticky Action Bar */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                <span>Pilihan Armada:</span>
                <span className="font-extrabold text-[#1428A0]">
                  {selectedCarType?.name || "Semua Tipe"}
                </span>
              </div>

              <button
                type="submit"
                form="carecar-booking-form"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] hover:from-[#0E1D7A] hover:to-[#0052CC] text-white font-extrabold text-sm shadow-xl shadow-blue-700/25 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  <span>
                    {submitting
                      ? "Memproses Permintaan..."
                      : "Pesan CareCar Sekarang"}
                  </span>
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <span>Kirim ke WS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY BOOKINGS (FR-004, FR-005, FR-025) */}
      {activeTab === "MY_BOOKINGS" && (
        <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Riwayat & Status Pemesanan Saya (S-E2)
              </h3>
              <p className="text-xs text-slate-500">
                Pantau persetujuan Workplace Solution, detail plat mobil, nomor
                telepon driver, dan status perjalanan
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("BOOK_CAR")}
              className="px-5 py-2.5 rounded-full bg-[#1428A0] text-white text-xs font-bold hover:bg-[#0066FF] transition"
            >
              + Buat Booking Baru
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Belum ada pemesanan kendaraan operasional.
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((bk) => (
                <div
                  key={bk.id}
                  className="rounded-2xl border border-slate-200 p-5 hover:border-blue-300 transition bg-[#F9FAFC]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm text-[#1428A0] bg-[#E8F0FE] px-3 py-1 rounded-full">
                        {bk.bookingNo}
                      </span>
                      {renderStatusBadge(bk.status)}
                      <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                        via {bk.channel}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-6 space-y-1">
                      <div className="text-base font-extrabold text-slate-900">
                        {bk.destination}
                      </div>
                      <div className="text-xs text-slate-600">
                        <strong>Titik Jemput:</strong> {bk.pickupLocation} •{" "}
                        <strong>Penumpang:</strong> {bk.passengers} orang •{" "}
                        <strong>Jarak Est:</strong> {bk.estDistanceKm} km
                      </div>
                      <div className="text-xs text-slate-500">
                        <strong>Keperluan:</strong> {bk.purpose}
                      </div>
                      {bk.decisionNote && (
                        <div className="text-xs bg-blue-50 text-[#1428A0] p-2.5 rounded-xl border border-blue-200 mt-2">
                          <strong>Catatan Workplace Solution:</strong>{" "}
                          {bk.decisionNote}
                        </div>
                      )}
                    </div>

                    {/* Assigned Vehicle & Driver Card */}
                    <div className="md:col-span-4">
                      {bk.vehiclePlate ? (
                        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm">
                          <div className="text-[11px] font-bold uppercase text-[#0066FF]">
                            Unit & Driver Ditugaskan
                          </div>
                          <div className="font-extrabold text-sm text-slate-900 mt-0.5">
                            {bk.vehiclePlate} — {bk.vehicleModel}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {bk.driverName} ({bk.driverPhone})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 text-xs text-amber-900">
                          Menunggu penugasan unit kendaraan & driver oleh{" "}
                          <strong>Workplace Solution Admin</strong>.
                        </div>
                      )}
                    </div>

                    {/* Action Buttons (Edit FR-005 / Cancel FR-025) */}
                    <div className="md:col-span-2 flex flex-col gap-2">
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
                          className="w-full py-2 px-3 rounded-full bg-[#E8F0FE] hover:bg-blue-200 text-[#1428A0] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit / Revisi</span>
                        </button>
                      )}

                      {(bk.status === "PENDING_APPROVAL" ||
                        bk.status === "CONFIRMED" ||
                        bk.status === "REVISION_NEEDED") && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(bk.id)}
                          className="w-full py-2 px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-rose-200"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Batalkan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WHATSAPP BOT CONVERSATIONAL SIMULATOR (PRD Section 6.7 & 8e) */}
      {activeTab === "WHATSAPP_BOT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-[28px] p-6 shadow-sm border border-slate-200">
            <span className="bg-[#E8F0FE] text-[#1428A0] text-xs font-extrabold px-3 py-1 rounded-full">
              PRD Section 6.7 & 8e
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-3">
              Simulasi WhatsApp Bot Workplace Solution
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Karyawan dengan ponsel spesifikasi rendah dapat memesan mobil
              tanpa aplikasi melalui WhatsApp Bot resmi dalam Bahasa Indonesia.
              Semua booking WhatsApp tetap masuk ke antrean{" "}
              <strong>Workplace Solution Admin</strong> (FR-042).
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Pengirim (FR-039)
                </label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Coba ubah ke nomor acak (misal <code>089999999</code>) untuk
                  menguji penolakan nomor tak terdaftar (FR-039).
                </p>
              </div>

              <div className="pt-2">
                <div className="text-xs font-bold text-slate-700 mb-2">
                  Tombol Cepat Percakapan:
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Menu Utama", val: "MENU" },
                    { label: "1 (Pesan Mobil)", val: "1" },
                    { label: "2 (Booking Saya)", val: "2" },
                    { label: "3 (Batalkan)", val: "3" },
                    { label: "Tanggal: 15/12/2026", val: "15/12/2026" },
                    { label: "Jam: 09:00-14:00", val: "09:00-14:00" },
                    { label: "YA (Konfirmasi)", val: "YA" },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => handleSendWhatsApp(q.val)}
                      className="px-3 py-1.5 rounded-full bg-[#F4F6FA] hover:bg-[#E8F0FE] text-[#1428A0] border border-slate-200 text-xs font-bold transition"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#0B1536] rounded-[28px] p-6 text-white flex flex-col h-[500px] shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center font-extrabold">
                  WS
                </div>
                <div>
                  <div className="font-bold text-sm">
                    Workplace Solution Automated Bot
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ● Online • Bahasa Indonesia Guided Flow
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
              {waMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.sender === "USER" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs whitespace-pre-line leading-relaxed ${
                      m.sender === "USER"
                        ? "bg-[#0066FF] text-white rounded-br-none"
                        : "bg-white/10 text-blue-50 border border-white/10 rounded-bl-none"
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
              className="pt-3 border-t border-white/10 flex gap-2"
            >
              <input
                type="text"
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder="Ketik balasan WhatsApp (contoh: 1, 15/12/2026, YA)..."
                className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00C3FF]"
              />
              <button
                type="submit"
                disabled={waLoading}
                className="px-5 py-2.5 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS (S-E5) */}
      {activeTab === "NOTIFICATIONS" && (
        <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
          <h3 className="text-xl font-extrabold text-slate-900 mb-4">
            Kotak Masuk Notifikasi (S-E5)
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Belum ada notifikasi.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-2xl bg-[#F4F6FA] border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="font-extrabold text-sm text-[#1428A0]">
                      {n.title}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {n.message}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(n.sentAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for Editing Pending / Revision Needed Booking (FR-005) */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-lg font-extrabold text-slate-900">
              Edit Permintaan Booking {editingBooking.bookingNo} (FR-005)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Perubahan akan mengembalikan permintaan ke antrean persetujuan
              Workplace Solution Admin.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tujuan Perjalanan Dinas
                </label>
                <input
                  type="text"
                  required
                  value={editDest}
                  onChange={(e) => setEditDest(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keperluan
                </label>
                <input
                  type="text"
                  required
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Penumpang
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={editPax}
                    onChange={(e) => setEditPax(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Est. Jarak (KM)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1500}
                    required
                    value={editDist}
                    onChange={(e) => setEditDist(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1428A0] text-white text-xs font-bold"
                >
                  Simpan & Kirim Ulang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
