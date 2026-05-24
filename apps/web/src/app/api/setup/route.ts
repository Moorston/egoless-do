import { NextResponse } from 'next/server';
import { getPb } from '../_pb';

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
];

export async function GET() {
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
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Setup failed', results }, { status: 500 });
  }
}
