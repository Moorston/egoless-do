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
  habit:          { table: 'habits',              pk: 'id'   },
  reflection:     { table: 'mind_reflections',    pk: 'id'   },
  fasting:        { table: 'fasting_sessions',    pk: 'id'   },
  food:           { table: 'food_entries',        pk: 'id'   },
  checkin:        { table: 'checkin_records',     pk: 'date' },
  exercise:       { table: 'exercise_entries',    pk: 'id'   },
  meditation:     { table: 'meditation_history',  pk: 'date' },
  profile:        { table: 'user_profiles',       pk: 'profile_id' },
  plan:           { table: 'plans',               pk: 'id'   },
  planItem:       { table: 'plan_items',          pk: 'id'   },
  planItemCheckin:{ table: 'plan_item_checkins',  pk: 'id'   },
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
  const [habits, reflections, fastingSessions, foodLog, checkins, exercises, meditations, profiles, plans, planItems, planItemCheckins] = await Promise.all([
    getPending('habit'),
    getPending('reflection'),
    getPending('fasting'),
    getPending('food'),
    getPending('checkin'),
    getPending('exercise'),
    getPending('meditation'),
    getPending('profile'),
    getPending('plan'),
    getPending('planItem'),
    getPending('planItemCheckin'),
  ]);
  return { habits, reflections, fastingSessions, foodLog, checkins, exercises, meditations, profiles, plans, planItems, planItemCheckins };
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
    updatedAt: r.updated_at,
  };
}

function reflectionToSync(r: Record<string, unknown>) {
  return {
    id: r.id, timestamp: r.created_at, content: r.content,
    tags: JSON.parse((r.tags as string) ?? '[]'),
    mood: r.mood, cardTheme: r.card_theme, linkedHabitId: r.linked_habit_id,
    isPinned: (r.is_pinned as number) === 1,
    isPublished: (r.is_published as number) === 1,
    updatedAt: r.updated_at,
  };
}

function fastingToSync(r: Record<string, unknown>) {
  return {
    id: r.id, targetHours: r.target_hours, startedAt: r.started_at,
    endedAt: r.ended_at, estimatedKcal: r.estimated_kcal, insight: r.insight,
    updatedAt: r.updated_at,
  };
}

function foodToSync(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, calories: r.cal, note: r.note,
    timestamp: r.ts,
    updatedAt: r.updated_at,
  };
}

function checkinToSync(r: Record<string, unknown>) {
  return {
    date: r.date, done: (r.done as number) === 1,
    note: r.note, streak: r.streak,
    timestamp: r.timestamp, weight: r.weight,
    updatedAt: r.updated_at,
  };
}

function exerciseToSync(r: Record<string, unknown>) {
  return {
    id: r.id, sportKey: r.sport_key, sportIcon: r.sport_icon,
    durationSec: r.duration_sec, distanceKm: r.distance_km,
    calories: r.calories, avgPace: r.avg_pace,
    trackPoints: JSON.parse((r.track_points as string) ?? '[]'),
    isGpsSport: (r.is_gps_sport as number) === 1,
    timestamp: r.ts,
    updatedAt: r.updated_at,
  };
}

function planToSync(r: Record<string, unknown>) {
  return {
    id: r.id, name: r.name, goal: r.goal, slogan: r.slogan,
    startDate: r.start_date, endDate: r.end_date,
    status: r.status, progress: r.progress,
    updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
  };
}

function planItemToSync(r: Record<string, unknown>) {
  return {
    id: r.id, planId: r.plan_id, name: r.name, description: r.description,
    startDate: r.start_date, endDate: r.end_date, contentUrl: r.content_url,
    totalCheckinDays: r.total_checkin_days, status: r.status, progress: r.progress,
    link: r.link, linkConfig: JSON.parse((r.link_config as string) ?? '{}'),
    order: r.item_order,
    updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
  };
}

function planItemCheckinToSync(r: Record<string, unknown>) {
  return {
    id: r.id, planItemId: r.plan_item_id, date: r.date,
    done: (r.done as number) === 1, note: r.note ?? '',
    linkedModule: r.linked_module ?? '',
    updatedAt: r.updated_at, deleted: (r.deleted as number) === 1,
  };
}

function meditationToSync(r: Record<string, unknown>) {
  return {
    date: r.date, dur: r.dur, mood: r.mood ?? '',
    updatedAt: r.updated_at,
  };
}

function profileToSync(r: Record<string, unknown>) {
  return {
    profileId: r.profile_id,
    data: JSON.parse((r.data as string) ?? '{}'),
    updatedAt: r.updated_at,
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
  for (const r of unsynced.exercises) {
    if (r.synced === 2) { changes.push({ entity: 'exercise', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'exercise', entityId: r.id as string, payload: exerciseToSync(r) });
  }
  for (const r of unsynced.meditations) {
    if (r.synced === 2) { changes.push({ entity: 'meditation', entityId: r.date as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'meditation', entityId: r.date as string, payload: meditationToSync(r) });
  }
  for (const r of unsynced.profiles) {
    if (r.synced === 2) { changes.push({ entity: 'profile', entityId: r.profile_id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'profile', entityId: r.profile_id as string, payload: profileToSync(r) });
  }
  for (const r of unsynced.plans) {
    if (r.synced === 2) { changes.push({ entity: 'plan', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'plan', entityId: r.id as string, payload: planToSync(r) });
  }
  for (const r of unsynced.planItems) {
    if (r.synced === 2) { changes.push({ entity: 'planItem', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'planItem', entityId: r.id as string, payload: planItemToSync(r) });
  }
  for (const r of unsynced.planItemCheckins) {
    if (r.synced === 2) { changes.push({ entity: 'planItemCheckin', entityId: r.id as string, payload: {}, op: 'delete' }); continue; }
    changes.push({ entity: 'planItemCheckin', entityId: r.id as string, payload: planItemCheckinToSync(r) });
  }

  return changes;
}

// ── Pull server changes & upsert into local DB ───────────────────

/** Check if a local record has a newer updated_at than the server payload. */
async function isLocalNewer(
  db: Awaited<ReturnType<typeof openDatabase>>,
  table: string, pk: string, id: string, serverUpdatedAt: unknown
): Promise<boolean> {
  const serverTs = Number(serverUpdatedAt ?? 0);
  if (!serverTs) return false; // server has no timestamp — accept it
  const local = await db.getFirstAsync<{ updated_at: number | null }>(
    `SELECT updated_at FROM ${table} WHERE ${pk} = ?`, [id]
  );
  if (!local) return false; // no local record — accept server
  return (local.updated_at ?? 0) > serverTs;
}

async function applyServerChanges(data: Record<string, unknown[]>): Promise<Record<string, unknown>> {
  const db = await openDatabase();
  const patch: Record<string, unknown> = {};

  if (data.habit?.length) {
    const alive = data.habit.filter(h => !h.deleted);
    const dead = data.habit.filter(h => h.deleted);
    for (const h of alive) {
      if (await isLocalNewer(db, 'habits', 'id', h.id, h.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO habits
        (id,name,start_date,target_days,goal,insight,create_tag,done_days,streak,interrupted,
         status,checked_dates,pause_reason,abandon_reason,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [h.id, h.name, h.startDate, h.targetDays, h.goal ?? '', h.insight ?? '',
         h.createTag ? 1 : 0, h.doneDays ?? 0, h.streak ?? 0, h.interrupted ?? 0,
         h.status ?? 'notStarted', JSON.stringify(h.checkedDates ?? []),
         h.pauseReason ?? '', h.abandonReason ?? '', h.updatedAt ?? null]
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
      if (await isLocalNewer(db, 'mind_reflections', 'id', r.id, r.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO mind_reflections
        (id,created_at,content,tags,mood,card_theme,linked_habit_id,is_pinned,is_published,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
        [r.id, r.timestamp ?? r.created_at, r.content, JSON.stringify(r.tags ?? []),
         r.mood ?? null, r.cardTheme ?? r.card_theme ?? null, r.linkedHabitId ?? r.linked_habit_id ?? null,
         (r.isPinned ?? r.is_pinned) ? 1 : 0, (r.isPublished ?? r.is_published) ? 1 : 0,
         r.updatedAt ?? null]
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
      if (await isLocalNewer(db, 'fasting_sessions', 'id', s.id, s.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO fasting_sessions
        (id,target_hours,started_at,ended_at,estimated_kcal,insight,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,1)`,
        [s.id, s.targetHours ?? s.target_hours, s.startedAt ?? s.started_at, s.endedAt ?? s.ended_at ?? null,
         s.estimatedKcal ?? s.estimated_kcal ?? null, s.insight ?? null, s.updatedAt ?? null]
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
      if (await isLocalNewer(db, 'food_entries', 'id', f.id, f.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO food_entries
        (id,name,cal,note,entry_date,ts,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,1)`,
        [f.id, f.name, f.calories ?? f.cal ?? 0, f.note ?? '', f.entry_date ?? '', f.timestamp ?? f.ts, f.updatedAt ?? null]
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
      if (await isLocalNewer(db, 'checkin_records', 'date', c.date, c.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO checkin_records
        (date,done,note,streak,timestamp,weight,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,1)`,
        [c.date, c.done ? 1 : 0, c.note ?? '', c.streak ?? 0,
         c.timestamp ?? null, c.weight ?? null, c.updatedAt ?? null]
      );
    }
    for (const c of dead) {
      await db.runAsync('DELETE FROM checkin_records WHERE date = ?', [c.date]);
    }
    patch.checkinHistory = alive;
  }

  if (data.exercise?.length) {
    const alive = data.exercise.filter(e => !e.deleted);
    const dead = data.exercise.filter(e => e.deleted);
    for (const e of alive) {
      if (await isLocalNewer(db, 'exercise_entries', 'id', e.id, e.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO exercise_entries
        (id,sport_key,sport_icon,duration_sec,distance_km,calories,avg_pace,track_points,is_gps_sport,ts,updated_at,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
        [e.id, e.sportKey ?? e.sport_key, e.sportIcon ?? e.sport_icon,
         e.durationSec ?? e.duration_sec ?? 0, e.distanceKm ?? e.distance_km ?? 0,
         e.calories ?? 0, e.avgPace ?? e.avg_pace ?? 0,
         JSON.stringify(e.trackPoints ?? e.track_points ?? []),
         (e.isGpsSport ?? e.is_gps_sport) ? 1 : 0,
         e.timestamp ?? e.ts, e.updatedAt ?? null]
      );
    }
    for (const e of dead) {
      await db.runAsync('DELETE FROM exercise_entries WHERE id = ?', [e.id]);
    }
    patch.exerciseLog = alive;
  }

  if (data.meditation?.length) {
    const alive = data.meditation.filter(m => !m.deleted);
    const dead = data.meditation.filter(m => m.deleted);
    for (const m of alive) {
      if (await isLocalNewer(db, 'meditation_history', 'date', m.date, m.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO meditation_history (date,dur,mood,updated_at,synced) VALUES (?,?,?,?,1)`,
        [m.date, m.dur ?? '0', m.mood ?? '', m.updatedAt ?? null]
      );
    }
    for (const m of dead) {
      await db.runAsync('DELETE FROM meditation_history WHERE date = ?', [m.date]);
    }
    // Recompute totalMedMinutes from synced data
    const allMed = await db.getAllAsync<{ dur: string }>('SELECT dur FROM meditation_history');
    const total = allMed.reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
    patch.totalMedMinutes = total;
    patch.medHistory = alive;
  }

  if (data.profile?.length) {
    // Profile is a singleton per user; take the latest
    const latest = data.profile.filter(p => !p.deleted).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
    if (latest) {
      const profileId = latest.profileId ?? latest.profile_id ?? 'self';
      if (!(await isLocalNewer(db, 'user_profiles', 'profile_id', profileId, latest.updatedAt))) {
        const profileData = latest.data ?? latest;
        await db.runAsync(`
          INSERT OR REPLACE INTO user_profiles (profile_id,data,updated_at,synced) VALUES (?,?,?,1)`,
          [profileId, JSON.stringify(profileData), latest.updatedAt ?? null]
        );
        patch.userProfile = profileData;
        if (profileData.waterMl !== undefined) patch.waterMl = profileData.waterMl;
        if (profileData.waterGoal !== undefined) patch.waterGoal = profileData.waterGoal;
      }
    }
  }

  if (data.plan?.length) {
    const alive = data.plan.filter(p => !p.deleted);
    const dead = data.plan.filter(p => p.deleted);
    for (const p of alive) {
      if (await isLocalNewer(db, 'plans', 'id', p.id, p.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO plans
        (id,name,goal,slogan,start_date,end_date,status,progress,updated_at,deleted,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
        [p.id, p.name, p.goal ?? '', p.slogan ?? '', p.startDate, p.endDate,
         p.status ?? 'not_started', p.progress ?? 0, p.updatedAt ?? null, 0]
      );
    }
    for (const p of dead) {
      await db.runAsync('DELETE FROM plans WHERE id = ?', [p.id]);
    }
    patch.plans = alive;
  }

  if (data.planItem?.length) {
    const alive = data.planItem.filter(i => !i.deleted);
    const dead = data.planItem.filter(i => i.deleted);
    for (const i of alive) {
      if (await isLocalNewer(db, 'plan_items', 'id', i.id, i.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO plan_items
        (id,plan_id,name,description,start_date,end_date,content_url,total_checkin_days,
         status,progress,link,link_config,item_order,updated_at,deleted,synced)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [i.id, i.planId, i.name, i.description ?? '', i.startDate, i.endDate,
         i.contentUrl ?? '', i.totalCheckinDays ?? 0, i.status ?? 'not_started',
         i.progress ?? 0, i.link ?? 'manual', JSON.stringify(i.linkConfig ?? {}),
         i.order ?? 0, i.updatedAt ?? null, 0]
      );
    }
    for (const i of dead) {
      await db.runAsync('DELETE FROM plan_items WHERE id = ?', [i.id]);
    }
    patch.planItems = alive;
  }

  if (data.planItemCheckin?.length) {
    const alive = data.planItemCheckin.filter(c => !c.deleted);
    const dead = data.planItemCheckin.filter(c => c.deleted);
    for (const c of alive) {
      if (await isLocalNewer(db, 'plan_item_checkins', 'id', c.id, c.updatedAt)) continue;
      await db.runAsync(`
        INSERT OR REPLACE INTO plan_item_checkins
        (id,plan_item_id,date,done,note,linked_module,updated_at,deleted,synced)
        VALUES (?,?,?,?,?,?,?,?,1)`,
        [c.id, c.planItemId, c.date, c.done ? 1 : 0, c.note ?? '',
         c.linkedModule ?? '', c.updatedAt ?? null, 0]
      );
    }
    for (const c of dead) {
      await db.runAsync('DELETE FROM plan_item_checkins WHERE id = ?', [c.id]);
    }
    patch.planItemCheckins = alive;
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

      // Build set of rejected entity+id pairs to exclude from markSynced
      const rejectedSet = new Set<string>();
      if (pushResult.rejected?.length) {
        for (const r of pushResult.rejected) {
          const idField = r.entity === 'checkin' ? 'date' : r.entity === 'profile' ? 'profileId' : 'id';
          rejectedSet.add(`${r.entity}:${r.payload?.[idField] ?? r.entityId}`);
        }
      }

      for (const [entity, ids] of Object.entries(upserted)) {
        const acceptedIds = ids.filter(id => !rejectedSet.has(`${entity}:${id}`));
        if (acceptedIds.length) await markSynced(entity, acceptedIds);
      }
      for (const [entity, ids] of Object.entries(deleted)) {
        await cleanupDeleted(entity, ids);
      }

      // Apply server changes and rejected data returned by push
      const allServerChanges = [
        ...(pushResult.changes ?? []),
        ...(pushResult.rejected ?? []).map((r: any) => ({ ...r, payload: { ...r.payload, _rejected: true } })),
      ];
      if (allServerChanges.length) {
        const byEntity: Record<string, unknown[]> = {};
        for (const c of allServerChanges) {
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
