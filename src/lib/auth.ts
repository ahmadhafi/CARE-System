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

// Per-process ephemeral key for local dev only when .env.local has no JWT_SECRET.
// Never hardcoded in source code; in production JWT_SECRET (>=32 chars) is mandatory.
declare global {
  // eslint-disable-next-line no-var
  var __careDevEphemeralJwtSecret: Uint8Array | undefined;
}

function getJwtSecretKey(): Uint8Array {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set and at least 32 characters long in production."
    );
  }

  if (!global.__careDevEphemeralJwtSecret) {
    const randomBytes = new Uint8Array(48);
    crypto.getRandomValues(randomBytes);
    global.__careDevEphemeralJwtSecret = randomBytes;
  }
  return global.__careDevEphemeralJwtSecret;
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

export function sanitizeUser(user: User | SafeUser): SafeUser {
  const { passwordHash: _removed, ...safe } = user as User;
  void _removed;
  return safe;
}

export async function signSessionToken(
  user: User | SafeUser
): Promise<string> {
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

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TIMEOUT_MINUTES * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
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
