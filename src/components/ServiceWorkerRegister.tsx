"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[CARE PWA] Service worker registered, scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[CARE PWA] Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
