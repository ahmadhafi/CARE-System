"use client";

import React, { useState } from "react";
import {
  Navigation,
  MapPin,
  Gauge,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Play,
  Square,
  Clock,
} from "lucide-react";
import { Booking, SafeUser, Vehicle } from "@/lib/types";

interface DriverTripAppProps {
  user: SafeUser;
  bookings: Booking[];
  vehicles: Vehicle[];
  employees: {
    id: string;
    employeeNo: string;
    name: string;
    department: string;
  }[];
  onRefresh: () => void;
}

const JAKARTA_GPS_PRESETS = [
  { label: "SCBD Sudirman", lat: -6.2243, lng: 106.8097, speedKmh: 36 },
  { label: "Gatot Subroto", lat: -6.2351, lng: 106.8235, speedKmh: 48 },
  { label: "Tol Sedyatmo", lat: -6.1182, lng: 106.6825, speedKmh: 72 },
  { label: "Bandara Soetta T3", lat: -6.1195, lng: 106.6652, speedKmh: 22 },
  { label: "Cikarang", lat: -6.3054, lng: 107.1425, speedKmh: 58 },
];

export default function DriverTripApp({
  user,
  bookings,
  vehicles,
  employees,
  onRefresh,
}: DriverTripAppProps) {
  const [gpsConsent, setGpsConsent] = useState<boolean>(user.gpsConsent);
  const [tab, setTab] = useState<"ACTIVE" | "READY" | "DONE">("READY");
  const [selectedCheckoutBk, setSelectedCheckoutBk] = useState<Booking | null>(
    null
  );
  const [selectedCheckinBk, setSelectedCheckinBk] = useState<Booking | null>(
    null
  );

  const [odoStart, setOdoStart] = useState<number>(0);
  const [levelStart, setLevelStart] = useState<number>(100);
  const [actualUserIds, setActualUserIds] = useState<string[]>([]);
  const [checkoutNote, setCheckoutNote] = useState("");

  const [odoEnd, setOdoEnd] = useState<number>(0);
  const [levelEnd, setLevelEnd] = useState<number>(100);
  const [checkinNote, setCheckinNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "OK" | "ERR";
    text: string;
  } | null>(null);

  const activeTrips = bookings.filter((b) => b.status === "IN_PROGRESS");
  const confirmedTrips = bookings.filter((b) => b.status === "CONFIRMED");
  const completedTrips = bookings.filter((b) => b.status === "COMPLETED");

  async function handleToggleGpsConsent(nextVal: boolean) {
    setGpsConsent(nextVal);
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpsConsent: nextVal }),
    });
    onRefresh();
  }

  function openCheckoutModal(bk: Booking) {
    const veh = vehicles.find((v) => v.id === bk.vehicleId);
    setOdoStart(veh?.odometerKm || 0);
    setLevelStart(veh?.currentLevel || 100);
    setActualUserIds([bk.requesterId]);
    setCheckoutNote("");
    setSelectedCheckoutBk(bk);
    setFeedback(null);
  }

  function openCheckinModal(bk: Booking) {
    const veh = vehicles.find((v) => v.id === bk.vehicleId);
    const startOdo = bk.trip?.odoStart || veh?.odometerKm || 0;
    setOdoEnd(startOdo + (bk.estDistanceKm || 10));
    setLevelEnd(Math.max(10, (bk.trip?.levelStart || veh?.currentLevel || 100) - 10));
    setCheckinNote(bk.trip?.incidentNote || "");
    setSelectedCheckinBk(bk);
    setFeedback(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCheckoutBk) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKOUT",
          bookingId: selectedCheckoutBk.id,
          odoStart,
          levelStart,
          actualUserIds,
          incidentNote: checkoutNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "ERR", text: data.error || "Check-Out gagal." });
      } else {
        setFeedback({ type: "OK", text: "Perjalanan dimulai (GPS Aktif)." });
        setSelectedCheckoutBk(null);
        setTab("ACTIVE");
        onRefresh();
      }
    } catch {
      setFeedback({ type: "ERR", text: "Gagal menghubungi server." });
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCheckinBk) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKIN",
          bookingId: selectedCheckinBk.id,
          odoEnd,
          levelEnd,
          incidentNote: checkinNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "ERR", text: data.error || "Check-In gagal." });
      } else {
        setFeedback({ type: "OK", text: "Perjalanan selesai (GPS Nonaktif)." });
        setSelectedCheckinBk(null);
        setTab("DONE");
        onRefresh();
      }
    } catch {
      setFeedback({ type: "ERR", text: "Gagal menghubungi server." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendGpsPing(
    bookingId: string,
    preset: { label: string; lat: number; lng: number; speedKmh: number }
  ) {
    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GPS_PING",
          bookingId,
          lat: preset.lat,
          lng: preset.lng,
          label: preset.label,
          speedKmh: preset.speedKmh,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "OK",
          text: `Titik GPS (${preset.label}) terkirim.`,
        });
        onRefresh();
      } else {
        setFeedback({ type: "ERR", text: data.error });
      }
    } finally {
      setLoading(false);
    }
  }

  function togglePassenger(empId: string) {
    setActualUserIds((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Compact GoPartner-Style Driver Status Bar */}
      <div className="bg-[#1428A0] rounded-3xl p-4 sm:p-5 text-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {activeTrips.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>GPS ON TRIP</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white/15 text-blue-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                <span>STANDBY</span>
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-extrabold truncate">
            {user.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => handleToggleGpsConsent(!gpsConsent)}
          className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition shrink-0 ${
            gpsConsent
              ? "bg-emerald-400 text-slate-950"
              : "bg-amber-400 text-slate-950"
          }`}
        >
          {gpsConsent ? "Izin GPS: Aktif" : "Aktifkan GPS"}
        </button>
      </div>

      {/* Segmented 3-Tab Pill Switcher */}
      <div className="bg-white p-1.5 rounded-full border border-slate-100 grid grid-cols-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setTab("READY")}
          className={`py-2 rounded-full text-xs font-extrabold transition ${
            tab === "READY"
              ? "bg-[#1428A0] text-white shadow-sm"
              : "text-slate-600"
          }`}
        >
          Siap Jalan ({confirmedTrips.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("ACTIVE")}
          className={`py-2 rounded-full text-xs font-extrabold transition ${
            tab === "ACTIVE"
              ? "bg-[#0066FF] text-white shadow-sm"
              : "text-slate-600"
          }`}
        >
          Aktif ({activeTrips.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("DONE")}
          className={`py-2 rounded-full text-xs font-extrabold transition ${
            tab === "DONE"
              ? "bg-[#1428A0] text-white shadow-sm"
              : "text-slate-600"
          }`}
        >
          Selesai ({completedTrips.length})
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-3.5 flex items-center gap-2.5 text-xs font-semibold border ${
            feedback.type === "OK"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "OK" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB: SIAP JALAN (CONFIRMED) */}
      {tab === "READY" && (
        <div className="space-y-3">
          {confirmedTrips.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-100">
              Tidak ada tugas keberangkatan saat ini.
            </div>
          ) : (
            confirmedTrips.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-[#EEF4FF] text-[#1428A0] font-extrabold text-xs px-3 py-1 rounded-full">
                    {bk.bookingNo} • {bk.vehiclePlate}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#0066FF]" />
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

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-slate-600">
                    Pemohon: <strong>{bk.requesterName}</strong> ({bk.passengers}{" "}
                    org)
                  </div>
                  <button
                    type="button"
                    onClick={() => openCheckoutModal(bk)}
                    className="px-5 py-2.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Mulai Jalan</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: AKTIF (IN_PROGRESS) */}
      {tab === "ACTIVE" && (
        <div className="space-y-3">
          {activeTrips.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-100">
              Tidak ada perjalanan yang sedang berlangsung.
            </div>
          ) : (
            activeTrips.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-3xl p-4 sm:p-5 shadow-md border-2 border-[#0066FF] space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-[#1428A0] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                    {bk.bookingNo} • {bk.vehiclePlate}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    GPS Live
                  </span>
                </div>

                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    {bk.destination}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Penumpang: {bk.trip?.actualUsers.join(", ")} • Odo Awal:{" "}
                    {bk.trip?.odoStart?.toLocaleString("id-ID")} km
                  </div>
                </div>

                {/* Quick GPS Ping Chips */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">
                    Update Titik GPS:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {JAKARTA_GPS_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSendGpsPing(bk.id, p)}
                        className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 hover:border-[#0066FF] hover:text-[#1428A0] text-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-[#0066FF]" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCheckinModal(bk)}
                  className="w-full py-3 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Selesai & Check-In</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: SELESAI (COMPLETED) */}
      {tab === "DONE" && (
        <div className="space-y-2.5">
          {completedTrips.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-100">
              Belum ada perjalanan selesai.
            </div>
          ) : (
            completedTrips.map((bk) => (
              <div
                key={bk.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 truncate">
                    {bk.destination}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {bk.bookingNo} • {bk.vehiclePlate} •{" "}
                    {bk.trip?.actualUsers.join(", ")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-[#1428A0]">
                    {bk.trip?.distanceKm} km
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {bk.trip?.odoStart} → {bk.trip?.odoEnd}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: CHECK-OUT */}
      {selectedCheckoutBk && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Mulai Perjalanan ({selectedCheckoutBk.bookingNo})
              </h4>
              <p className="text-xs text-slate-500">
                Unit {selectedCheckoutBk.vehiclePlate} •{" "}
                {selectedCheckoutBk.destination}
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Odometer Awal (km)
                  </label>
                  <div className="relative">
                    <Gauge className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      value={odoStart}
                      onChange={(e) => setOdoStart(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Baterai / BBM (%)
                  </label>
                  <div className="relative">
                    <BatteryCharging className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={levelStart}
                      onChange={(e) => setLevelStart(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Penumpang yang Naik
                </label>
                <div className="max-h-36 overflow-y-auto bg-slate-50 rounded-2xl p-2 border border-slate-200 space-y-1">
                  {employees.map((emp) => {
                    const checked = actualUserIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs ${
                          checked
                            ? "bg-[#EEF4FF] text-[#1428A0] font-bold"
                            : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePassenger(emp.id)}
                            className="rounded text-[#0066FF]"
                          />
                          <span>{emp.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {emp.employeeNo}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                  placeholder="Kondisi mobil aman"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheckoutBk(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || actualUserIds.length === 0}
                  className="px-5 py-2.5 rounded-full bg-[#1428A0] text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {loading ? "Memproses..." : "Mulai Jalan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHECK-IN */}
      {selectedCheckinBk && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Selesai Perjalanan ({selectedCheckinBk.bookingNo})
              </h4>
              <p className="text-xs text-slate-500">
                Odometer Awal:{" "}
                {selectedCheckinBk.trip?.odoStart?.toLocaleString("id-ID")} km
              </p>
            </div>

            <form onSubmit={handleCheckinSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Odometer Akhir (km)
                  </label>
                  <input
                    type="number"
                    required
                    min={selectedCheckinBk.trip?.odoStart || 0}
                    value={odoEnd}
                    onChange={(e) => setOdoEnd(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                  <span className="text-[10px] text-[#0066FF] font-bold">
                    Jarak:{" "}
                    {Math.max(
                      0,
                      odoEnd - (selectedCheckinBk.trip?.odoStart || 0)
                    )}{" "}
                    km
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Sisa Baterai / BBM (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={levelEnd}
                    onChange={(e) => setLevelEnd(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catatan Perjalanan
                </label>
                <input
                  type="text"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="Perjalanan lancar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheckinBk(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-full bg-[#1428A0] text-white text-xs font-extrabold"
                >
                  {loading ? "Menyimpan..." : "Konfirmasi Selesai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
