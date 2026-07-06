// ─── GET /api/setup ──────────────────────────────────────────────
// PocketBase 集合自动初始化（一次性）
import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { getPb } from './pb.js';
import { getClientIp } from './rate-limit.js';

const COLLECTIONS = [
  { name: 'habits',             idField: 'habit_id' },
  { name: 'reflections',        idField: 'reflection_id' },
  { name: 'fasting_sessions',   idField: 'session_id' },
  { name: 'food_entries',       idField: 'food_id' },
  { name: 'checkin_records',    idField: 'date' },
  { name: 'meditation_history', idField: 'date' },
  { name: 'user_profiles',      idField: 'profile_id' },
  { name: 'exercise_entries',   idField: 'exercise_id' },
  { name: 'plans',              idField: 'plan_id' },
  { name: 'plan_items',         idField: 'plan_item_id' },
  { name: 'plan_item_checkins', idField: 'checkin_id' },
  { name: 'grace_history',      idField: 'date' },
  { name: 'daily_custom_todos', idField: 'todo_id' },
  { name: 'daily_todo_history', idField: 'history_id' },
  { name: 'thought_trails',     idField: 'trail_id' },
  { name: 'trail_notes',        idField: 'note_id' },
  { name: 'reflection_links',   idField: 'link_id' },
  { name: 'ai_configs',         idField: 'config_id' },
  { name: 'checkin_reviews',    idField: 'review_id' },
];

// Rate limiter
const setupRateLimit = (() => {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  let lastCleanup = 0;
  return (ip: string): boolean => {
    const now = Date.now();
    if (attempts.size > 10_000 || (attempts.size > 0 && now > lastCleanup + 60_000)) {
      for (const [key, entry] of attempts) {
        if (now > entry.resetAt) attempts.delete(key);
      }
      lastCleanup = now;
    }
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= 3) return false; // 3 req/min
    entry.count++;
    return true;
  };
})();

const app = new Hono();

app.get('/setup', async (c) => {
  const ip = getClientIp(c);
  if (!setupRateLimit(ip)) {
    return c.json({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  // Require SETUP_SECRET to protect this endpoint (passed via header, not URL)
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return c.json({ error: 'Service unavailable' }, 503);
  }
  const token = c.req.header('x-setup-secret');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  // Use HMAC to produce fixed-length hashes, avoiding timing side-channel on length
  // Use environment variable for HMAC key, fallback to setup secret itself
  const hmacKey = process.env.SETUP_HMAC_KEY || setupSecret;
  const tokenHash = createHmac('sha256', hmacKey).update(token).digest();
  const secretHash = createHmac('sha256', hmacKey).update(setupSecret).digest();
  if (!timingSafeEqual(tokenHash, secretHash)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    return c.json({ error: '需要设置 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD 环境变量' }, 500);
  }

  const pb = getPb();
  const results: string[] = [];

  try {
    // Authenticate as admin
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);

    for (const col of COLLECTIONS) {
      try {
        await pb.collections.getOne(col.name);
        results.push(`${col.name}: already exists`);
      } catch {
        // Collection doesn't exist, create it
        await pb.collections.create({
          name: col.name,
          type: 'base',
          fields: [
            { name: 'user_id', type: 'text', required: true },
            { name: col.idField, type: 'text', required: true },
            { name: 'data', type: 'json' },
          ],
          listRule: 'user_id = @request.auth.id',
          viewRule: 'user_id = @request.auth.id',
          createRule: 'user_id = @request.auth.id',
          updateRule: 'user_id = @request.auth.id',
          deleteRule: 'user_id = @request.auth.id',
        });
        results.push(`${col.name}: created`);
      }
    }

    return c.json({ success: true, results });
  } catch (err: unknown) {
    return c.json({ error: '集合初始化失败，请检查管理员凭据', results }, 500);
  }
});

export default app;
