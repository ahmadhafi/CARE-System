import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  isWorkplaceAdmin,
  sanitizeUser,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from "./auth";
import { loadDbAsync } from "./store";
import { SafeUser, User } from "./types";

export async function getActiveServerUser(): Promise<{
  user: User | null;
  safeUser: SafeUser | null;
  errorResponse?: NextResponse;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return {
      user: null,
      safeUser: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Sesi tidak ditemukan atau telah berakhir. Silakan masuk kembali. (Unauthorized)",
        },
        { status: 401 }
      ),
    };
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    await clearSessionCookie();
    return {
      user: null,
      safeUser: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Sesi telah kedaluwarsa setelah 30 menit tidak aktif. Silakan login kembali.",
        },
        { status: 401 }
      ),
    };
  }

  const db = await loadDbAsync();
  const liveUser = db.users.find((u) => u.id === payload.sub);

  if (!liveUser) {
    await clearSessionCookie();
    return {
      user: null,
      safeUser: null,
      errorResponse: NextResponse.json(
        { error: "Akun pengguna tidak ditemukan." },
        { status: 401 }
      ),
    };
  }

  if (liveUser.status !== "ACTIVE") {
    await clearSessionCookie();
    const statusMessage =
      liveUser.status === "PENDING_APPROVAL"
        ? "Akun Anda masih menunggu persetujuan Workplace Solution Admin."
        : liveUser.status === "DEACTIVATED"
        ? "Akun Anda telah dinonaktifkan oleh Workplace Solution Admin."
        : "Pendaftaran akun Anda ditolak oleh Workplace Solution Admin.";

    return {
      user: null,
      safeUser: null,
      errorResponse: NextResponse.json(
        { error: statusMessage, accountStatus: liveUser.status },
        { status: 403 }
      ),
    };
  }

  // Rolling 30-minute idle timeout refresh (PRD NFR-004)
  try {
    const refreshedToken = await signSessionToken(liveUser);
    await setSessionCookie(refreshedToken);
  } catch {
    // Ignore cookie set errors in read-only contexts
  }

  return {
    user: liveUser,
    safeUser: sanitizeUser(liveUser),
  };
}

export async function requireWorkplaceAdminUser(): Promise<{
  user: User | null;
  safeUser: SafeUser | null;
  errorResponse?: NextResponse;
}> {
  const auth = await getActiveServerUser();
  if (!auth.user || auth.errorResponse) {
    return auth;
  }

  if (!isWorkplaceAdmin(auth.user.role)) {
    return {
      user: null,
      safeUser: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Akses ditolak. Hanya Workplace Solution Admin yang diizinkan melakukan tindakan ini.",
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
