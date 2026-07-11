#!/usr/bin/env node
/**
 * Cleanup ghost entries (unparseable data) from ALL PocketBase sync collections.
 * Run: node scripts/cleanup_all_ghosts.mjs
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

// All sync collections and their key fields for ghost detection
const COLLECTIONS = [
  { coll: 'food_entries',          idField: 'food_id',         check: d => !d?.name },
  { coll: 'exercise_entries',      idField: 'exercise_id',     check: d => !d?.sport_key && !d?.sportKey },
  { coll: 'plans',                 idField: 'plan_id',         check: d => !d?.name },
  { coll: 'body_goals',            idField: 'goal_id',         check: d => !d?.target_weight && !d?.targetWeight && !d?.target_body_fat && !d?.targetBodyFat },
  { coll: 'body_plans',            idField: 'plan_id',         check: d => !d?.part },
  { coll: 'weight_records',        idField: 'weight_id',       check: d => !d?.date },
  { coll: 'body_checkins',         idField: 'checkin_id',      check: d => !d?.date },
  { coll: 'visions',               idField: 'vision_id',       check: d => !d?.text && !d?.type },
  { coll: 'vision_practices',      idField: 'practice_id',     check: d => !d?.vision_id && !d?.visionId },
  { coll: 'dedications',           idField: 'dedication_id',   check: d => !d?.date && !d?.period_label && !d?.periodLabel },
  { coll: 'mantra_defs',           idField: 'mantra_id',       check: d => !d?.name },
  { coll: 'mantra_sessions',       idField: 'session_id',      check: d => !d?.mantra_id && !d?.mantraId && !d?.date },
  { coll: 'zhiguan_sessions',      idField: 'zhiguan_id',      check: d => !d?.start_ts && !d?.startTs && !d?.status },
  { coll: 'fear_entries',          idField: 'fear_id',         check: d => !d?.content && !d?.date },
  { coll: 'courage_entries',       idField: 'courage_id',      check: d => !d?.action && !d?.date },
  { coll: 'fasting_sessions',      idField: 'session_id',      check: d => !d?.target_hours && !d?.targetHours && !d?.started_at && !d?.startedAt },
  { coll: 'sleep_records',         idField: 'sleep_id',        check: d => !d?.date },
  { coll: 'give_entries',          idField: 'give_id',         check: d => !d?.content },
  { coll: 'breath_records',        idField: 'breath_id',       check: d => !d?.date && !d?.preset_key && !d?.presetKey },
  { coll: 'eating_motivations',    idField: 'motivation_id',   check: d => !d?.food_id && !d?.foodId },
  { coll: 'custom_wuxing_maps',    idField: 'wuxing_id',       check: d => !d?.food_name && !d?.foodName },
  { coll: 'sutra_reading_sessions',idField: 'reading_id',      check: d => !d?.mantra_id && !d?.mantraId && !d?.date },
  { coll: 'reflections',           idField: 'reflection_id',   check: d => !d?.content && !d?.created_at && !d?.createdAt },
  { coll: 'reflection_links',      idField: 'link_id',         check: d => !d?.from_id && !d?.fromId },
  { coll: 'meditation_history',    idField: 'date',            check: d => !d?.date },
  { coll: 'checkin_records',       idField: 'date',            check: d => !d?.date },
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
  console.log('Admin authenticated\n');

  const headers = { Authorization: token };
  let totalGhosts = 0;
  let totalDeleted = 0;

  for (const { coll, idField, check } of COLLECTIONS) {
    let page = 1;
    const perPage = 100;
    const ghostIds = [];

    while (true) {
      const res = await fetch(`${PB_URL}/api/collections/${coll}/records?page=${page}&perPage=${perPage}`, { headers });
      if (!res.ok) { console.error(`  Query ${coll} failed: ${res.status}`); break; }
      const data = await res.json();
      for (const item of data.items) {
        const parsed = parseData(item.data);
        if (!parsed || check(parsed)) {
          ghostIds.push(item.id);
        }
      }
      if (page >= data.totalPages) break;
      page++;
    }

    if (ghostIds.length > 0) {
      console.log(`${coll}: ${ghostIds.length} ghost entries`);
      totalGhosts += ghostIds.length;
      for (const id of ghostIds) {
        const res = await fetch(`${PB_URL}/api/collections/${coll}/records/${id}`, { method: 'DELETE', headers });
        if (res.ok) totalDeleted++;
        else console.error(`  Failed to delete ${coll}/${id}: ${res.status}`);
      }
    }
  }

  console.log(`\nDone. Total ghosts found: ${totalGhosts}, deleted: ${totalDeleted}`);
}

main().catch(e => { console.error(e); process.exit(1); });
