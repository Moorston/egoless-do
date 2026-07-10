// ─── Rate Limiting (Map-based, in-memory with file persistence) ───
// Each limiter instance tracks a single endpoint's rate by IP.
//
// LIMITATIONS:
// - Single-process only: does NOT work across multiple Node instances (e.g.,
//   cluster mode or multiple Docker containers). For multi-instance
//   deployments, replace with Redis or an external cache.
// - File persistence is best-effort: a hard crash between save intervals
//   (every 30 s) may lose the most recent 30 s of rate-limit data.
// - Persisted entries are keyed by limiter name; changing a limiter name
//   invalidates its persisted state (gracefully — just resets counts).
//
// See: https://github.com/elysiajs/elysia-rate-limit for alternatives.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_ENTRIES = 10_000;

// ─── File-based persistence (best-effort) ──────────────────────────
const RATE_LIMIT_FILE = process.env.RATE_LIMIT_FILE ?? '/tmp/rate-limit-state.json';
const PERSIST_INTERVAL_MS = 30_000;

const _namedLimiters = new Map<string, Map<string, RateLimitEntry>>();
let _persistDirty = false;

function loadPersistedState(): Record<string, Record<string, RateLimitEntry>> {
  try {
    if (!existsSync(RATE_LIMIT_FILE)) return {};
    const raw = readFileSync(RATE_LIMIT_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, Record<string, RateLimitEntry>>;
  } catch {
    return {};
  }
}

function savePersistedState(): void {
  if (!_persistDirty) return;
  _persistDirty = false;
  try {
    const dir = dirname(RATE_LIMIT_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const all: Record<string, Record<string, RateLimitEntry>> = {};
    const now = Date.now();
    for (const [name, attempts] of _namedLimiters) {
      const entries: Record<string, RateLimitEntry> = {};
      for (const [k, v] of attempts) {
        if (now < v.resetAt) entries[k] = v;
      }
      if (Object.keys(entries).length > 0) all[name] = entries;
    }
    writeFileSync(RATE_LIMIT_FILE, JSON.stringify(all));
  } catch { /* best-effort — ignore write failures */ }
}

// Load persisted state into registered maps (called once at startup)
function initPersistence(): void {
  const saved = loadPersistedState();
  const now = Date.now();
  for (const [name, attempts] of _namedLimiters) {
    const persisted = saved[name];
    if (!persisted) continue;
    for (const [k, v] of Object.entries(persisted)) {
      if (now < v.resetAt) attempts.set(k, v);
    }
  }
  // Periodic save (interval keeps process alive — cleared on beforeExit)
  const timer = setInterval(savePersistedState, PERSIST_INTERVAL_MS);
  timer.unref();
}

let _persistenceInitialized = false;

export function createRateLimiter(maxAttempts: number, windowMs: number, name?: string) {
  const attempts = new Map<string, RateLimitEntry>();
  let lastCleanup = 0;

  // Register named limiter for persistence
  if (name) {
    _namedLimiters.set(name, attempts);
    if (!_persistenceInitialized) {
      _persistenceInitialized = true;
      // Defer to allow all named limiters to register first
      queueMicrotask(initPersistence);
    }
  }

  return function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    // Cleanup expired entries periodically (per-limiter)
    if (attempts.size > MAX_RATE_LIMIT_ENTRIES || (attempts.size > 0 && now > lastCleanup + windowMs)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
      if (name) _persistDirty = true;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      if (name) _persistDirty = true;
      return true;
    }
    if (entry.count >= maxAttempts) return false;
    entry.count++;
    if (name) _persistDirty = true;
    return true;
  };
}

/** Pre-configured rate limiters for common use cases */
export const loginRateLimit = createRateLimiter(5, 60_000, 'login');         // 5 req/min per IP
export const emailRateLimit = createRateLimiter(10, 60_000, 'email');        // 10 req/min per email
export const registerRateLimit = createRateLimiter(5, 60_000, 'register');   // 5 req/min per IP
export const sendCodeRateLimit = createRateLimiter(5, 60_000, 'sendCode');   // 5 req/min per IP
export const checkEmailRateLimit = createRateLimiter(3, 60_000, 'checkEmail'); // 3 req/min per IP (strict — user-enum mitigation)
export const resetRateLimit = createRateLimiter(5, 60_000, 'reset');         // 5 req/min per IP
export const wechatRateLimit = createRateLimiter(10, 60_000, 'wechat');      // 10 req/min per IP
export const meRateLimit = createRateLimiter(30, 60_000, 'me');              // 30 req/min per IP
export const refreshRateLimit = createRateLimiter(20, 60_000, 'refresh');    // 20 req/min per IP

/** Extract client IP from Hono context.
 *  Prefers x-real-ip (set by trusted reverse proxies like Nginx/Cloudflare)
 *  over x-forwarded-for, which is user-controlled and easily spoofed. */
export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// ─── PocketBase-backed rate limiter (multi-instance safe) ────────────

interface PBRLRecord {
  key: string;
  count: number;
  window_start: number;
  expires_at: number;
}

const RATE_LIMIT_COLLECTION = 'rate_limits';

/**
 * PocketBase-backed rate limiter — survives restarts and works across instances.
 * Falls back to allow (fail open) if PocketBase is unreachable.
 */
export async function createPBRateLimiter(maxCount: number, windowMs: number) {
  return async (key: string): Promise<boolean> => {
    try {
      const { getAdminPb, escapeFilter } = await import('./pb.js');
      const pb = await getAdminPb();
      const now = Date.now();
      const windowStart = now - windowMs;

      // Ensure collection exists
      try {
        await pb.collections.getOne(RATE_LIMIT_COLLECTION);
      } catch {
        try {
          await pb.collections.create({
            name: RATE_LIMIT_COLLECTION,
            type: 'base',
            schema: [
              { name: 'key', type: 'text', required: true },
              { name: 'count', type: 'number', required: true },
              { name: 'window_start', type: 'number', required: true },
              { name: 'expires_at', type: 'number', required: true },
            ],
            listRule: null, viewRule: null, createRule: null,
            updateRule: null, deleteRule: null,
          });
        } catch { /* collection may already exist from another instance */ }
      }

      // Try to find existing record in current window
      try {
        const records = await pb.collection(RATE_LIMIT_COLLECTION).getList(1, 1, {
          filter: `key = "${escapeFilter(key)}" && window_start > ${windowStart}`,
          sort: '-window_start',
        });
        if (records.items.length > 0) {
          const record = records.items[0];
          const count = (record.count || 0) + 1;
          if (count > maxCount) return false;
          await pb.collection(RATE_LIMIT_COLLECTION).update(record.id, { count });
          return true;
        }
      } catch { /* record not found - create new below */ }

      // Create new window record
      await pb.collection(RATE_LIMIT_COLLECTION).create({
        key, count: 1, window_start: now, expires_at: now + windowMs,
      });
      return true;
    } catch {
      // Fail open if PocketBase is unreachable
      return true;
    }
  };
}

export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    const { getAdminPb } = await import('./pb.js');
    const pb = await getAdminPb();
    // Delete expired records in batches of 100
    const { totalItems } = await pb.collection(RATE_LIMIT_COLLECTION).getList(1, 1, {
      filter: `expires_at < ${Date.now()}`,
    });
    if (totalItems > 0) {
      for (let page = 1; page <= Math.ceil(totalItems / 100); page++) {
        const list = await pb.collection(RATE_LIMIT_COLLECTION).getList(page, 100, {
          filter: `expires_at < ${Date.now()}`,
        });
        for (const item of list.items) {
          await pb.collection(RATE_LIMIT_COLLECTION).delete(item.id);
        }
      }
    }
  } catch { /* best-effort cleanup */ }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => { cleanupExpiredRateLimits().catch(() => {}); }, 5 * 60 * 1000);
}
