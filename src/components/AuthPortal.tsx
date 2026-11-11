"use client";

import React, { useState } from "react";
import {
  Car,
  Lock,
  BadgeCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Zap,
  Smartphone,
  Users,
} from "lucide-react";
import { SafeUser } from "@/lib/types";
import PWAInstallButton from "./PWAInstallButton";

interface AuthPortalProps {
  onAuthenticated: (user: SafeUser) => void;
}

export default function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [step, setStep] = useState<"ONBOARDING" | "LOGIN" | "REGISTER">(
    "ONBOARDING"
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Registration state
  const [empNo, setEmpNo] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Commercial & Sales");
  const [phone, setPhone] = useState("");
  const [requestedRole, setRequestedRole] = useState<"EMPLOYEE" | "DRIVER">(
    "EMPLOYEE"
  );
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal masuk.");
      } else if (data.user) {
        onAuthenticated(data.user);
      }
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeNo: empNo,
          name: fullName,
          department,
          requestedRole,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Pendaftaran gagal.");
      } else {
        setSuccessMsg(
          "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan Workplace Solution sebelum dapat digunakan."
        );
        setEmpNo("");
        setFullName("");
        setDepartment("Commercial & Sales");
        setRegPassword("");
      }
    } catch {
      setErrorMsg("Gagal mengirim pendaftaran.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2F8] flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8">
      {/* Responsive Multi-Platform Card: Mobile Full Screen, Desktop Wide Split-Pane */}
      <div className="w-full sm:max-w-xl md:max-w-4xl lg:max-w-5xl min-h-screen sm:min-h-0 bg-white sm:rounded-[32px] sm:shadow-[0_20px_60px_rgba(20,40,160,0.12)] sm:border sm:border-slate-200/80 overflow-hidden relative flex flex-col md:grid md:grid-cols-12">
        {/* Left Brand Panel (Desktop/Tablet Showcase, Hidden on Mobile) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-[#1428A0] via-[#0E2082] to-[#0055DF] text-white p-8 flex-col justify-between relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Top Brand Tag */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#1428A0] flex items-center justify-center font-black text-xl shadow-md">
                <Car className="w-5 h-5 text-[#1428A0]" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-white block leading-none">
                  care
                </span>
                <span className="text-[10px] font-bold text-blue-200 tracking-wider uppercase">
                  Workplace Solution
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-black text-white leading-tight">
                Corporate Operational Car Booking System
              </h2>
              <p className="text-xs text-blue-100 leading-relaxed">
                Platform terpadu untuk pemesanan armada dinas kantor, pemantauan
                posisi kendaraan secara real-time, dan manajemen armada
                operasional perusahaan.
              </p>
            </div>
          </div>

          {/* Center Visual Badges */}
          <div className="relative z-10 space-y-2.5 my-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-400 text-slate-900 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Armada Listrik & MPV</p>
                <p className="text-[11px] text-blue-200">Hyundai Ioniq 5 EV & Stargazer XL</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-slate-900 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Otorisasi & Approval</p>
                <p className="text-[11px] text-blue-200">Persetujuan terpusat Workplace Solution</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Aplikasi PWA Multi-Device</p>
                <p className="text-[11px] text-blue-200">Dukungan Android, iOS, dan Desktop</p>
              </div>
            </div>
          </div>

          {/* Bottom PWA Prompt */}
          <div className="relative z-10 pt-4 border-t border-white/15">
            <PWAInstallButton variant="pill" className="bg-white text-[#1428A0] border-none shadow-md" />
          </div>
        </div>

        {/* Right Active Interactive Screen (Mobile + Desktop Form) */}
        <div className="flex-1 md:col-span-7 flex flex-col justify-between p-6 sm:p-8 min-h-screen sm:min-h-[640px]">
          {/* Top Bar (Logo + Language Pill) */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              {step !== "ONBOARDING" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("ONBOARDING");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 mr-1 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1428A0] flex items-center justify-center text-white shadow-sm md:hidden">
                  <Car className="w-4 h-4" />
                </div>
              )}
              <span className="font-extrabold text-xl tracking-tight text-slate-900 md:hidden">
                care
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <PWAInstallButton variant="pill" />
              </div>
              <span className="px-3 py-1 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50">
                <span className="w-2 h-2 rounded-full bg-[#1428A0]" />
                <span>Bahasa Indonesia</span>
              </span>
            </div>
          </div>

          {/* =================================================================
              SCREEN 1: ONBOARDING WELCOME SCREEN
             ================================================================= */}
          {step === "ONBOARDING" && (
            <div className="flex-1 flex flex-col justify-between pt-2">
              <div className="my-auto space-y-5">
                {/* Visual Mobility Card */}
                <div className="w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/9] rounded-[24px] bg-gradient-to-b from-[#EEF4FF] to-[#DCE8FF] relative overflow-hidden flex flex-col items-center justify-center p-6 border border-blue-100 shadow-inner">
                  <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1428A0_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Route Pill Floating Top */}
                  <div className="relative z-10 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full shadow-sm border border-blue-100 flex items-center gap-2 text-[11px] font-bold text-slate-700 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                    <span>Lobby Kantor</span>
                    <span className="text-slate-300">→</span>
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tujuan Dinas</span>
                  </div>

                  {/* Center Car Graphic */}
                  <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#1428A0] to-[#0066FF] shadow-xl shadow-blue-900/25 flex items-center justify-center text-white">
                    <Car className="w-10 h-10 sm:w-12 sm:h-12" />
                    <div className="absolute -bottom-2 -right-2 bg-[#00C3FF] text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                      <Zap className="w-3 h-3" />
                      <span>EV & MPV</span>
                    </div>
                  </div>

                  {/* Workplace Solution Pill */}
                  <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 bg-[#1428A0]/10 text-[#1428A0] px-3 py-1 rounded-full text-[11px] font-extrabold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Workplace Solution Mobility</span>
                  </div>
                </div>

                {/* Typography */}
                <div className="text-left space-y-1.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                    Selamat datang di aplikasi CARE!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Pesan mobil operasional kantor, pantau posisi driver secara
                    real-time, dan kelola perjalanan dinas dalam satu aplikasi.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setStep("LOGIN");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition cursor-pointer"
                >
                  Masuk
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("REGISTER");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="w-full py-3.5 rounded-full bg-white hover:bg-slate-50 active:scale-[0.99] text-[#1428A0] border-2 border-[#1428A0] font-extrabold text-sm transition cursor-pointer"
                >
                  Belum ada akun? Daftar dulu
                </button>

                <p className="text-[11px] text-slate-400 text-center pt-1">
                  Dikelola secara internal oleh{" "}
                  <strong className="text-slate-600">Workplace Solution</strong>.
                </p>
              </div>
            </div>
          )}

          {/* =================================================================
              SCREEN 2: CLEAN LOGIN SCREEN
             ================================================================= */}
          {step === "LOGIN" && (
            <div className="flex-1 flex flex-col justify-between pt-2">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Masuk ke akun Anda
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Masukkan Username / ID Karyawan atau email kantor yang
                    terdaftar.
                  </p>
                </div>

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Nama Panggilan / Username atau ID Karyawan *
                    </label>
                    <div className="relative">
                      <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Contoh: ahmad, IT-001, atau WS-001"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1428A0] rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password akun Anda"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-[#1428A0] rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Memverifikasi..." : "Lanjut Masuk"}
                  </button>
                </div>
              </form>

              <div className="text-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep("REGISTER");
                    setErrorMsg(null);
                  }}
                  className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Belum punya akun? Daftar akun baru
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              SCREEN 3: CLEAN REGISTER SCREEN
             ================================================================= */}
          {step === "REGISTER" && (
            <div className="flex-1 flex flex-col justify-between pt-1 overflow-y-auto">
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Daftar akun CARE
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akun baru akan diverifikasi oleh{" "}
                    <strong className="text-[#1428A0]">Workplace Solution</strong>{" "}
                    sebelum aktif.
                  </p>
                </div>

                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex items-start gap-2 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 flex items-start gap-2 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Nama Lengkap / Nama Asli (Bukan Nama Palsu) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-extrabold text-slate-800">
                        Nama Asli Lengkap *
                      </label>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Wajib Nama Asli (Bukan Palsu)
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama asli lengkap sesuai identitas resmi"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0] focus:bg-white transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Wajib nama asli untuk verifikasi dinas perusahaan oleh Workplace Solution.
                    </p>
                  </div>

                  {/* Nama Panggilan & Peran Akun */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Panggilan / Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={empNo}
                        onChange={(e) => setEmpNo(e.target.value)}
                        placeholder="Contoh: ahmad, hafi, rina"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0] focus:bg-white transition"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Digunakan saat login ke sistem.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Peran Akun *
                      </label>
                      <select
                        value={requestedRole}
                        onChange={(e) =>
                          setRequestedRole(e.target.value as "EMPLOYEE" | "DRIVER")
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0]"
                      >
                        <option value="EMPLOYEE">Karyawan (Peminjam Mobil)</option>
                        <option value="DRIVER">Driver Operasional</option>
                      </select>
                    </div>
                  </div>

                  {/* Departemen & Kata Sandi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Departemen / Divisi *
                      </label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Contoh: IT, Marketing, Finance"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0] focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kata Sandi (Password) *
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1428A0] focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Mendaftarkan..." : "Kirim Pendaftaran"}
                  </button>
                </div>
              </form>

              <div className="text-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep("LOGIN");
                    setErrorMsg(null);
                  }}
                  className="text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Sudah punya akun? Masuk di sini
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
