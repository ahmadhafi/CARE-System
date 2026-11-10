// ============================================================================
// Server-Side Rate Limiter & Brute-Force Protection
// Protects authentication & mutation endpoints from brute-force / DoS attacks
// ============================================================================

interface RateBucket {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const buckets = new Map<string, RateBucket>();

// Periodic cleanup to prevent memory exhaustion
function cleanupExpiredBuckets() {
  const now = Date.now();
  if (buckets.size > 5000) {
    buckets.forEach((bucket, key) => {
      if (bucket.resetAt < now && (!bucket.lockedUntil || bucket.lockedUntil < now)) {
        buckets.delete(key);
      }
    });
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks and increments rate limit for a given identifier (IP + action).
 * @param key Unique identifier (e.g., `login:127.0.0.1:EMP-101`)
 * @param maxAttempts Max allowed requests in window
 * @param windowMs Window duration in ms
 * @param lockoutMs Optional lockout duration if maxAttempts is exceeded
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 60_000,
  lockoutMs: number = 300_000
): RateLimitResult {
  cleanupExpiredBuckets();
  const now = Date.now();
  const existing = buckets.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000),
    };
  }

  if (!existing || existing.resetAt < now) {
    buckets.set(key, {
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
    buckets.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
    };
  }

  buckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - existing.count),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
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
