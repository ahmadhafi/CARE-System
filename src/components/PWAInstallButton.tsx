"use client";

import React, { useState } from "react";
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from "lucide-react";
import { usePWAInstall } from "@/lib/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "button" | "pill" | "banner";
  className?: string;
}

export default function PWAInstallButton({
  variant = "pill",
  className = "",
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running as standalone app, suppress prompt
  if (isInstalled) {
    return null;
  }

  async function handleInstallClick() {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
  }

  // 1. Android / Chromium / Desktop Flow (Native beforeinstallprompt available)
  if (isInstallable) {
    if (variant === "banner") {
      return (
        <div className={`bg-gradient-to-r from-[#1428A0] to-[#0055DF] text-white p-3 rounded-2xl shadow-md flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Install Aplikasi CARE</p>
              <p className="text-[11px] text-blue-100">Pasang di HP Android / Desktop untuk akses cepat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-white text-[#1428A0] font-extrabold text-xs shadow-sm hover:bg-blue-50 active:scale-95 transition shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        title="Pasang Aplikasi (PWA)"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1428A0]/10 hover:bg-[#1428A0]/20 text-[#1428A0] text-xs font-extrabold transition active:scale-95 border border-[#1428A0]/20 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isAndroid ? "Install di Android" : "Install App"}</span>
      </button>
    );
  }

  // 2. iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Pasang di iPhone / iPad"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1428A0] text-white flex items-center justify-center font-black text-xl shadow-md">
                  C
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Install CARE di iPhone</h3>
                  <p className="text-xs text-slate-500">Aplikasi Mobil Operasional Kantor</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1428A0] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tekan tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di bilah navigasi Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1428A0] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Gulir ke bawah dan pilih <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1428A0] text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Tekan <strong>Tambah (Add)</strong> di pojok kanan atas.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-3 rounded-full bg-[#1428A0] text-white font-extrabold text-xs shadow-md shadow-blue-900/15"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const [showManualGuide, setShowManualGuide] = useState(false);

  // Fallback for desktop browser or browser where beforeinstallprompt hasn't fired yet
  return (
    <>
      <button
        type="button"
        onClick={() => setShowManualGuide(true)}
        title="Pasang Aplikasi PWA"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
        <span>Install App</span>
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 relative">
            <button
              type="button"
              onClick={() => setShowManualGuide(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#1428A0] text-white flex items-center justify-center font-black text-lg shadow-md">
                C
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Install Aplikasi CARE</h3>
                <p className="text-[11px] text-slate-500">PWA Multi-Platform (Android & Desktop)</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p>
                <strong>Di HP Android:</strong> Tekan menu browser (ikon titik tiga di kanan atas) lalu pilih <strong>&quot;Install Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong>.
              </p>
              <p>
                <strong>Di Laptop / Desktop:</strong> Klik ikon install/download yang muncul di bilah alamat (URL bar) browser Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowManualGuide(false)}
              className="mt-4 w-full py-2.5 rounded-full bg-[#1428A0] text-white font-extrabold text-xs shadow-md shadow-blue-900/15"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
