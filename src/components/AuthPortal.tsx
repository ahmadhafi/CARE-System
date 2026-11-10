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
  Navigation,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SafeUser } from "@/lib/types";

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
          email,
          name: fullName,
          department,
          phone,
          requestedRole,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Pendaftaran gagal.");
      } else {
        setSuccessMsg(
          "Pendaftaran berhasil dikirim! Akun Anda menunggu persetujuan Workplace Solution."
        );
        setEmpNo("");
        setEmail("");
        setFullName("");
        setPhone("");
        setRegPassword("");
      }
    } catch {
      setErrorMsg("Gagal mengirim pendaftaran.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF2F8] flex justify-center items-stretch sm:items-center sm:py-6">
      {/* Mobile App Frame (Android / iOS Native Proportions) */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[760px] bg-white sm:rounded-[36px] sm:shadow-[0_20px_60px_rgba(20,40,160,0.12)] sm:border sm:border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
        {/* Top Bar (Gojek Style Logo + Language Pill) */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== "ONBOARDING" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("ONBOARDING");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1428A0] flex items-center justify-center text-white shadow-sm">
                <Car className="w-4 h-4" />
              </div>
            )}
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              care
            </span>
          </div>

          <span className="px-3 py-1 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1428A0]" />
            <span>Bahasa Indonesia</span>
          </span>
        </div>

        {/* =================================================================
            SCREEN 1: GOJEK ONBOARDING WELCOME SCREEN (Figma 16-1038)
           ================================================================= */}
        {step === "ONBOARDING" && (
          <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-4">
            {/* Gojek-Style Vector Mobility Illustration Card */}
            <div className="my-auto">
              <div className="w-full aspect-[4/3] rounded-[28px] bg-gradient-to-b from-[#EEF4FF] to-[#DCE8FF] relative overflow-hidden flex flex-col items-center justify-center p-6 border border-blue-100">
                {/* Decorative Map Grid Lines */}
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1428A0_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Route Pill Floating Top */}
                <div className="relative z-10 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full shadow-sm border border-blue-100 flex items-center gap-2 text-[11px] font-bold text-slate-700 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                  <span>Lobby Kantor</span>
                  <span className="text-slate-300">→</span>
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Tujuan Dinas</span>
                </div>

                {/* Center Car Graphic */}
                <div className="relative z-10 w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1428A0] to-[#0066FF] shadow-xl shadow-blue-900/25 flex items-center justify-center text-white">
                  <Car className="w-12 h-12" />
                  <div className="absolute -bottom-2 -right-2 bg-[#00C3FF] text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    <span>EV & MPV</span>
                  </div>
                </div>

                {/* Workplace Solution Pill */}
                <div className="relative z-10 mt-5 inline-flex items-center gap-1.5 bg-[#1428A0]/10 text-[#1428A0] px-3 py-1 rounded-full text-[11px] font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Workplace Solution Mobility</span>
                </div>
              </div>

              {/* Carousel Dots */}
              <div className="flex items-center justify-center gap-1.5 mt-5">
                <span className="w-6 h-2 rounded-full bg-[#1428A0]" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="w-2 h-2 rounded-full bg-slate-200" />
              </div>

              {/* Gojek Onboarding Typography */}
              <div className="mt-6 text-left">
                <h1 className="text-[22px] font-extrabold text-slate-900 leading-snug">
                  Selamat datang di aplikasi CARE!
                </h1>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Pesan mobil operasional kantor, pantau posisi driver secara
                  real-time, dan kelola perjalanan dinas dalam satu aplikasi.
                </p>
              </div>
            </div>

            {/* Bottom Gojek Action Buttons */}
            <div className="space-y-2.5 pt-6">
              <button
                type="button"
                onClick={() => {
                  setStep("LOGIN");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition"
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
                className="w-full py-3.5 rounded-full bg-white hover:bg-slate-50 active:scale-[0.99] text-[#1428A0] border-2 border-[#1428A0] font-extrabold text-sm transition"
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
            SCREEN 2: GOJEK-STYLE CLEAN LOGIN SCREEN
           ================================================================= */}
        {step === "LOGIN" && (
          <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-4">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Masuk ke akunmu
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

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Username / ID Karyawan / Email *
                  </label>
                  <div className="relative">
                    <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan username atau email"
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-b-2 border-slate-200 focus:border-[#1428A0] rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:bg-white transition"
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
                      placeholder="Masukkan password"
                      className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border-b-2 border-slate-200 focus:border-[#1428A0] rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition disabled:opacity-50"
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
                className="text-xs font-extrabold text-[#0066FF] hover:underline"
              >
                Belum punya akun? Daftar akun baru
              </button>
            </div>
          </div>
        )}

        {/* =================================================================
            SCREEN 3: GOJEK-STYLE CLEAN REGISTER SCREEN
           ================================================================= */}
        {step === "REGISTER" && (
          <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-2 overflow-y-auto">
            <form onSubmit={handleRegister} className="space-y-3.5">
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Username / NIK *
                  </label>
                  <input
                    type="text"
                    required
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    placeholder="EMP-105"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Peran *
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) =>
                      setRequestedRole(e.target.value as "EMPLOYEE" | "DRIVER")
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                  >
                    <option value="EMPLOYEE">Karyawan</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama sesuai ID karyawan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Kantor *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@company.id"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    No. WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Departemen *
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Departemen / Divisi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password Baru *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 8 karakter (Huruf besar, kecil & angka)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1428A0]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? "Mengirim..." : "Daftar & Ajukan ke WS"}
                </button>
              </div>
            </form>

            <div className="text-center pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setStep("LOGIN");
                  setErrorMsg(null);
                }}
                className="text-xs font-extrabold text-[#0066FF] hover:underline"
              >
                Sudah punya akun? Masuk di sini
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
