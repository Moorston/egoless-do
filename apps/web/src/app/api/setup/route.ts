import { NextResponse } from 'next/server';
import { getPb } from '../_pb';
import { createHmac, timingSafeEqual } from 'crypto';
import { getClientIp, createRateLimiter } from '../_rateLimit';

const setupRateLimit = createRateLimiter(3, 60_000); // 3 req/min

// ── PocketBase collection auto-setup ──────────────────────────────
// Call GET /api/setup once to create all required collections.
// Requires PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env vars.

const COLLECTIONS = [
  { name: 'users',              system: true }, // built-in, skip
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

export async function GET(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!setupRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  // Require SETUP_SECRET to protect this endpoint (passed via header, not URL)
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json({ error: 'SETUP_SECRET not configured' }, { status: 503 });
  }
  const token = request.headers.get('x-setup-secret');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Use HMAC to produce fixed-length hashes, avoiding timing side-channel on length
  const tokenHash = createHmac('sha256', 'setup-secret-compare').update(token).digest();
  const secretHash = createHmac('sha256', 'setup-secret-compare').update(setupSecret).digest();
  if (!timingSafeEqual(tokenHash, secretHash)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPass = process.env.PB_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    return NextResponse.json({ error: '需要设置 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD 环境变量' }, { status: 500 });
  }

  const pb = getPb();
  const results: string[] = [];

  try {
    // Authenticate as admin
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);

    for (const col of COLLECTIONS) {
      if (col.system) continue;
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

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    console.error('[Setup] Error:', err);
    return NextResponse.json({ error: '集合初始化失败，请检查管理员凭据', results }, { status: 500 });
  }
}
