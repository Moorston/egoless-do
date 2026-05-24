// ─── Mobile Sync Service ──────────────────────────────────────────
// Pushes unsynced local records to the server, then pulls server changes.
import { openDatabase } from '../../db/schema';
import { apiSyncPush, apiSyncPull } from '@egoless-do/core';

let _syncing = false;
let _tokenProvider: (() => string | null) | null = null;
let _onChanges: ((patch: Record<string, unknown>) => void) | null = null;
let _lastSyncAt = 0;

// Short polling for near real-time updates (React Native doesn't support EventSource)
const SHORT_POLL_INTERVAL = 30 * 1000; // 30 seconds
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _realtimeListeners: Array<(event: any) => void> = [];

// ── Configure ─────────────────────────────────────────────────────
export function setSyncTokenProvider(fn: () => string | null) {
  _tokenProvider = fn;
}

export function setSyncChangeHandler(fn: (patch: Record<string, unknown>) => void) {
  _onChanges = fn;
}

export function setLastSyncAt(ts: number) {
  _lastSyncAt = ts;
}

// ── Real-time sync (short polling for React Native) ──────────────

export function connectRealtime(pbUrl: string): void {
  const token = _tokenProvider?.();
  if (!token) return;

  // Stop any existing polling
  disconnectRealtime();

  // Initial poll
  pollForChanges(token);

  // Start polling timer
  _pollTimer = setInterval(() => {
    const currentToken = _tokenProvider?.();
    if (currentToken) {
      pollForChanges(currentToken);
    }
  }, SHORT_POLL_INTERVAL);

  console.log('[Realtime] Short polling started');
}

export function disconnectRealtime(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

export function onRealtimeEvent(listener: (event: any) => void): () => void {
  _realtimeListeners.push(listener);
  return () => {
    _realtimeListeners = _realtimeListeners.filter(l => l !== listener);
  };
}

export function isRealtimeConnected(): boolean {
  return _pollTimer !== null;
}

async function pollForChanges(token: string): Promise<void> {
  try {
    const result = await apiSyncPull(token);

    if (result.data && Object.keys(result.data).length > 0) {
      // Apply changes to local DB
      const patch = await applyServerChanges(result.data);

      if (Object.keys(patch).length > 0) {
        // Notify listeners
        for (const listener of _realtimeListeners) {
          try {
            listener(patch);
          } catch {}
        }

        // Notify store
        if (_onChanges) {
          _onChanges(patch);
        }
      }
    }

    _lastSyncAt = result.serverTime;
  } catch (err) {
    console.error('[Realtime] Poll error:', err);
  }
}

// ── Table/pkey whitelist (prevents SQL injection via string interpolation) ──
const ENTITY_CONFIG: Record<string, { table: string; pk: string }> = {
  habit:     { table: 'habits',              pk: 'id'   },
  reflection:{ table: 'mind_reflections',    pk: 'id'   },
  fasting:   { table: 'fasting_sessions',    pk: 'id'   },
  food:      { table: 'food_entries',        pk: 'id'   },
  checkin:   { table: 'checkin_records',     pk: 'date' },
};

function entityTable(entity: string): string {
  return ENTITY_CONFIG[entity]?.table ?? entity;
}
function entityPk(entity: string): string {
  return ENTITY_CONFIG[entity]?.pk ?? 'id';
}

// ── Local DB helpers ──────────────────────────────────────────────
async function getPending(entity: string): Promise<Record<string, unknown>[]> {
  const db = await openDatabase();
  const table = entityTable(entity);
  const pk = entityPk(entity);
  return db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${table} WHERE synced = 0 OR synced = 2`
  );
}

async function getUnsynced() {
  const db = await openDatabase();
  const [habits, reflections, fastingSessions, foodLog, checkins] = await Promise.all([
    getPending('habit'),
    getPending('reflection'),
    getPending('fasting'),
    getPending('food'),
    getPending('checkin'),
  ]);
  return { habits, reflections, fastingSessions, foodLog, checkins };
}

// Mark a record as deleted in SQLite (synced=2) so SyncService can push the delete
export async function markForDeletion(entity: string, entityId: string): Promise<void> {
  const db = await openDatabase();
  const table = entityTable(entity);
  const pk = entityPk(entity);
  await db.runAsync(`UPDATE ${table} SET synced = 2 WHERE ${pk} = ?`, [entityId]);
}

// Physically remove records that have been successfully synced after deletion
export async function cleanupDeleted(entity: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDatabase();
  const table = entityTable(entity);
  const pk = entityPk(entity);
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM ${table} WHERE ${pk} IN (${placeholders}) AND synced = 2`, ids);
}

async function markSynced(entity: string, ids: string[]) {
  if (!ids.length) return;
  const db = await openDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const table = entityTable(entity);
  const pk = entityPk(entity);
  await db.runAsync(`UPDATE ${table} SET synced = 1 WHERE ${pk} IN (${placeholders})`, ids);
}

// ── Row → sync payload mappers ────────────────────────────────────
function habitToSync(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, startDate: r.start_date,
    targetDays: r.target_days, goal: r.goal, insight: r.insight,
    createTag: (r.create_tag as number) === 1,
    doneDays: r.done_days, streak: r.streak, interrupted: r.interrupted,
    status: r.status,
    checkedDates: JSON.parse((r.checked_dates as string) ?? '[]'),
    pauseReason: r.pause_reason, abandonReason: r.abandon_reason,
  };
}

function reflectionToSync(r: Record<string, unknown>) {
  return {
    id: r.id, created_at: r.created_at, content: r.content,
    tags: JSON.parse((r.tags as string) ?? '[]'),
    mood: r.mood, card_theme: r.card_theme, linked_habit_id: r.linked_habit_id,
    is_pinned: (r.is_pinned as number) === 1,
    is_published: (r.is_published as number) === 1,
  };
}

function fastingToSync(r: Record<string, unknown>) {
  return {
    id: r.id, target_hours: r.target_hours, started_at: r.started_at,
    ended_at: r.ended_at, estimated_kcal: r.estimated_kcal, insight: r.insight,
  };
}

function foodToSync(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, cal: r.cal, note: r.note,
    entry_date: r.entry_date, ts: r.ts,
  };
}

function checkinToSync(r: Record<string, unknown>) {
  return {
    date: r.date, done: (r.done as number) === 1,
    note: r.note, streak: r.streak,
    timestamp: r.timestamp, weight: r.weight,
  };
}

// ── Build changes array from local unsynced rows ──────────────────
function buildChanges(unsynced: Awaited<ReturnType<typeof getUnsynced>>) {
  const changes: { entity: string; entityId: string; payload: Record<string, unknown>; op?: 'upsert' | 'delete' }[] = [];

  for (const r of unsynced.habits) {
    if (r.synced === 2) { changes.push({ entity: 'habit', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'habit', entityId: r.id as string, payload: habitToSync(r) });
  }
  for (const r of unsynced.reflections) {
    if (r.synced === 2) { changes.push({ entity: 'reflection', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'reflection', entityId: r.id as string, payload: reflectionToSync(r) });
  }
  for (const r of unsynced.fastingSessions) {
    if (r.synced === 2) { changes.push({ entity: 'fasting', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'fasting', entityId: r.id as string, payload: fastingToSync(r) });
  }
  for (const r of unsynced.foodLog) {
    if (r.synced === 2) { changes.push({ entity: 'food', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'food', entityId: r.id as string, payload: foodToSync(r) });
  }
  for (const r of unsynced.checkins) {
    if (r.synced === 2) { changes.push({ entity: 'checkin', entityId: r.date as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'checkin', entityId: r.date as string, payload: checkinToSync(r) });
  }

  return changes;
}

// ── Pull server changes & upsert into local DB ───────────────────
async function applyServerChanges(data: Record<string, unknown[]>): Promise<Record<string, unknown>> {
  const db = await openDatabase();
  const patch: Record<string, unknown> = {};

  if (data.habit?.length) {
    const alive = data.habit.filter(h => !h.deleted);
    const dead = data.habit.filter(h => h.deleted);
    for (const h of alive) {
      await db.runAsync(`
        INSERT OR REPLACE INTO habits
        (id,name,start_date,target_days,goal,insight,create_tag,done_days,streak,interrupted,
         status,checked_dates,pause_reason,abandon_reason,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [h.id, h.name, h.startDate, h.targetDays, h.goal ?? '', h.insight ?? '',
         h.createTag ? 1 : 0, h.doneDays ?? 0, h.streak ?? 0, h.interrupted ?? 0,
         h.status ?? 'notStarted', JSON.stringify(h.checkedDates ?? []),
         h.pauseReason ?? '', h.abandonReason ?? '']
      );
    }
    for (const h of dead) {
      await db.runAsync('DELETE FROM habits WHERE id = ?', [h.id]);
    }
    patch.habits = alive;
  }

  if (data.reflection?.length) {
    const alive = data.reflection.filter(r => !r.deleted);
    const dead = data.reflection.filter(r => r.deleted);
    for (const r of alive) {
      await db.runAsync(`
        INSERT OR REPLACE INTO mind_reflections
        (id,created_at,content,tags,mood,card_theme,linked_habit_id,is_pinned,is_published,synced)
        VALUES (?,?,?,?,?,?,?,?,?,1)`,
        [r.id, r.created_at, r.content, JSON.stringify(r.tags ?? []),
         r.mood ?? null, r.card_theme ?? null, r.linked_habit_id ?? null,
         r.is_pinned ? 1 : 0, r.is_published ? 1 : 0]
      );
    }
    for (const r of dead) {
      await db.runAsync('DELETE FROM mind_reflections WHERE id = ?', [r.id]);
    }
    patch.reflections = alive;
  }

  if (data.fasting?.length) {
    const alive = data.fasting.filter(s => !s.deleted);
    const dead = data.fasting.filter(s => s.deleted);
    for (const s of alive) {
      await db.runAsync(`
        INSERT OR REPLACE INTO fasting_sessions
        (id,target_hours,started_at,ended_at,estimated_kcal,insight,synced)
        VALUES (?,?,?,?,?,?,1)`,
        [s.id, s.target_hours, s.started_at, s.ended_at ?? null,
         s.estimated_kcal ?? null, s.insight ?? null]
      );
    }
    for (const s of dead) {
      await db.runAsync('DELETE FROM fasting_sessions WHERE id = ?', [s.id]);
    }
    patch.fastingHistory = alive;
  }

  if (data.food?.length) {
    const alive = data.food.filter(f => !f.deleted);
    const dead = data.food.filter(f => f.deleted);
    for (const f of alive) {
      await db.runAsync(`
        INSERT OR REPLACE INTO food_entries
        (id,name,cal,note,entry_date,ts,synced)
        VALUES (?,?,?,?,?,?,1)`,
        [f.id, f.name, f.cal ?? 0, f.note ?? '', f.entry_date, f.ts]
      );
    }
    for (const f of dead) {
      await db.runAsync('DELETE FROM food_entries WHERE id = ?', [f.id]);
    }
    patch.foodLog = alive;
  }

  if (data.checkin?.length) {
    const alive = data.checkin.filter(c => !c.deleted);
    const dead = data.checkin.filter(c => c.deleted);
    for (const c of alive) {
      await db.runAsync(`
        INSERT OR REPLACE INTO checkin_records
        (date,done,note,streak,timestamp,weight,synced)
        VALUES (?,?,?,?,?,?,1)`,
        [c.date, c.done ? 1 : 0, c.note ?? '', c.streak ?? 0,
         c.timestamp ?? null, c.weight ?? null]
      );
    }
    for (const c of dead) {
      await db.runAsync('DELETE FROM checkin_records WHERE date = ?', [c.date]);
    }
    patch.checkinHistory = alive;
  }

  return patch;
}

// ── Main sync entry point ─────────────────────────────────────────
export async function runSync(): Promise<void> {
  if (_syncing) return;
  const token = _tokenProvider?.();
  if (!token) return;

  _syncing = true;
  console.log('[Sync] Starting sync...');

  try {
    // 1. Push local changes
    const unsynced = await getUnsynced();
    const changes = buildChanges(unsynced);

    if (changes.length > 0) {
      console.log(`[Sync] Pushing ${changes.length} changes`);
      const pushResult = await apiSyncPush(token, _lastSyncAt, changes);

      // Mark pushed records as synced / cleanup deleted
      const upserted: Record<string, string[]> = {};
      const deleted: Record<string, string[]> = {};
      for (const c of changes) {
        if (c.op === 'delete') {
          (deleted[c.entity] ??= []).push(c.entityId);
        } else {
          (upserted[c.entity] ??= []).push(c.entityId);
        }
      }
      for (const [entity, ids] of Object.entries(upserted)) {
        await markSynced(entity, ids);
      }
      for (const [entity, ids] of Object.entries(deleted)) {
        await cleanupDeleted(entity, ids);
      }

      // Apply server changes returned by push
      if (pushResult.changes?.length) {
        const byEntity: Record<string, unknown[]> = {};
        for (const c of pushResult.changes) {
          const payload = c.deleted ? { ...c.payload, deleted: true } : c.payload;
          (byEntity[c.entity] ??= []).push(payload);
        }
        const patch = await applyServerChanges(byEntity);
        if (Object.keys(patch).length) _onChanges?.(patch);
      }

      _lastSyncAt = pushResult.serverTime;
      console.log('[Sync] Push complete');
      return;
    }

    // 2. Nothing to push — pull server changes
    const pullResult = await apiSyncPull(token);
    if (pullResult.data && Object.keys(pullResult.data).length > 0) {
      const patch = await applyServerChanges(pullResult.data);
      if (Object.keys(patch).length) _onChanges?.(patch);
    }

    _lastSyncAt = pullResult.serverTime;
    console.log('[Sync] Pull complete');
  } catch (err) {
    console.error('[Sync] Error:', err);
  } finally {
    _syncing = false;
  }
}

export function isSyncing(): boolean {
  return _syncing;
}
