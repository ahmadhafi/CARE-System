import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CARE System | Workplace Solution Operational Car Booking",
  description:
    "Corporate Operational Car Booking & Fleet Management Platform by Workplace Solution Department",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F2F5FA] text-slate-900 antialiased selection:bg-[#1428A0] selection:text-white">
        {children}
      </body>
    </html>
  );
}
