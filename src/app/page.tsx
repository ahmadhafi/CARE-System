"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Car,
  LogOut,
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
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1428A0] flex items-center justify-center shadow-md animate-pulse">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-500">Memuat CARE...</span>
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
    <div className="min-h-screen flex flex-col bg-[#F5F7FB]">
      {/* Minimalist Gojek-Style Sticky App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#1428A0] flex items-center justify-center text-white shrink-0 shadow-sm">
              <Car className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-base text-slate-900 tracking-tight">
                CARE
              </span>
              <span className="bg-[#EEF4FF] text-[#1428A0] text-[10px] font-bold px-2 py-0.5 rounded-full truncate">
                Workplace Solution
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAdmin && (
              <div className="bg-slate-100 p-0.5 rounded-full flex items-center">
                <button
                  type="button"
                  onClick={() => setViewMode("ADMIN_DASHBOARD")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${
                    viewMode === "ADMIN_DASHBOARD"
                      ? "bg-[#1428A0] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("EMPLOYEE_GOJEK")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${
                    viewMode === "EMPLOYEE_GOJEK"
                      ? "bg-[#0066FF] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>GoCar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("DRIVER_APP")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${
                    viewMode === "DRIVER_APP"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>Driver</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => loadWorkspaceData(user)}
              title="Muat Ulang"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
              <div className="w-5 h-5 rounded-full bg-[#1428A0] text-white text-[10px] font-bold flex items-center justify-center">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate">
                {user.name.split(" ")[0]}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {user.employeeNo}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              className="h-8 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 pb-24 md:pb-10">
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
    </div>
  );
}
