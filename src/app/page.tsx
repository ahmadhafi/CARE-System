"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Car } from "lucide-react";
import AuthPortal from "@/components/AuthPortal";
import EmployeeGojekApp from "@/components/EmployeeGojekApp";
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

  const loadWorkspaceData = useCallback(async () => {
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
            await loadWorkspaceData();
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
      <div className="min-h-screen bg-[#EEF2F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[#1428A0] flex items-center justify-center shadow-md animate-pulse">
            <Car className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-extrabold text-slate-600">care</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPortal
        onAuthenticated={async (authenticatedUser) => {
          setUser(authenticatedUser);
          await loadWorkspaceData();
        }}
      />
    );
  }

  return (
    <EmployeeGojekApp
      user={user}
      bookings={bookings}
      carTypes={carTypes}
      vehicles={vehicles}
      drivers={drivers}
      maintenanceBlocks={maintenanceBlocks}
      allUsers={allUsers}
      notifications={notifications}
      settings={settings}
      onRefresh={() => loadWorkspaceData()}
      onUserUpdated={async (updatedUser) => {
        setUser(updatedUser);
        await loadWorkspaceData();
      }}
      onLogout={handleLogout}
    />
  );
}
