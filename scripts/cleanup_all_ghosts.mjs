#!/usr/bin/env node
/**
 * Cleanup ghost entries (deleted=true OR unparseable data) from ALL PocketBase sync collections.
 * Run: node scripts/cleanup_all_ghosts.mjs
 *
 * Ghost types:
 * 1. Records with `data.deleted === true` — soft-deleted records that weren't fully purged
 * 2. Records with empty/null name — corrupted/incomplete sync data
 * 3. Records with unparseable data field
 */

const PB_URL = process.env.PB_URL ?? 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables');
  process.exit(1);
}

/** Decode UTF-8 byte array to string */
function decodeUtf8(arr) {
  let s = '', i = 0;
  while (i < arr.length) {
    const b = arr[i];
    if (b < 0x80) { s += String.fromCharCode(b); i++; }
    else if ((b & 0xE0) === 0xC0) { s += String.fromCharCode(((b & 0x1F) << 6) | (arr[i+1] & 0x3F)); i += 2; }
    else if ((b & 0xF0) === 0xE0) { s += String.fromCharCode(((b & 0x0F) << 12) | ((arr[i+1] & 0x3F) << 6) | (arr[i+2] & 0x3F)); i += 3; }
    else if ((b & 0xF8) === 0xF0) { const cp = ((b & 0x07) << 18) | ((arr[i+1] & 0x3F) << 12) | ((arr[i+2] & 0x3F) << 6) | (arr[i+3] & 0x3F); s += String.fromCodePoint(cp); i += 4; }
    else { s += String.fromCharCode(b); i++; }
  }
  return s;
}

/** Parse data field: may be object, JSON string, or byte array */
function parseData(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return null; } }
  if (Array.isArray(data) && data.length > 0 && data.every(e => typeof e === 'number')) {
    try { return JSON.parse(decodeUtf8(data)); } catch { return null; }
  }
  return null;
}

// All sync collections and their ghost-detection checks
// Each entry checks: deleted flag, name emptiness, and data parseability
const COLLECTIONS = [
  // ── Food ──────────────────────────────────────────
  { coll: 'food_entries',          idField: 'food_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Exercise ──────────────────────────────────────
  { coll: 'exercise_entries',      idField: 'exercise_id',
    check: d => d?.deleted === true || (!d?.sport_key && !d?.sportKey) },

  // ── Plans ─────────────────────────────────────────
  { coll: 'plans',                 idField: 'plan_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Plan Items ────────────────────────────────────
  { coll: 'plan_items',            idField: 'plan_item_id',
    check: d => d?.deleted === true || (!d?.name && !d?.plan_id && !d?.planId) },

  // ── Body ──────────────────────────────────────────
  { coll: 'body_goals',            idField: 'goal_id',
    check: d => d?.deleted === true || (!d?.target_weight && !d?.targetWeight && !d?.target_body_fat && !d?.targetBodyFat) },
  { coll: 'body_plans',            idField: 'plan_id',
    check: d => d?.deleted === true || !d?.part },
  { coll: 'weight_records',        idField: 'weight_id',
    check: d => d?.deleted === true || !d?.date },
  { coll: 'body_checkins',         idField: 'checkin_id',
    check: d => d?.deleted === true || !d?.date },

  // ── Vows / Visions ────────────────────────────────
  { coll: 'visions',               idField: 'vision_id',
    check: d => d?.deleted === true || (!d?.text && !d?.type) },
  { coll: 'vision_practices',      idField: 'practice_id',
    check: d => d?.deleted === true || (!d?.vision_id && !d?.visionId) },
  { coll: 'dedications',           idField: 'dedication_id',
    check: d => d?.deleted === true || (!d?.date && !d?.period_label && !d?.periodLabel) },

  // ── Mantra ────────────────────────────────────────
  { coll: 'mantra_defs',           idField: 'mantra_id',
    check: d => d?.deleted === true || !d?.name },
  { coll: 'mantra_sessions',       idField: 'session_id',
    check: d => d?.deleted === true || (!d?.mantra_id && !d?.mantraId && !d?.date) },

  // ── Zhi Guan ──────────────────────────────────────
  { coll: 'zhiguan_sessions',      idField: 'zhiguan_id',
    check: d => d?.deleted === true || (!d?.start_ts && !d?.startTs && !d?.status) },

  // ── Fear & Courage ────────────────────────────────
  { coll: 'fear_entries',          idField: 'fear_id',
    check: d => d?.deleted === true || (!d?.content && !d?.date) },
  { coll: 'courage_entries',       idField: 'courage_id',
    check: d => d?.deleted === true || (!d?.action && !d?.date) },

  // ── Fasting ───────────────────────────────────────
  { coll: 'fasting_sessions',      idField: 'session_id',
    check: d => d?.deleted === true || (!d?.target_hours && !d?.targetHours && !d?.started_at && !d?.startedAt) },

  // ── Sleep ─────────────────────────────────────────
  { coll: 'sleep_records',         idField: 'sleep_id',
    check: d => d?.deleted === true || !d?.date },

  // ── Give ──────────────────────────────────────────
  { coll: 'give_entries',          idField: 'give_id',
    check: d => d?.deleted === true || !d?.content },

  // ── Breath ────────────────────────────────────────
  { coll: 'breath_records',        idField: 'breath_id',
    check: d => d?.deleted === true || (!d?.date && !d?.preset_key && !d?.presetKey) },

  // ── Eating ────────────────────────────────────────
  { coll: 'eating_motivations',    idField: 'motivation_id',
    check: d => d?.deleted === true || (!d?.food_id && !d?.foodId) },
  { coll: 'custom_wuxing_maps',    idField: 'wuxing_id',
    check: d => d?.deleted === true || (!d?.food_name && !d?.foodName) },

  // ── Sutra ─────────────────────────────────────────
  { coll: 'sutra_reading_sessions',idField: 'reading_id',
    check: d => d?.deleted === true || (!d?.mantra_id && !d?.mantraId && !d?.date) },

  // ── Reflections ───────────────────────────────────
  { coll: 'reflections',           idField: 'reflection_id',
    check: d => d?.deleted === true || (!d?.content && !d?.created_at && !d?.createdAt) },
  { coll: 'reflection_links',      idField: 'link_id',
    check: d => d?.deleted === true || (!d?.from_id && !d?.fromId) },

  // ── Meditation ────────────────────────────────────
  { coll: 'meditation_history',    idField: 'date',
    check: d => d?.deleted === true || !d?.date },

  // ── Check-in ──────────────────────────────────────
  { coll: 'checkin_records',       idField: 'date',
    check: d => d?.deleted === true || !d?.date },

  // ── Habits ────────────────────────────────────────
  { coll: 'habits',                idField: 'habit_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Daily Todos ───────────────────────────────────
  { coll: 'daily_custom_todos',    idField: 'todo_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Thought Trails ────────────────────────────────
  { coll: 'thought_trails',        idField: 'trail_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Trail Notes ───────────────────────────────────
  { coll: 'trail_notes',           idField: 'note_id',
    check: d => d?.deleted === true || (!d?.content && !d?.trail_id && !d?.trailId) },

  // ── AI Configs ────────────────────────────────────
  { coll: 'ai_configs',            idField: 'config_id',
    check: d => d?.deleted === true },

  // ── Checkin Reviews ───────────────────────────────
  { coll: 'checkin_reviews',       idField: 'review_id',
    check: d => d?.deleted === true },

  // ── Grace History ─────────────────────────────────
  { coll: 'grace_history',         idField: 'date',
    check: d => d?.deleted === true },

  // ── Custom Food Presets ───────────────────────────
  { coll: 'custom_food_presets',   idField: 'preset_id',
    check: d => d?.deleted === true || !d?.name },

  // ── Fear Achievements ─────────────────────────────
  { coll: 'fear_achievements',     idField: 'achievement_id',
    check: d => d?.deleted === true },

  // ── Push Tokens ───────────────────────────────────
  { coll: 'push_tokens',           idField: 'token',
    check: d => d?.deleted === true || !d?.token },

  // ── Published Minds ───────────────────────────────
  { coll: 'published_minds',       idField: 'anon_id',
    check: d => d?.deleted === true || !d?.content },
];

async function main() {
  console.log(`Connecting to ${PB_URL}...`);
  const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!authRes.ok) {
    console.error('Admin auth failed:', authRes.status, await authRes.text());
    process.exit(1);
  }
  const { token } = await authRes.json();
  console.log('✅ Admin authenticated\n');

  const headers = { Authorization: token };
  let totalGhosts = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const { coll, idField, check } of COLLECTIONS) {
    let page = 1;
    const perPage = 100;
    const ghostIds = [];
    const ghostInfos = [];

    while (true) {
      const res = await fetch(`${PB_URL}/api/collections/${coll}/records?page=${page}&perPage=${perPage}`, { headers });
      if (!res.ok) { console.error(`  ❌ Query ${coll} failed: ${res.status}`); break; }
      const data = await res.json();
      for (const item of data.items) {
        const parsed = parseData(item.data);
        if (!parsed || check(parsed)) {
          ghostIds.push(item.id);

          // Determine ghost type for reporting
          let reason = '';
          if (!parsed) reason = 'unparseable data';
          else if (parsed.deleted === true) reason = 'deleted=true';
          else if (parsed.name === undefined || parsed.name === null || parsed.name === '') reason = 'empty name';
          else reason = 'empty required field';
          ghostInfos.push({ id: item.id, fieldId: item[idField], reason });
        }
      }
      if (page >= data.totalPages) break;
      page++;
    }

    if (ghostIds.length > 0) {
      console.log(`📦 ${coll} (${idField}): ${ghostIds.length} ghost entries`);
      for (const gi of ghostInfos) {
        console.log(`      id=${gi.id} ${idField}=${gi.fieldId ?? '?'} → ${gi.reason}`);
      }
      totalGhosts += ghostIds.length;
      for (const id of ghostIds) {
        const res = await fetch(`${PB_URL}/api/collections/${coll}/records/${id}`, { method: 'DELETE', headers });
        if (res.ok) totalDeleted++;
        else { totalErrors++; console.error(`  ❌ Failed to delete ${coll}/${id}: ${res.status}`); }
      }
    } else {
      console.log(`✅ ${coll}: clean`);
    }
  }

  console.log(`\n📊 Summary: ${totalGhosts} ghosts found, ${totalDeleted} deleted, ${totalErrors} errors`);
}

main().catch(e => { console.error(e); process.exit(1); });
