#!/usr/bin/env node
/**
 * Delete completed plans and all their associated data from PocketBase.
 *
 * Cascade:
 *   plans (status=completed)
 *   → plan_items (via plan_id/planId in data JSON)
 *     → plan_item_checkins (via plan_item_id/planItemId in data JSON)
 *   → daily_custom_todos (via plan_id/planId in data JSON)
 *   → daily_todo_history (via plan_id/planId in data JSON)
 *
 * Run: node scripts/cleanup_completed_plans.mjs
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

/** Fetch all records from a collection with optional filter */
async function fetchAll(headers, coll, filter) {
  const items = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const url = `${PB_URL}/api/collections/${coll}/records?page=${page}&perPage=${perPage}${filter ? `&filter=${encodeURIComponent(filter)}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) { console.error(`  ❌ Query ${coll} failed: ${res.status}`); break; }
    const data = await res.json();
    items.push(...data.items);
    if (page >= data.totalPages) break;
    page++;
  }
  return items;
}

/** Delete a record by ID */
async function deleteRecord(headers, coll, id) {
  const res = await fetch(`${PB_URL}/api/collections/${coll}/records/${id}`, { method: 'DELETE', headers });
  return res.ok;
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
  const headers = { Authorization: token };
  console.log('✅ Admin authenticated\n');

  // ── Step 1: Find completed plans ──────────────────────────────
  console.log('🔍 Step 1: Finding completed plans...');
  const allPlans = await fetchAll(headers, 'plans');
  const completedPlans = [];

  for (const plan of allPlans) {
    const data = parseData(plan.data);
    if (data && data.status === 'completed') {
      completedPlans.push({ id: plan.id, planId: plan.plan_id, name: data.name });
    }
  }

  if (completedPlans.length === 0) {
    console.log('  No completed plans found.\n✅ Done.');
    return;
  }

  console.log(`  Found ${completedPlans.length} completed plans:\n`);
  for (const p of completedPlans) {
    console.log(`    📋 ${p.planId} — "${p.name ?? '(unnamed)'}"`);
  }

  const planIdSet = new Set(completedPlans.map(p => p.planId));
  const planPbIdSet = new Set(completedPlans.map(p => p.id));

  // ── Step 2: Find & delete associated plan_items ───────────────
  console.log(`\n🔍 Step 2: Finding associated plan_items...`);
  const allPlanItems = await fetchAll(headers, 'plan_items');
  const planItemsToDelete = [];

  for (const item of allPlanItems) {
    const data = parseData(item.data);
    const linkedPlanId = data?.plan_id ?? data?.planId;
    if (linkedPlanId && planIdSet.has(linkedPlanId)) {
      planItemsToDelete.push({ id: item.id, itemId: item.plan_item_id, name: data?.name });
    }
  }

  const planItemIdSet = new Set(planItemsToDelete.map(i => i.itemId));

  console.log(`  Found ${planItemsToDelete.length} associated plan_items. Deleting...`);
  let deleted = 0;
  for (const pi of planItemsToDelete) {
    if (await deleteRecord(headers, 'plan_items', pi.id)) deleted++;
  }
  console.log(`  ✅ Deleted ${deleted}/${planItemsToDelete.length} plan_items`);

  // ── Step 3: Find & delete associated plan_item_checkins ───────
  console.log(`\n🔍 Step 3: Finding associated plan_item_checkins...`);
  const allCheckins = await fetchAll(headers, 'plan_item_checkins');
  const checkinsToDelete = [];

  for (const chk of allCheckins) {
    const data = parseData(chk.data);
    const linkedItemId = data?.plan_item_id ?? data?.planItemId;
    if (linkedItemId && planItemIdSet.has(linkedItemId)) {
      checkinsToDelete.push({ id: chk.id, checkinId: chk.checkin_id, date: data?.date });
    }
  }

  console.log(`  Found ${checkinsToDelete.length} associated plan_item_checkins. Deleting...`);
  deleted = 0;
  for (const c of checkinsToDelete) {
    if (await deleteRecord(headers, 'plan_item_checkins', c.id)) deleted++;
  }
  console.log(`  ✅ Deleted ${deleted}/${checkinsToDelete.length} plan_item_checkins`);

  // ── Step 4: Find & delete associated daily_custom_todos ───────
  console.log(`\n🔍 Step 4: Finding associated daily_custom_todos...`);
  const allTodos = await fetchAll(headers, 'daily_custom_todos');
  const todosToDelete = [];

  for (const todo of allTodos) {
    const data = parseData(todo.data);
    const linkedPlanId = data?.planId;
    if (linkedPlanId && planIdSet.has(linkedPlanId)) {
      todosToDelete.push({ id: todo.id, todoId: todo.todo_id, name: data?.name });
    }
  }

  console.log(`  Found ${todosToDelete.length} associated daily_custom_todos. Deleting...`);
  deleted = 0;
  for (const t of todosToDelete) {
    if (await deleteRecord(headers, 'daily_custom_todos', t.id)) deleted++;
  }
  console.log(`  ✅ Deleted ${deleted}/${todosToDelete.length} daily_custom_todos`);

  // ── Step 5: Find & delete associated daily_todo_history ───────
  console.log(`\n🔍 Step 5: Finding associated daily_todo_history...`);
  const allHistory = await fetchAll(headers, 'daily_todo_history');
  const historyToDelete = [];

  for (const h of allHistory) {
    const data = parseData(h.data);
    const linkedPlanId = data?.planId;
    if (linkedPlanId && planIdSet.has(linkedPlanId)) {
      historyToDelete.push({ id: h.id, historyId: h.history_id, date: data?.date });
    }
  }

  console.log(`  Found ${historyToDelete.length} associated daily_todo_history. Deleting...`);
  deleted = 0;
  for (const h of historyToDelete) {
    if (await deleteRecord(headers, 'daily_todo_history', h.id)) deleted++;
  }
  console.log(`  ✅ Deleted ${deleted}/${historyToDelete.length} daily_todo_history`);

  // ── Step 6: Delete the plans themselves ───────────────────────
  console.log(`\n🔍 Step 6: Deleting the completed plans...`);
  deleted = 0;
  for (const plan of completedPlans) {
    if (await deleteRecord(headers, 'plans', plan.id)) deleted++;
  }
  console.log(`  ✅ Deleted ${deleted}/${completedPlans.length} plans`);

  // ── Summary ───────────────────────────────────────────────────
  const totalDeleted = planItemsToDelete.length + checkinsToDelete.length + todosToDelete.length + historyToDelete.length + completedPlans.length;
  console.log(`\n📊 Summary:`);
  console.log(`  Plans (completed):        ${completedPlans.length}`);
  console.log(`  Plan Items:               ${planItemsToDelete.length}`);
  console.log(`  Plan Item Checkins:       ${checkinsToDelete.length}`);
  console.log(`  Daily Custom Todos:       ${todosToDelete.length}`);
  console.log(`  Daily Todo History:       ${historyToDelete.length}`);
  console.log(`  ─────────────────────────`);
  console.log(`  Total records deleted:    ${totalDeleted}`);
}

main().catch(e => { console.error(e); process.exit(1); });