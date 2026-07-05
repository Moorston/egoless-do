import { NextRequest } from 'next/server';

/** Extract client IP from request headers. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Create a per-IP rate limiter.
 * @param maxAttempts - Max requests per window
 * @param windowMs - Time window in milliseconds
 */
const MAX_RATE_LIMIT_ENTRIES = 10_000;

export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, RateLimitEntry>();
  let lastCleanup = 0;

  return function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    // Cleanup expired entries periodically (per-limiter)
    if (attempts.size > MAX_RATE_LIMIT_ENTRIES || (attempts.size > 0 && now > lastCleanup + windowMs)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxAttempts) return false;
    entry.count++;
    return true;
  };
}

/** Pre-configured rate limiters for common use cases */
export const loginRateLimit = createRateLimiter(5, 60_000);
export const sendCodeRateLimit = createRateLimiter(5, 60_000);
export const checkEmailRateLimit = createRateLimiter(10, 60_000);
