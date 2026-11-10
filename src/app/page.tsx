"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Car,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Compass,
  Navigation,
  RefreshCw,
} from "lucide-react";
import AuthPortal from "@/components/AuthPortal";
import EmployeeGojekApp from "@/components/EmployeeGojekApp";
import DriverTripApp from "@/components/DriverTripApp";
import WorkplaceAdminDashboard from "@/components/WorkplaceAdminDashboard";
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

export default function HomePage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Admin can preview Employee Gojek View or Driver View seamlessly
  const [viewMode, setViewMode] = useState<
    "ADMIN_DASHBOARD" | "EMPLOYEE_GOJEK" | "DRIVER_APP"
  >("ADMIN_DASHBOARD");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<
    MaintenanceBlock[]
  >([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allUsers, setAllUsers] = useState<SafeUser[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    turnaroundBufferMinutes: 30,
    approvalSlaHours: 4,
    cancellationCutoffHours: 2,
    noShowGraceMinutes: 30,
    evRangeBufferMultiplier: 1.2,
    minChargeFuelPercent: 30,
    gpsRetentionDays: 90,
    gpsUpdateIntervalSeconds: 30,
    gpsLostThresholdMinutes: 10,
    minBookingNoticeHours: 2,
    whatsappContactNumber: "+62 811-900-1001",
    departmentDisplayName: "Workplace Solution",
  });

  const loadWorkspaceData = useCallback(async (currentUser: SafeUser) => {
    try {
      const [bkRes, vehRes, usrRes] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/vehicles"),
        fetch("/api/users"),
      ]);

      if (bkRes.ok) {
        const bkData = await bkRes.json();
        setBookings(bkData.bookings || []);
        setNotifications(bkData.notifications || []);
        if (bkData.settings) setSettings(bkData.settings);
      }

      if (vehRes.ok) {
        const vehData = await vehRes.json();
        setCarTypes(vehData.carTypes || []);
        setVehicles(vehData.vehicles || []);
        setMaintenanceBlocks(vehData.maintenanceBlocks || []);
        setDrivers(vehData.drivers || []);
      }

      if (usrRes.ok) {
        const usrData = await usrRes.json();
        setAllUsers(usrData.users || []);
      }

      if (
        currentUser.role === "WORKPLACE_ADMIN" ||
        currentUser.role === "SUPER_ADMIN"
      ) {
        setViewMode((prev) => prev || "ADMIN_DASHBOARD");
      } else if (currentUser.role === "DRIVER") {
        setViewMode("DRIVER_APP");
      } else {
        setViewMode("EMPLOYEE_GOJEK");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            if (
              data.user.role === "WORKPLACE_ADMIN" ||
              data.user.role === "SUPER_ADMIN"
            ) {
              setViewMode("ADMIN_DASHBOARD");
            } else if (data.user.role === "DRIVER") {
              setViewMode("DRIVER_APP");
            } else {
              setViewMode("EMPLOYEE_GOJEK");
            }
            await loadWorkspaceData(data.user);
          }
        }
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, [loadWorkspaceData]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setBookings([]);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0B1536] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center animate-pulse">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div className="text-sm font-bold tracking-wide">
            Memuat Sistem CARE — Workplace Solution...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPortal
        onAuthenticated={async (authenticatedUser) => {
          setUser(authenticatedUser);
          if (
            authenticatedUser.role === "WORKPLACE_ADMIN" ||
            authenticatedUser.role === "SUPER_ADMIN"
          ) {
            setViewMode("ADMIN_DASHBOARD");
          } else if (authenticatedUser.role === "DRIVER") {
            setViewMode("DRIVER_APP");
          } else {
            setViewMode("EMPLOYEE_GOJEK");
          }
          await loadWorkspaceData(authenticatedUser);
        }}
      />
    );
  }

  const isAdmin =
    user.role === "WORKPLACE_ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5FA]">
      {/* Samsung One UI Top Corporate Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1428A0] to-[#0066FF] flex items-center justify-center text-white shadow-md">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-[#1428A0] tracking-tight">
                  CARE System
                </span>
                <span className="bg-[#E8F0FE] text-[#1428A0] text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  Workplace Solution
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Corporate Operational Car Booking & Fleet Management
              </div>
            </div>
          </div>

          {/* Mode Switcher (Admin can inspect all 3 channels: Admin Dashboard, Gojek Employee UI, Driver App) */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="bg-[#EEF2F9] p-1 rounded-full flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("ADMIN_DASHBOARD")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    viewMode === "ADMIN_DASHBOARD"
                      ? "bg-[#1428A0] text-white shadow-sm"
                      : "text-slate-600 hover:text-[#1428A0]"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>WS Admin Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("EMPLOYEE_GOJEK")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    viewMode === "EMPLOYEE_GOJEK"
                      ? "bg-[#0066FF] text-white shadow-sm"
                      : "text-slate-600 hover:text-[#1428A0]"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Aplikasi Pemohon (Gojek UI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("DRIVER_APP")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    viewMode === "DRIVER_APP"
                      ? "bg-[#0B1536] text-white shadow-sm"
                      : "text-slate-600 hover:text-[#1428A0]"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Aplikasi Driver (GPS)</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => loadWorkspaceData(user)}
              title="Refresh Data"
              className="p-2.5 rounded-full bg-[#F4F6FA] hover:bg-[#E8F0FE] text-[#1428A0] border border-slate-200 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 bg-[#F4F6FA] px-3.5 py-1.5 rounded-full border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] font-bold text-[#1428A0]">
                  {user.employeeNo} • {user.role}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === "ADMIN_DASHBOARD" && isAdmin && (
          <WorkplaceAdminDashboard
            currentUser={user}
            bookings={bookings}
            carTypes={carTypes}
            vehicles={vehicles}
            drivers={drivers}
            maintenanceBlocks={maintenanceBlocks}
            allUsers={allUsers}
            onRefresh={() => loadWorkspaceData(user)}
          />
        )}

        {viewMode === "EMPLOYEE_GOJEK" && (
          <EmployeeGojekApp
            user={user}
            bookings={
              isAdmin
                ? bookings
                : bookings.filter((b) => b.requesterId === user.id)
            }
            carTypes={carTypes}
            vehicles={vehicles}
            notifications={notifications}
            settings={settings}
            onRefresh={() => loadWorkspaceData(user)}
          />
        )}

        {viewMode === "DRIVER_APP" && (
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
            onRefresh={() => loadWorkspaceData(user)}
          />
        )}
      </main>

      {/* Corporate Security Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <strong>CARE System v1.0</strong> — Owned & Managed by{" "}
            <span className="font-bold text-[#1428A0]">
              Workplace Solution Department
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>🔒 Internal Corporate Auth (No External OAuth)</span>
            <span>•</span>
            <span>🛡️ HttpOnly JWT + Rate-Limited API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
