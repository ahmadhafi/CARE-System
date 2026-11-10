// ============================================================================
// Server-Only Authentication, Password Hashing & Session Management
// Strictly isolated to Server Components / Route Handlers. Never imported in Client.
// ============================================================================

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SafeUser, User, UserRole } from "./types";

export const SESSION_COOKIE_NAME = "care_ws_session";
const SESSION_TIMEOUT_MINUTES = Number(
  process.env.SESSION_TIMEOUT_MINUTES || "30"
);

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "care-system-workplace-solution-internal-server-secret-2026-hmac-sha256";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;
  employeeNo: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 12);
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

export async function signSessionToken(user: User): Promise<string> {
  const payload: SessionPayload = {
    sub: user.id,
    employeeNo: user.employeeNo,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("care-workplace-solution")
    .setAudience("care-internal-users")
    .setExpirationTime(`${SESSION_TIMEOUT_MINUTES}m`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: "care-workplace-solution",
      audience: "care-internal-users",
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TIMEOUT_MINUTES * 60,
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function isWorkplaceAdmin(role?: UserRole): boolean {
  return role === "WORKPLACE_ADMIN" || role === "SUPER_ADMIN";
}
