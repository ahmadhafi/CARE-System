// ============================================================================
// Server-Side Rate Limiter & Brute-Force Protection (PostgreSQL + Memory Fallback)
// Persists across Vercel serverless instances via Prisma `RateLimit` table
// ============================================================================

import { prisma } from "./db";

interface RateBucket {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const memoryBuckets = new Map<string, RateBucket>();

function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && !url.includes("user:password@localhost"));
}

function cleanupExpiredMemoryBuckets() {
  const now = Date.now();
  if (memoryBuckets.size > 5000) {
    memoryBuckets.forEach((bucket, key) => {
      if (
        bucket.resetAt < now &&
        (!bucket.lockedUntil || bucket.lockedUntil < now)
      ) {
        memoryBuckets.delete(key);
      }
    });
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 60_000,
  lockoutMs: number = 300_000
): Promise<RateLimitResult> {
  const now = Date.now();

  if (isPostgresConfigured()) {
    try {
      const existing = await prisma.rateLimit.findUnique({ where: { key } });

      if (existing?.lockedUntil && existing.lockedUntil.getTime() > now) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(
            (existing.lockedUntil.getTime() - now) / 1000
          ),
        };
      }

      if (!existing || existing.resetAt.getTime() < now) {
        await prisma.rateLimit.upsert({
          where: { key },
          create: {
            key,
            count: 1,
            resetAt: new Date(now + windowMs),
            lockedUntil: null,
          },
          update: {
            count: 1,
            resetAt: new Date(now + windowMs),
            lockedUntil: null,
          },
        });
        return {
          allowed: true,
          remaining: maxAttempts - 1,
          retryAfterSeconds: 0,
        };
      }

      const nextCount = existing.count + 1;
      if (nextCount > maxAttempts) {
        const lockedUntil = new Date(now + lockoutMs);
        await prisma.rateLimit.update({
          where: { key },
          data: { count: nextCount, lockedUntil },
        });
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.ceil(lockoutMs / 1000),
        };
      }

      await prisma.rateLimit.update({
        where: { key },
        data: { count: nextCount },
      });

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - nextCount),
        retryAfterSeconds: 0,
      };
    } catch {
      // Fall through to memory bucket if DB table not yet migrated
    }
  }

  cleanupExpiredMemoryBuckets();
  const existing = memoryBuckets.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000),
    };
  }

  if (!existing || existing.resetAt < now) {
    memoryBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  existing.count += 1;

  if (existing.count > maxAttempts) {
    existing.lockedUntil = now + lockoutMs;
    memoryBuckets.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
    };
  }

  memoryBuckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - existing.count),
    retryAfterSeconds: 0,
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  memoryBuckets.delete(key);
  if (isPostgresConfigured()) {
    try {
      await prisma.rateLimit.deleteMany({ where: { key } });
    } catch {
      // ignore
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
