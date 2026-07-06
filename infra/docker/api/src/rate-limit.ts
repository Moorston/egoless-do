// ─── Rate Limiting (Map-based, in-memory) ────────────────────────
// Each limiter instance tracks a single endpoint's rate by IP.
//
// NOTE: This implementation is suitable for single-instance deployments.
// For multi-instance/clustered deployments, consider using Redis or an
// external cache to persist rate limits across restarts and instances.
// See: https://github.com/elysiajs/elysia-rate-limit for alternatives.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

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
export const loginRateLimit = createRateLimiter(5, 60_000);     // 5 req/min per IP
export const emailRateLimit = createRateLimiter(10, 60_000);    // 10 req/min per email
export const registerRateLimit = createRateLimiter(5, 60_000);  // 5 req/min per IP
export const sendCodeRateLimit = createRateLimiter(5, 60_000);  // 5 req/min per IP
export const checkEmailRateLimit = createRateLimiter(10, 60_000); // 10 req/min per IP
export const resetRateLimit = createRateLimiter(5, 60_000);     // 5 req/min per IP
export const wechatRateLimit = createRateLimiter(10, 60_000);   // 10 req/min per IP
export const meRateLimit = createRateLimiter(30, 60_000);       // 30 req/min per IP
export const refreshRateLimit = createRateLimiter(20, 60_000);  // 20 req/min per IP

/** Extract client IP from Hono context */
export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
