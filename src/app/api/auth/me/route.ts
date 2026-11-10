import { NextResponse } from "next/server";
import { getActiveServerUser } from "@/lib/server-guard";
import { appendAuditLog, loadDbAsync, saveDbAsync } from "@/lib/store";
import { sanitizeUser } from "@/lib/auth";

export async function GET() {
  const auth = await getActiveServerUser();
  if (!auth.safeUser || auth.errorResponse) {
    return auth.errorResponse!;
  }
  return NextResponse.json({ user: auth.safeUser });
}

// Allows Driver / Employee to record GPS Tracking Consent (PRD FR-035)
export async function PATCH(request: Request) {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth.errorResponse!;
  }

  const body = await request.json();
  const db = await loadDbAsync();
  const target = db.users.find((u) => u.id === auth.user!.id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (typeof body.gpsConsent === "boolean") {
    target.gpsConsent = body.gpsConsent;
    target.updatedAt = new Date().toISOString();
    await saveDbAsync(db);

    appendAuditLog({
      actorId: target.id,
      actorName: target.name,
      actorRole: target.role,
      action: "GPS_CONSENT_UPDATED",
      entity: "User",
      entityId: target.employeeNo,
      summary: `${target.name} memperbarui persetujuan pelacakan GPS selama perjalanan dinas: ${
        target.gpsConsent ? "DISETUJUI" : "DITOLAK"
      }`,
    });
  }

  return NextResponse.json({ user: sanitizeUser(target) });
}
