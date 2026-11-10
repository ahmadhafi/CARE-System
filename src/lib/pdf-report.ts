// ============================================================================
// CARE System - Workplace Solution Fleet Trip PDF & CSV Report Generator
// Generates branded Samsung Navy corporate PDF reports with jsPDF & AutoTable
// ============================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FleetReportPayload {
  generatedBy: string;
  periodLabel: string;
  kpis: {
    totalBookings: number;
    completedTrips: number;
    activeTrips: number;
    pendingApprovals: number;
    pendingUserApprovals: number;
    totalDistanceKm: number;
    medianApprovalHours: number;
    maxApprovalHours: number;
    noShowRatePct: number;
    cancellationRatePct: number;
    lateCancelCount: number;
    mismatchCount: number;
    whatsappSharePct: number;
  };
  powertrainComparison: {
    powertrain: string;
    trips: number;
    hours: number;
    distanceKm: number;
    vehiclesCount: number;
  }[];
  vehicleReport: {
    plateNo: string;
    model: string;
    powertrain: string;
    status: string;
    odometerKm: number;
    currentLevel: number;
    totalTrips: number;
    scheduledTrips: number;
    totalHours: number;
    totalDistanceKm: number;
    utilizationPct: number;
  }[];
  tripComparisonReport: {
    bookingNo: string;
    startAt: string;
    endAt: string;
    requesterName: string;
    requesterDepartment: string;
    actualUsers: string[];
    requesterMatched: boolean;
    destination: string;
    purpose: string;
    vehiclePlate: string;
    vehicleModel: string;
    powertrain: string;
    driverName: string;
    odoStart: number;
    odoEnd: number;
    distanceKm: number;
    levelStart: number;
    levelEnd: number;
    status: string;
    channel: string;
    lateReturn: boolean;
  }[];
}

export function generateFleetTripPdfReport(data: FleetReportPayload): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const nowStr = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // 1. Top Corporate Banner (Samsung Deep Navy #1428A0)
  doc.setFillColor(20, 40, 160);
  doc.rect(0, 0, 297, 28, "F");

  // Accent bar (#0066FF)
  doc.setFillColor(0, 102, 255);
  doc.rect(0, 28, 297, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(
    "CARE SYSTEM — LAPORAN PERJALANAN ARMADA (FLEET TRIP REPORT)",
    14,
    12
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    "Departemen: WORKPLACE SOLUTION (Operational Car & Fleet Management)",
    14,
    19
  );
  doc.text(
    `Periode Filter: ${data.periodLabel}   |   Dicetak oleh: ${data.generatedBy}   |   Waktu Cetak: ${nowStr} WIB`,
    14,
    24.5
  );

  // 2. KPI Summary Cards Row
  const kpiBoxes = [
    {
      label: "Total Booking",
      value: `${data.kpis.totalBookings} Trip`,
      sub: `${data.kpis.completedTrips} Selesai • ${data.kpis.activeTrips} Aktif`,
    },
    {
      label: "Total Jarak Tempuh",
      value: `${data.kpis.totalDistanceKm.toLocaleString("id-ID")} KM`,
      sub: "Berdasarkan Odometer Aktual",
    },
    {
      label: "Median Waktu Approval",
      value: `${data.kpis.medianApprovalHours} Jam`,
      sub: `Maks: ${data.kpis.maxApprovalHours} Jam (Target <= 4j)`,
    },
    {
      label: "Kesesuaian Penumpang",
      value: `${data.kpis.mismatchCount} Mismatch`,
      sub: "Pemohon vs Penumpang Aktual",
    },
    {
      label: "No-Show & Batal",
      value: `${data.kpis.noShowRatePct}% No-Show`,
      sub: `Batal: ${data.kpis.cancellationRatePct}% (WA: ${data.kpis.whatsappSharePct}%)`,
    },
  ];

  const boxWidth = 51.5;
  const startX = 14;
  kpiBoxes.forEach((box, idx) => {
    const x = startX + idx * (boxWidth + 2.8);
    doc.setFillColor(244, 246, 250);
    doc.setDrawColor(215, 224, 242);
    doc.roundedRect(x, 34, boxWidth, 18, 2.5, 2.5, "FD");

    doc.setTextColor(95, 108, 133);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(box.label.toUpperCase(), x + 3, 39);

    doc.setTextColor(20, 40, 160);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(box.value, x + 3, 45.5);

    doc.setTextColor(80, 90, 110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(box.sub, x + 3, 50);
  });

  // 3. Section 1: Detailed Fleet Trip Log & Requester vs Actual User Comparison (FR-051, FR-053)
  doc.setTextColor(20, 40, 160);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    "1. Rincian Perjalanan Armada Operasional & Audit Penumpang Aktual (FR-051 / FR-053)",
    14,
    59
  );

  const tripRows = data.tripComparisonReport.map((t) => {
    const dt = new Date(t.startAt).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return [
      t.bookingNo,
      dt,
      `${t.vehiclePlate}\n(${t.powertrain})`,
      t.driverName,
      `${t.requesterName}\n[${t.requesterDepartment}]`,
      t.actualUsers.join(", "),
      t.requesterMatched ? "SESUAI" : "MISMATCH (!)",
      t.destination,
      `${t.odoStart.toLocaleString("id-ID")} -> ${
        t.odoEnd ? t.odoEnd.toLocaleString("id-ID") : "Aktif"
      }`,
      `${t.distanceKm} km`,
      `${t.levelStart}% -> ${t.levelEnd ?? "-"}%`,
      t.status,
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [
      [
        "No. Booking",
        "Waktu Berangkat",
        "Kendaraan",
        "Driver",
        "Pemohon (Requester)",
        "Penumpang Aktual",
        "Audit User",
        "Tujuan Dinas",
        "Odometer (KM)",
        "Jarak",
        "Baterai/BBM",
        "Status",
      ],
    ],
    body:
      tripRows.length > 0
        ? tripRows
        : [
            [
              "-",
              "-",
              "-",
              "-",
              "Belum ada data perjalanan pada periode ini",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
            ],
          ],
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [20, 40, 160],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [246, 248, 253],
    },
    didParseCell(hookData) {
      if (
        hookData.section === "body" &&
        hookData.column.index === 6 &&
        String(hookData.cell.raw).includes("MISMATCH")
      ) {
        hookData.cell.styles.textColor = [190, 18, 60];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || 120;

  if (finalY > 145) {
    doc.addPage();
    finalY = 18;
  } else {
    finalY += 8;
  }

  // 4. Section 2: Vehicle Utilization & Powertrain Comparison (FR-051 & FR-055)
  doc.setTextColor(20, 40, 160);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    "2. Rekapitulasi Utilisasi per Kendaraan & Perbandingan EV vs Bensin (FR-051 / FR-055)",
    14,
    finalY
  );

  const vehicleRows = data.vehicleReport.map((v) => [
    v.plateNo,
    v.model,
    v.powertrain,
    v.status,
    `${v.odometerKm.toLocaleString("id-ID")} km`,
    `${v.currentLevel}%`,
    String(v.totalTrips),
    `${v.totalHours} jam`,
    `${v.totalDistanceKm.toLocaleString("id-ID")} km`,
    `${v.utilizationPct}%`,
  ]);

  autoTable(doc, {
    startY: finalY + 3,
    head: [
      [
        "Plat Nomor",
        "Model Kendaraan",
        "Powertrain",
        "Status",
        "Odometer Terkini",
        "Baterai/BBM",
        "Trip Selesai",
        "Total Jam Pakai",
        "Total Jarak Tempuh",
        "Utilisasi",
      ],
    ],
    body: vehicleRows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 102, 255],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [244, 246, 250],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signY = Math.min(182, ((doc as any).lastAutoTable?.finalY || 160) + 10);
  doc.setTextColor(60, 70, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Dokumen ini dihasilkan secara otomatis dari Sistem CARE (Workplace Solution) dan tercatat pada Audit Log.",
    14,
    signY
  );
  doc.setFont("helvetica", "bold");
  doc.text(
    `Disahkan oleh Workplace Solution Admin: ${data.generatedBy}`,
    205,
    signY
  );

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan-Perjalanan-Armada-Workplace-Solution-${safeDate}.pdf`);
}

export function exportFleetReportToCsv(data: FleetReportPayload): void {
  const headers = [
    "No Booking",
    "Waktu Berangkat",
    "Waktu Selesai",
    "Plat Kendaraan",
    "Model Kendaraan",
    "Powertrain",
    "Nama Driver",
    "Pemohon (Requester)",
    "Departemen",
    "Penumpang Aktual",
    "Kesesuaian User",
    "Tujuan",
    "Keperluan",
    "Odometer Awal (KM)",
    "Odometer Akhir (KM)",
    "Jarak Tempuh (KM)",
    "Level Awal (%)",
    "Level Akhir (%)",
    "Channel",
    "Status",
  ];

  const escapeCsv = (val: unknown) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = data.tripComparisonReport.map((t) =>
    [
      t.bookingNo,
      t.startAt,
      t.endAt,
      t.vehiclePlate,
      t.vehicleModel,
      t.powertrain,
      t.driverName,
      t.requesterName,
      t.requesterDepartment,
      t.actualUsers.join("; "),
      t.requesterMatched ? "SESUAI" : "MISMATCH",
      t.destination,
      t.purpose,
      t.odoStart,
      t.odoEnd,
      t.distanceKm,
      t.levelStart,
      t.levelEnd,
      t.channel,
      t.status,
    ]
      .map(escapeCsv)
      .join(",")
  );

  const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Workplace-Solution-Fleet-Trips-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
