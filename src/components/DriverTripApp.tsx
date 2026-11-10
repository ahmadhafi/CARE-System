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
  Users,
  Play,
  Square,
  FileText,
  ShieldCheck,
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
  { label: "Sudirman Central Business District (SCBD)", lat: -6.2243, lng: 106.8097, speedKmh: 36 },
  { label: "Jl. Jend. Gatot Subroto Kav. 32", lat: -6.2351, lng: 106.8235, speedKmh: 48 },
  { label: "Tol Prof. Dr. Ir. Sedyatmo (Arah Bandara)", lat: -6.1182, lng: 106.6825, speedKmh: 72 },
  { label: "Bandara Soekarno-Hatta Terminal 3", lat: -6.1195, lng: 106.6652, speedKmh: 22 },
  { label: "Kawasan Industri Jababeka Cikarang", lat: -6.3054, lng: 107.1425, speedKmh: 58 },
];

export default function DriverTripApp({
  user,
  bookings,
  vehicles,
  employees,
  onRefresh,
}: DriverTripAppProps) {
  const [gpsConsent, setGpsConsent] = useState<boolean>(user.gpsConsent);
  const [selectedCheckoutBk, setSelectedCheckoutBk] = useState<Booking | null>(
    null
  );
  const [selectedCheckinBk, setSelectedCheckinBk] = useState<Booking | null>(
    null
  );

  // Check-Out form state (FR-026, FR-028)
  const [odoStart, setOdoStart] = useState<number>(15000);
  const [levelStart, setLevelStart] = useState<number>(90);
  const [actualUserIds, setActualUserIds] = useState<string[]>([]);
  const [checkoutNote, setCheckoutNote] = useState("");

  // Check-In form state (FR-027, FR-019)
  const [odoEnd, setOdoEnd] = useState<number>(15045);
  const [levelEnd, setLevelEnd] = useState<number>(72);
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
    setOdoStart(veh?.odometerKm || 14250);
    setLevelStart(veh?.currentLevel || 90);
    setActualUserIds([bk.requesterId]);
    setCheckoutNote("");
    setSelectedCheckoutBk(bk);
    setFeedback(null);
  }

  function openCheckinModal(bk: Booking) {
    const startOdo = bk.trip?.odoStart || 15000;
    setOdoEnd(startOdo + (bk.estDistanceKm || 35));
    setLevelEnd(Math.max(20, (bk.trip?.levelStart || 85) - 18));
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
        setFeedback({ type: "OK", text: data.message });
        setSelectedCheckoutBk(null);
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
        setFeedback({ type: "OK", text: data.message });
        setSelectedCheckinBk(null);
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
          text: `Lokasi GPS (${preset.label}) terkirim ke Live Map Workplace Solution.`,
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
    <div className="space-y-6">
      {/* Top Driver Status & GPS Privacy Consent Banner (FR-033, FR-035) */}
      <div className="bg-gradient-to-r from-[#0B1536] via-[#1428A0] to-[#0066FF] rounded-[28px] p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            {activeTrips.length > 0 ? (
              <span className="inline-flex items-center gap-2 bg-emerald-500 text-white px-3.5 py-1 rounded-full text-xs font-extrabold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>PELACAKAN GPS AKTIF (ON TRIP)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-white/15 text-blue-100 px-3.5 py-1 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00C3FF]" />
                <span>PELACAKAN GPS NONAKTIF (STANDBY)</span>
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold">
            Panel Pengemudi — {user.name}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            Lokasi GPS ponsel hanya dibagikan ke{" "}
            <strong>Workplace Solution Admin</strong> di antara waktu{" "}
            <strong>Check-Out</strong> dan <strong>Check-In</strong> (FR-033).
          </p>
        </div>

        {/* GPS Consent Switch (FR-035) */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-xs">
            <div className="font-extrabold">Persetujuan GPS (FR-035)</div>
            <div className="text-blue-200 text-[11px]">
              {gpsConsent
                ? "Disetujui untuk perjalanan aktif"
                : "Wajib disetujui sebelum Check-Out"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleGpsConsent(!gpsConsent)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition ${
              gpsConsent
                ? "bg-emerald-400 text-slate-950"
                : "bg-amber-400 text-slate-950"
            }`}
          >
            {gpsConsent ? "GPS Consent: ON" : "Setujui GPS"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 text-sm border ${
            feedback.type === "OK"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "OK" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold text-xs">{feedback.text}</span>
        </div>
      )}

      {/* 1. ACTIVE TRIPS IN PROGRESS (S-D4) */}
      {activeTrips.length > 0 && (
        <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border-2 border-[#0066FF]">
          <h3 className="text-lg font-extrabold text-[#1428A0] mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span>Perjalanan Sedang Berlangsung (S-D4 Active Trip)</span>
          </h3>

          <div className="space-y-4">
            {activeTrips.map((bk) => (
              <div
                key={bk.id}
                className="bg-[#F4F6FA] rounded-2xl p-5 border border-blue-200 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="bg-[#1428A0] text-white text-xs font-extrabold px-3 py-1 rounded-full">
                      {bk.bookingNo} • {bk.vehiclePlate} ({bk.vehicleModel})
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                      Tujuan: {bk.destination}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Pemohon: <strong>{bk.requesterName}</strong> • Penumpang
                      Aktual Tercatat:{" "}
                      <strong>{bk.trip?.actualUsers.join(", ")}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCheckinModal(bk)}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] hover:from-[#0E1E78] hover:to-[#0052CC] text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    <span>Selesai & Check-In Kembali (S-D5)</span>
                  </button>
                </div>

                {/* Live Telemetry & GPS Checkpoint Simulator */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between">
                    <span>
                      Kirim Titik Lokasi GPS ke Live Map Workplace Solution
                      (FR-034):
                    </span>
                    <span className="text-emerald-700">
                      Odo Awal: {bk.trip?.odoStart?.toLocaleString("id-ID")} km
                      • Level Awal: {bk.trip?.levelStart}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {JAKARTA_GPS_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSendGpsPing(bk.id, p)}
                        className="px-3 py-1.5 rounded-full bg-[#E8F0FE] hover:bg-[#0066FF] hover:text-white text-[#1428A0] text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. UPCOMING CONFIRMED TRIPS READY FOR CHECK-OUT (S-D1, S-D2, S-D3) */}
      <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
        <h3 className="text-lg font-extrabold text-slate-900 mb-1">
          Jadwal Tugas Mengemudi Siap Berangkat (S-D1 My Trips)
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Klik <strong>Mulai Check-Out</strong> saat keberangkatan untuk
          mencatat odometer awal, level baterai/BBM, dan memverifikasi penumpang
          aktual (FR-026, FR-028).
        </p>

        {confirmedTrips.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 bg-[#F4F6FA] rounded-2xl">
            Tidak ada jadwal keberangkatan yang menunggu Check-Out saat ini.
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedTrips.map((bk) => (
              <div
                key={bk.id}
                className="p-5 rounded-2xl bg-[#F4F6FA] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#E8F0FE] text-[#1428A0] font-extrabold text-xs px-3 py-1 rounded-full">
                      {bk.bookingNo}
                    </span>
                    <span className="font-bold text-xs text-slate-700">
                      {bk.vehiclePlate} ({bk.vehicleModel})
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {bk.destination}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                    <span>
                      <strong>Pemohon:</strong> {bk.requesterName} (
                      {bk.requesterDepartment})
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Jemput:</strong> {bk.pickupLocation}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0066FF]" />
                      {new Date(bk.startAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCheckoutModal(bk)}
                  className="px-6 py-3 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 shrink-0"
                >
                  <Play className="w-4 h-4" />
                  <span>Mulai Check-Out (S-D3)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. COMPLETED TRIPS HISTORY */}
      <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-200">
        <h3 className="text-lg font-extrabold text-slate-900 mb-4">
          Riwayat Perjalanan Selesai ({completedTrips.length})
        </h3>
        <div className="space-y-3">
          {completedTrips.map((bk) => (
            <div
              key={bk.id}
              className="p-4 rounded-2xl bg-[#F9FAFC] border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs"
            >
              <div>
                <span className="font-extrabold text-[#1428A0]">
                  {bk.bookingNo}
                </span>{" "}
                — <strong>{bk.destination}</strong> ({bk.vehiclePlate})
                <div className="text-slate-500 mt-0.5">
                  Penumpang Aktual: {bk.trip?.actualUsers.join(", ")}
                </div>
              </div>
              <div className="font-bold text-slate-700">
                Jarak: {bk.trip?.distanceKm} km (Odo:{" "}
                {bk.trip?.odoStart?.toLocaleString("id-ID")} →{" "}
                {bk.trip?.odoEnd?.toLocaleString("id-ID")} km)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: DRIVER CHECK-OUT (S-D3, FR-026, FR-028) */}
      {selectedCheckoutBk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <h4 className="text-xl font-extrabold text-slate-900">
              Formulir Check-Out Keberangkatan (S-D3)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Booking <strong>{selectedCheckoutBk.bookingNo}</strong> • Unit{" "}
              <strong>{selectedCheckoutBk.vehiclePlate}</strong>
            </p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Odometer Awal (KM) *
                  </label>
                  <div className="relative">
                    <Gauge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      value={odoStart}
                      onChange={(e) => setOdoStart(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Level Baterai EV / BBM (%) *
                  </label>
                  <div className="relative">
                    <BatteryCharging className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={levelStart}
                      onChange={(e) => setLevelStart(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* FR-028: Mandatory Actual Passenger Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Penumpang Aktual yang Naik Kendaraan (FR-028 — Wajib) *
                </label>
                <div className="text-[11px] text-slate-500 mb-2">
                  Pemohon asli:{" "}
                  <strong>{selectedCheckoutBk.requesterName}</strong>. Centang
                  karyawan yang benar-benar ikut di dalam mobil:
                </div>
                <div className="max-h-40 overflow-y-auto bg-[#F4F6FA] rounded-2xl p-3 border border-slate-200 space-y-1.5">
                  {employees.map((emp) => {
                    const checked = actualUserIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition ${
                          checked
                            ? "bg-[#E8F0FE] text-[#1428A0] font-bold"
                            : "hover:bg-white text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePassenger(emp.id)}
                            className="rounded text-[#0066FF]"
                          />
                          <span>
                            {emp.name} ({emp.employeeNo})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {emp.department}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Kondisi Kendaraan Awal (Opsional)
                </label>
                <input
                  type="text"
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                  placeholder="Contoh: Kondisi ban & body aman"
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCheckoutBk(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || actualUserIds.length === 0}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] text-white text-xs font-extrabold disabled:opacity-50"
                >
                  {loading
                    ? "Memproses..."
                    : "Konfirmasi Check-Out & Aktifkan GPS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DRIVER CHECK-IN (S-D5, FR-027, FR-019, FR-029) */}
      {selectedCheckinBk && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200">
            <h4 className="text-xl font-extrabold text-slate-900">
              Formulir Check-In Pengembalian Mobil (S-D5)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Odometer Awal Tercatat:{" "}
              <strong>
                {selectedCheckinBk.trip?.odoStart?.toLocaleString("id-ID")} km
              </strong>
            </p>

            <form onSubmit={handleCheckinSubmit} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Odometer Akhir (KM) *
                  </label>
                  <input
                    type="number"
                    required
                    min={selectedCheckinBk.trip?.odoStart || 0}
                    value={odoEnd}
                    onChange={(e) => setOdoEnd(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                  <span className="text-[11px] text-[#0066FF] font-bold">
                    Jarak Tempuh:{" "}
                    {Math.max(
                      0,
                      odoEnd - (selectedCheckinBk.trip?.odoStart || 0)
                    )}{" "}
                    km
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sisa Baterai EV / BBM (%) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={levelEnd}
                    onChange={(e) => setLevelEnd(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm font-bold"
                  />
                  {levelEnd < 30 && (
                    <span className="text-[11px] text-amber-700 font-bold block">
                      ⚠️ &lt; 30%: Akan menandai pengisian daya/BBM di dashboard
                      Workplace Solution (FR-029)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Perjalanan / Insiden / Kerusakan (FR-032)
                </label>
                <textarea
                  rows={2}
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="Contoh: Perjalanan lancar, atau catat jika ada kendala..."
                  className="w-full px-4 py-2.5 bg-[#F4F6FA] border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCheckinBk(null)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] text-white text-xs font-extrabold"
                >
                  {loading
                    ? "Menyimpan..."
                    : "Konfirmasi Check-In & Matikan GPS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
