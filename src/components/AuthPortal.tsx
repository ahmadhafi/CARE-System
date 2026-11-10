"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Car,
  Lock,
  UserPlus,
  LogIn,
  Building2,
  Phone,
  Mail,
  BadgeCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { SafeUser } from "@/lib/types";

interface AuthPortalProps {
  onAuthenticated: (user: SafeUser) => void;
}

export default function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [identifier, setIdentifier] = useState("WS-001");
  const [password, setPassword] = useState("AdminCare2026!");
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
        setErrorMsg(data.error || "Gagal masuk ke sistem.");
      } else if (data.user) {
        onAuthenticated(data.user);
      }
    } catch {
      setErrorMsg("Gagal menghubungi server otentikasi.");
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
          data.message ||
            "Pendaftaran berhasil! Akun Anda menunggu persetujuan Workplace Solution Admin."
        );
        setEmpNo("");
        setEmail("");
        setFullName("");
        setPhone("");
        setRegPassword("");
      }
    } catch {
      setErrorMsg("Gagal mengirim pendaftaran akun.");
    } finally {
      setLoading(false);
    }
  }

  function fillQuickDemo(id: string, pass: string) {
    setMode("LOGIN");
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1338] via-[#1428A0] to-[#0051D5] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20">
        {/* Left Banner: Samsung One UI Corporate + Gojek Mobility Experience */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#1428A0] via-[#102185] to-[#081248] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#00C3FF]" />
              <span>Workplace Solution Mobility</span>
            </div>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-13 h-13 rounded-2xl bg-[#0066FF] flex items-center justify-center shadow-lg shadow-blue-500/40 p-3">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  CARE System
                </h1>
                <p className="text-blue-200 text-xs font-medium">
                  Corporate Operational Car Booking Platform
                </p>
              </div>
            </div>

            <p className="text-sm text-blue-100/90 leading-relaxed mt-4">
              Platform internal pemesanan kendaraan operasional, penjadwalan
              driver, pelacakan GPS real-time, dan pelaporan armada yang
              dikelola penuh oleh{" "}
              <span className="font-bold text-white underline decoration-[#00C3FF]">
                Workplace Solution
              </span>
              .
            </p>

            {/* Fleet Summary Pill Cards */}
            <div className="mt-7 space-y-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-2">
                  Armada Operasional Aktif
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0B164B]/70 rounded-xl p-3">
                    <div className="text-xl font-extrabold text-[#00C3FF]">
                      3 Unit EV
                    </div>
                    <div className="text-xs text-blue-100">
                      Hyundai Ioniq 5 Electric
                    </div>
                  </div>
                  <div className="bg-[#0B164B]/70 rounded-xl p-3">
                    <div className="text-xl font-extrabold text-white">
                      5 Unit MPV
                    </div>
                    <div className="text-xs text-blue-100">
                      Hyundai Stargazer Petrol
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#00C3FF] shrink-0 mt-0.5" />
                <div className="text-xs text-blue-100 leading-relaxed">
                  <strong className="text-white block mb-0.5">
                    Otentikasi Internal Tertutup (Zero Third-Party OAuth)
                  </strong>
                  Demi keamanan siber korporat, login eksternal (Google Sign-In)
                  dinonaktifkan. Setiap pendaftaran akun baru wajib disetujui
                  oleh <strong>Workplace Solution Admin</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Quick One-Click Demo Accounts for Evaluation */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/15">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2.5">
              Akun Demo Cepat (Klik untuk Isi Otomatis):
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillQuickDemo("WS-001", "AdminCare2026!")}
                className="bg-white/10 hover:bg-white/20 transition rounded-xl p-2.5 border border-white/15 text-xs"
              >
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Workplace Admin</span>
                  <span className="text-[10px] bg-[#0066FF] px-1.5 py-0.5 rounded-full">
                    WS-001
                  </span>
                </div>
                <div className="text-blue-200 text-[11px] truncate">
                  Rina Kartika (Full Control)
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("EMP-101", "Employee2026!")}
                className="bg-white/10 hover:bg-white/20 transition rounded-xl p-2.5 border border-white/15 text-xs"
              >
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Karyawan (Gojek UI)</span>
                  <span className="text-[10px] bg-blue-500/50 px-1.5 py-0.5 rounded-full">
                    EMP-101
                  </span>
                </div>
                <div className="text-blue-200 text-[11px] truncate">
                  Budi Santoso (Sales)
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("DRV-201", "Driver2026!")}
                className="bg-white/10 hover:bg-white/20 transition rounded-xl p-2.5 border border-white/15 text-xs"
              >
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Driver Operasional</span>
                  <span className="text-[10px] bg-blue-500/50 px-1.5 py-0.5 rounded-full">
                    DRV-201
                  </span>
                </div>
                <div className="text-blue-200 text-[11px] truncate">
                  Pak Hendra (GPS & Odo)
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo("EMP-103", "Employee2026!")}
                className="bg-amber-500/20 hover:bg-amber-500/30 transition rounded-xl p-2.5 border border-amber-300/30 text-xs"
              >
                <div className="font-bold text-amber-200 flex items-center justify-between">
                  <span>Pending User</span>
                  <span className="text-[10px] bg-amber-500/40 px-1.5 py-0.5 rounded-full">
                    EMP-103
                  </span>
                </div>
                <div className="text-amber-100 text-[11px] truncate">
                  Andi (Belum Disetujui WS)
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          {/* Gojek-style Segmented Pill Switcher in Samsung Blue */}
          <div className="bg-[#EEF2F9] p-1.5 rounded-full inline-flex self-start mb-8 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                mode === "LOGIN"
                  ? "bg-[#1428A0] text-white shadow-md shadow-blue-900/20"
                  : "text-slate-600 hover:text-[#1428A0]"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk (Login)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                mode === "REGISTER"
                  ? "bg-[#1428A0] text-white shadow-md shadow-blue-900/20"
                  : "text-slate-600 hover:text-[#1428A0]"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Perhatian</div>
                <div className="text-xs mt-0.5 leading-relaxed">{errorMsg}</div>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-start gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  Pendaftaran Menunggu Persetujuan Workplace Solution
                </div>
                <div className="text-xs mt-0.5 leading-relaxed">
                  {successMsg}
                </div>
              </div>
            </div>
          )}

          {mode === "LOGIN" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Selamat Datang di CARE
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Masuk dengan ID Karyawan (NIK) atau Email Korporat internal
                  Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  ID Karyawan / Email Korporat
                </label>
                <div className="relative">
                  <BadgeCheck className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: WS-001, EMP-101, atau email@company.co.id"
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi internal Anda"
                    className="w-full pl-12 pr-12 py-3.5 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-[#E8F0FE]/70 rounded-2xl p-3.5 text-xs text-[#1428A0] flex items-center gap-2.5 border border-blue-200/60">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0066FF]" />
                <span>
                  Dengan masuk, Anda menyetujui kebijakan tata kelola armada &
                  privasi GPS perjalanan dinas{" "}
                  <strong>Workplace Solution</strong> (Sesi otomatis berakhir
                  setelah 30 menit idle).
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] hover:from-[#0F2080] hover:to-[#0052CC] text-white font-bold text-sm shadow-lg shadow-blue-700/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {loading
                    ? "Memverifikasi Kredensial..."
                    : "Masuk ke Sistem CARE"}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Registrasi Akun Internal Baru
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Setiap pendaftaran akun baru akan berstatus{" "}
                  <span className="font-bold text-[#1428A0]">
                    Menunggu Persetujuan (Pending Approval)
                  </span>{" "}
                  dan harus diverifikasi oleh{" "}
                  <span className="font-bold text-[#1428A0]">
                    Workplace Solution Admin
                  </span>{" "}
                  sebelum dapat digunakan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Induk Karyawan (NIK) *
                  </label>
                  <input
                    type="text"
                    required
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    placeholder="Contoh: EMP-105"
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama sesuai ID Karyawan"
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Perusahaan *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@company.co.id"
                      className="w-full pl-10 pr-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Aktif *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-10 pr-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Departemen / Divisi *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Commercial / Engineering / Finance"
                      className="w-full pl-10 pr-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran Akun yang Diajukan *
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) =>
                      setRequestedRole(e.target.value as "EMPLOYEE" | "DRIVER")
                    }
                    className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  >
                    <option value="EMPLOYEE">
                      Karyawan / Pemohon Mobil (Employee)
                    </option>
                    <option value="DRIVER">
                      Pengemudi Operasional (Company Driver)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru (Min. 8 karakter, Huruf Besar, Kecil & Angka) *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Contoh: CareUser2026!"
                  className="w-full px-4 py-3 bg-[#F4F6FA] border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#1428A0] to-[#0066FF] hover:from-[#0F2080] hover:to-[#0052CC] text-white font-bold text-sm shadow-lg shadow-blue-700/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {loading
                    ? "Mengirim Permohonan..."
                    : "Kirim Pendaftaran ke Workplace Solution Admin"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
