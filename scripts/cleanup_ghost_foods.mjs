#!/usr/bin/env node
/**
 * Cleanup ghost food entries (empty name) from PocketBase server.
 * Handles data stored as byte array (char codes) or JSON string.
 * Run: node scripts/cleanup_ghost_foods.mjs
 */

const PB_URL = process.env.PB_URL ?? 'http://localhost:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables');
  process.exit(1);
}

/** Parse data field: may be object, JSON string, or byte array */
function parseData(data) {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return null; } }
  if (Array.isArray(data)) {
    try { return JSON.parse(String.fromCharCode(...data)); } catch { return null; }
  }
  return null;
}

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
  console.log('Admin authenticated');

  const headers = { Authorization: token };

  // Fetch all food entries
  let page = 1;
  const perPage = 100;
  const allItems = [];

  while (true) {
    const res = await fetch(`${PB_URL}/api/collections/food_entries/records?page=${page}&perPage=${perPage}`, { headers });
    if (!res.ok) { console.error('Query failed:', res.status); break; }
    const data = await res.json();
    allItems.push(...data.items);
    if (page >= data.totalPages) break;
    page++;
  }

  console.log(`Total food entries on server: ${allItems.length}`);

  // Find ghosts: data.name is empty or data is unparseable
  const ghostIds = [];
  for (const item of allItems) {
    const parsed = parseData(item.data);
    if (!parsed || !parsed.name) {
      ghostIds.push(item.id);
      console.log(`  Ghost: id=${item.id} food_id=${item.food_id} name="${parsed?.name ?? 'UNPARSEABLE'}" cal=${parsed?.calories ?? '?'} deleted=${parsed?.deleted}`);
    }
  }

  if (ghostIds.length === 0) {
    console.log('No ghost food entries found.');
    return;
  }

  console.log(`\nFound ${ghostIds.length} ghost food entries. Deleting...`);
  let deleted = 0;
  for (const id of ghostIds) {
    const res = await fetch(`${PB_URL}/api/collections/food_entries/records/${id}`, { method: 'DELETE', headers });
    if (res.ok) deleted++;
    else console.error(`  Failed to delete ${id}: ${res.status}`);
  }

  console.log(`Deleted ${deleted}/${ghostIds.length} ghost entries.`);
}

main().catch(e => { console.error(e); process.exit(1); });
