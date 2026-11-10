"use client";

import React, { useState } from "react";
import {
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
  ArrowRight,
} from "lucide-react";
import { SafeUser } from "@/lib/types";

interface AuthPortalProps {
  onAuthenticated: (user: SafeUser) => void;
}

export default function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
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
          "Pendaftaran terkirim! Menunggu persetujuan Workplace Solution."
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
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-[400px] bg-white rounded-[28px] shadow-[0_10px_40px_rgba(15,23,42,0.06)] border border-slate-100 overflow-hidden">
        {/* Clean Minimal Gojek-Style Top Header */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#1428A0] flex items-center justify-center mx-auto shadow-md shadow-blue-900/15 mb-3">
            <Car className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            CARE Mobility
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Workplace Solution Operational Fleet
          </p>

          {/* Segmented Pill Toggle */}
          <div className="mt-5 bg-slate-100 p-1 rounded-full grid grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-full text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                mode === "LOGIN"
                  ? "bg-[#1428A0] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-full text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                mode === "REGISTER"
                  ? "bg-[#1428A0] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "LOGIN" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username / ID Karyawan / Email
                </label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:bg-white transition"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-blue-900/15 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Memproses..." : "Masuk"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Username / NIK
                  </label>
                  <input
                    type="text"
                    required
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    placeholder="EMP-105"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Peran
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) =>
                      setRequestedRole(e.target.value as "EMPLOYEE" | "DRIVER")
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  >
                    <option value="EMPLOYEE">Karyawan</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Kantor
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@company.id"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    No. WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Departemen
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Departemen / Divisi"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 8 karakter (Huruf besar, kecil & angka)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <p className="text-[11px] text-slate-500 text-center pt-1">
                Akun baru membutuhkan persetujuan{" "}
                <strong className="text-[#1428A0]">Workplace Solution</strong>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-full bg-[#1428A0] hover:bg-[#0066FF] text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? "Mengirim..." : "Daftar Akun"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
