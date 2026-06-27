// ─── Mobile Sync Service ──────────────────────────────────────────
// Pushes queued local changes to the server, then pulls server changes.

// DOMException polyfill for React Native
const _global = globalThis as Record<string, unknown>;
const DOMException = (_global.DOMException as typeof Error | undefined) ?? class DOMException extends Error {
  constructor(message?: string, name?: string) {
    super(message);
    this.name = name ?? 'DOMException';
  }
};

import { openDatabase, getState, setState, withDbLock } from '../../db/schema';
import {
  drainQueue, removeQueueItems, getQueueCount, pruneStaleQueueItems,
  markQueueItemFailed, markQueueItemConflict, markQueueItemRetry, resetAllPendingForRetry,
  getLastSyncTimestamp, setLastSyncTimestamp,
  type SyncQueueItem,
} from '../../db/syncQueue';
import { apiSyncPush, apiSyncPull, apiSyncCheck, createLogger } from '@egoless-do/core';
import NetInfo from '@react-native-community/netinfo';

const log = createLogger('Sync');

let _syncing = false;
let _syncingSince = 0;
let _syncGeneration = 0;
let _abortController: AbortController | null = null;
const SYNC_TIMEOUT_MS = 60_000; // 60s timeout to prevent stuck sync
export let _migrationDone = false;
export function resetMigrationFlag() {
  _migrationDone = false;
}
export function setMigrationDone() {
  _migrationDone = true;
}
let _tokenProvider: (() => string | null) | null = null;
let _userIdProvider: (() => string | null) | null = null;
let _onChanges: ((patch: Record<string, unknown>) => void) | null = null;
let _deletedIdsProvider: (() => Set<string>) | null = null;
let _lastSyncAt = 0;
let _lastSyncAtLoaded = false;
let _hasSyncedDeletes = false; // Track if any deletes were synced this cycle

/** Load persisted _lastSyncAt from SQLite app_state (once). */
async function loadLastSyncAt(): Promise<void> {
  if (_lastSyncAtLoaded) return;
  try {
    const db = await openDatabase();
    const val = await getState(db, 'lastSyncAt');
    if (val) _lastSyncAt = Number(val) || 0;
  } catch {}
  _lastSyncAtLoaded = true;
}

/** Persist _lastSyncAt to SQLite app_state. */
async function saveLastSyncAt(ts: number): Promise<void> {
  try {
    const db = await openDatabase();
    await setState(db, 'lastSyncAt', String(ts));
  } catch {}
}

// Short polling for near real-time updates (React Native doesn't support EventSource)
const SHORT_POLL_INTERVAL = 60 * 1000; // 60 seconds
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _realtimeListeners: Array<(event: any) => void> = [];

// ── Table/pkey whitelist (prevents SQL injection via string interpolation) ──
const ENTITY_CONFIG: Record<string, { table: string; pk: string }> = {
  habit:            { table: 'habits',              pk: 'id'   },
  reflection:       { table: 'mind_reflections',    pk: 'id'   },
  fasting:          { table: 'fasting_sessions',    pk: 'id'   },
  food:             { table: 'food_entries',        pk: 'id'   },
  checkin:          { table: 'checkin_records',     pk: 'date' },
  exercise:         { table: 'exercise_entries',    pk: 'id'   },
  meditation:       { table: 'meditation_history',  pk: 'date' },
  profile:          { table: 'user_profiles',       pk: 'profile_id' },
  plan:             { table: 'plans',               pk: 'id'   },
  planItem:         { table: 'plan_items',          pk: 'id'   },
  planItemCheckin:  { table: 'plan_item_checkins',  pk: 'id'   },
  grace:            { table: 'grace_history',       pk: 'date' },
  dailyCustomTodo:  { table: 'daily_custom_todos',  pk: 'id'   },
  dailyTodoHistory: { table: 'daily_todo_history',  pk: 'id'   },
  thoughtTrail:     { table: 'thought_trails',      pk: 'id'   },
  trailNote:        { table: 'trail_notes',         pk: 'id'   },
  reflectionLink:   { table: 'reflection_links',    pk: 'link_id' },
  aiConfig:         { table: 'ai_configs',          pk: 'config_id' },
  checkinReview:    { table: 'checkin_reviews',     pk: 'id' },
};

// ── Configure ─────────────────────────────────────────────────────
export function setSyncTokenProvider(fn: () => string | null) {
  _tokenProvider = fn;
}

export function setSyncUserIdProvider(fn: () => string | null) {
  _userIdProvider = fn;
}

export function setSyncChangeHandler(fn: (patch: Record<string, unknown>) => void) {
  _onChanges = fn;
}

export function setDeletedIdsProvider(fn: () => Set<string>) {
  _deletedIdsProvider = fn;
}

export function setLastSyncAt(ts: number) {
  _lastSyncAt = ts;
}

// ── Exponential backoff ───────────────────────────────────────────
const MAX_RETRY_ATTEMPTS = 5;

function getBackoffDelay(attempt: number): number {
  return Math.min(Math.pow(2, attempt) * 1000, 60000);
}

// ── Network recovery listener ────────────────────────────────────
let _netInfoUnsubscribe: (() => void) | null = null;

export function startNetworkRecoveryListener(): void {
  if (_netInfoUnsubscribe) return;
  _netInfoUnsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      // Network recovered — reset failed items and trigger sync
      resetAllPendingForRetry().then(count => {
        if (count > 0) {
          console.log(`[Sync] Network recovered, resetting ${count} failed items for retry`);
          runSync();
        }
      }).catch(() => {});
    }
  });
}

export function stopNetworkRecoveryListener(): void {
  _netInfoUnsubscribe?.();
  _netInfoUnsubscribe = null;
}

// ── Real-time sync (short polling for React Native) ──────────────

export function connectRealtime(): void {
  const token = _tokenProvider?.();
  if (!token) return;

  disconnectRealtime();
  pollForChanges(token);
  startNetworkRecoveryListener();

  _pollTimer = setInterval(() => {
    const currentToken = _tokenProvider?.();
    if (currentToken) pollForChanges(currentToken);
  }, SHORT_POLL_INTERVAL);

  console.log('[Realtime] Short polling started (60s interval)');
}

export function disconnectRealtime(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  stopNetworkRecoveryListener();
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
    // If queue has pending items, skip check and run full sync
    const queueCount = await getQueueCount();
    if (queueCount > 0) {
      await runSync();
      return;
    }

    // Lightweight check: does the server have changes since last sync?
    const pollUserId = _userIdProvider?.() ?? undefined;
    try {
      const { hasChanges } = await apiSyncCheck(token, _lastSyncAt, pollUserId);
      if (!hasChanges) return; // No changes, skip
    } catch {
      // Check endpoint unavailable — fall through to full pull
    }

    // Server has changes — delegate to runSync (which has its own _syncing guard)
    await runSync();
  } catch (err) {
    console.error('[Realtime] Poll error:', err);
  }
}

// ── Local DB helpers ──────────────────────────────────────────────
async function markSynced(entity: string, ids: string[]) {
  if (!ids.length) return;
  const db = await openDatabase();
  const config = ENTITY_CONFIG[entity];
  if (!config) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE ${config.table} SET synced = 1 WHERE ${config.pk} IN (${placeholders})`, ids);
}

async function cleanupDeleted(entity: string, ids: string[]) {
  if (!ids.length) return;
  const db = await openDatabase();
  const config = ENTITY_CONFIG[entity];
  if (!config) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE ${config.table} SET synced = 1 WHERE ${config.pk} IN (${placeholders}) AND deleted = 1`, ids);
  _hasSyncedDeletes = true;
}

/** Reset deleted=0, synced=0 for rejected deletes so the server version can be applied on next pull. */
async function unmarkDeleted(entity: string, ids: string[]) {
  if (!ids.length) return;
  const db = await openDatabase();
  const config = ENTITY_CONFIG[entity];
  if (!config) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE ${config.table} SET deleted = 0, synced = 0 WHERE ${config.pk} IN (${placeholders})`, ids);
}

// ── Pull server changes & upsert into local DB (generic) ─────────

/** Extract entity ID from server payload, trying both snake_case and camelCase variants. */
function resolveEntityId(r: Record<string, unknown>, pk: string, fallback?: string): string | undefined {
  const val = r[pk] ?? r.id ?? r.date;
  if (val) return val as string;
  // Server sends camelCase (e.g. profileId) but pk is snake_case (profile_id)
  const camel = pk.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return (r[camel] as string | undefined) ?? fallback;
}

async function isLocalDeleted(
  db: Awaited<ReturnType<typeof openDatabase>>,
  table: string, pk: string, id: string
): Promise<boolean> {
  const local = await db.getFirstAsync<{ deleted: number | null }>(
    `SELECT deleted FROM ${table} WHERE ${pk} = ?`, [id]
  );
  return local?.deleted === 1;
}

/** Special handling for reflection colors — preserve local colors if server has none. */
async function preserveReflectionColors(
  db: Awaited<ReturnType<typeof openDatabase>>,
  id: string, serverColors: unknown
): Promise<string | null> {
  if (serverColors) return null;
  try {
    const local = await db.getFirstAsync<{ colors: string | null }>(
      'SELECT colors FROM mind_reflections WHERE id=?', [id]
    );
    return local?.colors ?? null;
  } catch { return null; }
}

/** Generic apply: upsert server payload into local SQLite table. */
async function applyEntityToTable(
  db: Awaited<ReturnType<typeof openDatabase>>,
  entity: string,
  records: any[],
  deletedIds?: Set<string>,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const config = ENTITY_CONFIG[entity];
  if (!config) return [];
  const { table, pk } = config;

  const alive = records.filter(r => !r.deleted);
  const dead = records.filter(r => r.deleted);
  const applied: unknown[] = [];

  // Bulk preload local metadata for conflict resolution (replaces 2N per-record queries)
  const localMetaRows = await db.getAllAsync<{ pk_val: string; updated_at: number | null; deleted: number | null }>(
    `SELECT ${pk} as pk_val, updated_at, deleted FROM ${table}`
  );
  const localMeta = new Map<string, { updated_at: number; deleted: number }>();
  for (const row of localMetaRows) {
    localMeta.set(row.pk_val, { updated_at: row.updated_at ?? 0, deleted: row.deleted ?? 0 });
  }

  for (const r of alive) {
    try {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      // Profile entity may not have profile_id in payload; default to 'self'
      const id = resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
      if (!id) continue;
      if (deletedIds?.has(id)) {
        await db.runAsync(`UPDATE ${table} SET deleted=1,synced=1 WHERE ${pk}=?`, [id]);
        localMeta.set(id, { updated_at: localMeta.get(id)?.updated_at ?? 0, deleted: 1 });
        continue;
      }

      const local = localMeta.get(id);
      const serverTs = Number(r.updatedAt ?? 0);

      if (local?.deleted === 1) {
        // Local is deleted — only skip if local is newer (local delete wins).
        if (local.updated_at > serverTs) continue;
      } else if (local && local.updated_at > serverTs) {
        continue;
      }

      // Entity-specific pre-processing
      let processedRecord = r;
      if (entity === 'reflection') {
        const preservedColors = await preserveReflectionColors(db, id, r.colors);
        if (preservedColors) {
          processedRecord = { ...r, colors: JSON.parse(preservedColors) };
        }
      }

      // Build row from server payload (camelCase → snake_case mapping)
      const row = serverPayloadToRow(entity, processedRecord);
      if (!row) continue;

      // Use UPDATE+INSERT instead of INSERT OR REPLACE to preserve local-only columns
      // (e.g. exercise.health_synced, plan_items.reflection_id)
      // Reset deleted=0 when server has a newer alive version (fixes ghost deletion after cross-device edit)
      const columns = Object.keys(row);
      const setClause = columns.map(c => `${c}=?`).join(',');
      const values = Object.values(row) as (string | number | null)[];
      const result = await db.runAsync(
        `UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`,
        [...values, id],
      );
      if (result.changes === 0) {
        const placeholders = columns.map(() => '?').join(',');
        try {
          await db.runAsync(
            `INSERT INTO ${table} (${columns.join(',')},synced) VALUES (${placeholders},1)`,
            values,
          );
        } catch (insertErr: any) {
          // Race condition: concurrent sync inserted the row between UPDATE and INSERT
          if (insertErr?.message?.includes('UNIQUE constraint')) {
            await db.runAsync(
              `UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`,
              [...values, id],
            );
          } else {
            throw insertErr;
          }
        }
      }
      // Update local meta map so subsequent records for same id see the new state
      localMeta.set(id, { updated_at: Number(r.updatedAt ?? 0), deleted: 0 });
      applied.push(processedRecord);
    } catch (e) {
      console.error(`[Sync] Failed to apply ${entity} record:`, e);
    }
  }

  for (const r of dead) {
    try {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const id = resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
      if (id) {
        const local = localMeta.get(id);
        const serverTs = Number(r.updatedAt ?? 0);
        if (!(local && local.updated_at > serverTs)) {
          await db.runAsync(`UPDATE ${table} SET deleted=1,synced=1 WHERE ${pk}=?`, [id]);
          _hasSyncedDeletes = true;
          // Cascade plan deletion to child entities (transactional)
          if (entity === 'plan') {
            await withDbLock(() => db.withTransactionAsync(async () => {
              await db.runAsync('UPDATE plan_items SET deleted=1,synced=1 WHERE plan_id=?', [id]);
              await db.runAsync('UPDATE plan_item_checkins SET deleted=1,synced=1 WHERE plan_item_id IN (SELECT id FROM plan_items WHERE plan_id=?)', [id]);
              await db.runAsync('UPDATE daily_custom_todos SET deleted=1,synced=1 WHERE plan_id=?', [id]);
              await db.runAsync('UPDATE daily_todo_history SET deleted=1,synced=1 WHERE plan_id=?', [id]);
            }));
          }
        }
      }
    } catch (e) {
      console.error(`[Sync] Failed to apply ${entity} deletion:`, e);
    }
  }

  return applied;
}

/** Safely stringify a value for SQLite TEXT column — skip if already a string. */
function safeJson(v: unknown, fallback: unknown = []): string {
  if (typeof v === 'string') return v;
  return JSON.stringify(v ?? fallback);
}

/** Convert camelCase server payload to snake_case SQLite row. */
function serverPayloadToRow(entity: string, r: Record<string, unknown>): Record<string, unknown> | null {
  switch (entity) {
    case 'habit':
      return {
        id: r.id, name: r.name, start_date: r.startDate, target_days: r.targetDays ?? 0,
        goal: r.goal ?? '', insight: r.insight ?? '', create_tag: r.createTag ? 1 : 0,
        done_days: r.doneDays ?? 0, streak: r.streak ?? 0, interrupted: r.interrupted ?? 0,
        status: r.status ?? 'notStarted', checked_dates: safeJson(r.checkedDates),
        pause_reason: r.pauseReason ?? '', abandon_reason: r.abandonReason ?? '',
        alarm_enabled: r.alarmEnabled ? 1 : 0, alarm_hour: r.alarmHour ?? 8, alarm_minute: r.alarmMinute ?? 0,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'reflection':
      return {
        id: r.id, created_at: r.timestamp ?? r.created_at, content: r.content,
        tags: safeJson(r.tags), mood: r.mood ?? null,
        card_theme: r.cardTheme ?? r.card_theme ?? null,
        link: r.link ?? null,
        linked_plan_id: r.linkedPlanItemId ?? r.linked_plan_id ?? null,
        is_pinned: (r.isPinned ?? r.is_pinned) ? 1 : 0,
        is_published: (r.isPublished ?? r.is_published) ? 1 : 0,
        colors: r.colors ? safeJson(r.colors) : null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'fasting':
      return {
        id: r.id, target_hours: r.targetHours ?? r.target_hours,
        started_at: r.startedAt ?? r.started_at, ended_at: r.endedAt ?? r.ended_at ?? null,
        estimated_kcal: r.estimatedKcal ?? r.estimated_kcal ?? null,
        insight: r.insight ?? null, updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'food': {
      const ts = r.timestamp ?? r.ts ?? Date.now();
      const entryDate = r.entry_date || r.entryDate || (ts ? (() => { const d = new Date(Number(ts)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : '');
      return {
        id: r.id, name: r.name, cal: r.calories ?? r.cal ?? 0, note: r.note ?? '',
        entry_date: entryDate, ts,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    }
    case 'checkin':
      return {
        date: r.date, done: r.done ? 1 : 0, note: r.note ?? '', streak: r.streak ?? 0,
        timestamp: r.timestamp ?? null, weight: r.weight ?? null, grace: r.grace ? 1 : 0,
        total_days: r.totalDays ?? r.total_days ?? null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'exercise':
      return {
        id: r.id, sport_key: r.sportKey ?? r.sport_key, sport_icon: r.sportIcon ?? r.sport_icon ?? '',
        duration_sec: r.durationSec ?? r.duration_sec ?? 0, distance_km: r.distanceKm ?? r.distance_km ?? 0,
        calories: r.calories ?? 0, avg_pace: r.avgPace ?? r.avg_pace ?? 0,
        track_points: safeJson(r.trackPoints ?? r.track_points),
        is_gps_sport: (r.isGpsSport ?? r.is_gps_sport) ? 1 : 0,
        mode: r.mode ?? null, target: r.target ? safeJson(r.target) : null,
        segment_paces: r.segmentPaces ? safeJson(r.segmentPaces) : null,
        elevation_gain: r.elevationGain ?? null, paused_duration: r.pausedDuration ?? null,
        reps: r.reps ?? null, sets: r.sets ? safeJson(r.sets) : null, met: r.met ?? null,
        ts: r.timestamp ?? r.ts ?? Date.now(), updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'meditation':
      return {
        date: r.date, dur: r.dur ?? '0', mood: r.mood ?? '',
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'profile': {
      const profileId = r.profileId ?? r.profile_id ?? 'self';
      const profileData = r.data ?? {};
      return {
        profile_id: profileId, data: typeof profileData === 'string' ? profileData : JSON.stringify(profileData),
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    }
    case 'plan':
      return {
        id: r.id, name: r.name, goal: r.goal ?? '', slogan: r.slogan ?? '',
        start_date: r.startDate, end_date: r.endDate,
        status: r.status ?? 'not_started', progress: r.progress ?? 0,
        last_delayed_notify_at: r.lastDelayedNotifyAt ?? null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'planItem': {
      const row: Record<string, unknown> = {
        id: r.id, plan_id: r.planId ?? '', name: r.name ?? '', description: r.description ?? '',
        start_date: r.startDate, end_date: r.endDate, content_url: r.contentUrl ?? '',
        total_checkin_days: r.totalCheckinDays ?? 0, status: r.status ?? 'not_started',
        progress: r.progress ?? 0, link: r.link ?? 'manual',
        link_config: safeJson(r.linkConfig, {}),
        item_order: r.order ?? 0, priority: r.priority ?? 'medium',
        target_metric: r.targetMetric ?? '',
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
      // Only include reflection_id/trail_id when server sends them, to preserve local value
      if (r.reflectionId !== undefined) row.reflection_id = r.reflectionId;
      if (r.trailId !== undefined) row.trail_id = r.trailId;
      row.frequency = r.frequency ? safeJson(r.frequency) : null;
      row.tags = r.tags ? safeJson(r.tags) : null;
      return row;
    }
    case 'planItemCheckin':
      return {
        id: r.id, plan_item_id: r.planItemId ?? '', date: r.date ?? '',
        done: r.done ? 1 : 0, note: r.note ?? '', linked_module: r.linkedModule ?? '',
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'grace':
      return {
        date: r.date, restored_at: r.restoredAt ?? Date.now(),
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'dailyCustomTodo':
      return {
        id: r.id, plan_id: r.planId ?? '', date: r.date ?? '', name: r.name ?? '',
        done: r.done ? 1 : 0, todo_order: r.order ?? 0, recurring: r.recurring ? 1 : 0,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'dailyTodoHistory':
      return {
        id: r.id, plan_id: r.planId ?? '', date: r.date ?? '',
        plan_items: safeJson(r.planItems),
        custom_todos: safeJson(r.customTodos),
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'thoughtTrail':
      return {
        id: r.id, name: r.name ?? '', description: r.description ?? '',
        reflection_ids: safeJson(r.reflectionIds),
        note_ids: safeJson(r.noteIds ?? []),
        source: r.source ?? 'manual',
        insight_summary: r.insightSummary ?? null,
        insight_cache: r.insightCache ? safeJson(r.insightCache) : null,
        review_cache: r.reviewCache ? safeJson(r.reviewCache) : null,
        linked_plan_item_ids: r.linkedPlanItemIds ? safeJson(r.linkedPlanItemIds) : null,
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'trailNote':
      return {
        id: r.id, trail_id: r.trailId ?? '', content: r.content ?? '',
        tags: safeJson(r.tags), mood: r.mood ?? null,
        source: r.source ?? 'free',
        guided_question: r.guidedQuestion ?? null,
        note_order: r.order ?? 0,
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'reflectionLink':
      return {
        link_id: r.linkId ?? r.id, from_id: r.fromId ?? '', to_id: r.toId ?? '',
        link_type: r.type ?? '', note: r.note ?? null,
        created_at: r.createdAt ?? null,
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'aiConfig':
      return {
        config_id: r.configId ?? r.id, mode: r.mode ?? 'hybrid',
        models: safeJson(r.models, []),
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    case 'checkinReview':
      return {
        id: r.id, review_id: r.reviewId ?? r.id,
        user_id: r.userId ?? 'self',
        period: r.period ?? 'week',
        start_date: r.startDate, end_date: r.endDate,
        review_data: typeof r.reviewData === 'string' ? r.reviewData : JSON.stringify(r.reviewData ?? {}),
        updated_at: r.updatedAt ?? null, deleted: 0,
      };
    default:
      return null;
  }
}

async function applyServerChanges(data: Record<string, unknown[]>, deletedIds?: Set<string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const db = await openDatabase();
  const patch: Record<string, unknown> = {};

  for (const [entity, records] of Object.entries(data)) {
    if (!records?.length) continue;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const applied = await applyEntityToTable(db, entity, records, deletedIds, signal);

    // Special: recompute totalMedMinutes after meditation sync
    if (entity === 'meditation' && applied.length > 0) {
      const allMed = await db.getAllAsync<{ dur: string }>('SELECT dur FROM meditation_history WHERE deleted = 0');
      patch.totalMedMinutes = allMed.reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
    }

    // Special: update aiMode/aiModels from aiConfig sync
    if (entity === 'aiConfig' && applied.length > 0) {
      const latest = applied[applied.length - 1] as Record<string, unknown>;
      if (latest.mode) patch.aiMode = latest.mode;
      if (latest.models) {
        try { patch.aiModels = typeof latest.models === 'string' ? JSON.parse(latest.models) : latest.models; } catch {}
      }
    }

    // Map entity to store key for patch
    const storeKey = ENTITY_STORE_KEY[entity];
    if (storeKey && applied.length > 0) {
      patch[storeKey] = applied;
    }
  }

  return patch;
}

/** Map sync entity name to Zustand store key. */
const ENTITY_STORE_KEY: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fastingHistory',
  food: 'foodLog', checkin: 'checkinHistory', exercise: 'exerciseLog',
  meditation: 'medHistory', profile: 'userProfile',
  plan: 'plans', planItem: 'planItems', planItemCheckin: 'planItemCheckins',
  grace: 'graceHistory', dailyCustomTodo: 'dailyCustomTodos', dailyTodoHistory: 'dailyTodoHistory',
  thoughtTrail: 'thoughtTrails',
  trailNote: 'trailNotes',
  reflectionLink: 'reflectionLinks',
  checkinReview: 'checkinReviews',
};

// ── Main sync entry point ─────────────────────────────────────────
export async function runSync(): Promise<void> {
  if (_syncing) {
    // Reset stuck sync flag if timeout exceeded, and abort in-flight DB ops
    if (Date.now() - _syncingSince > SYNC_TIMEOUT_MS) {
      console.warn('[Sync] Previous sync timed out, aborting');
      _abortController?.abort();
      _abortController = null;
      _syncing = false;
    } else {
      return;
    }
  }
  const token = _tokenProvider?.();
  if (!token) return;
  const userId = _userIdProvider?.() ?? undefined;

  _syncing = true;
  _syncingSince = Date.now();

  // Ensure persisted _lastSyncAt is loaded before first sync
  await loadLastSyncAt();
  _abortController = new AbortController();
  const { signal } = _abortController;
  const myGeneration = ++_syncGeneration;
  console.log('[Sync] Starting sync...');
  log.info('Starting sync');

  // Prune stale queue items (>30 days old) to prevent unbounded growth
  pruneStaleQueueItems().catch(e => console.error('[Sync] pruneStaleQueueItems error:', e));

  try {
    // 1. Drain and push queued changes (loop until queue is empty, max 10 batches)
    let pushedAnything = false;
    for (let batch = 0; batch < 10; batch++) {
      const items = await drainQueue(50);
      if (!items.length) break;
      pushedAnything = true;

      console.log(`[Sync] Pushing batch ${batch + 1}: ${items.length} queued changes`);
      const changes: Array<{ entity: string; entityId: string; payload: any; op: string }> = [];
      const corruptIds: number[] = [];
      for (const item of items) {
        try {
          changes.push({
            entity: item.entity,
            entityId: item.entity_id,
            payload: JSON.parse(item.payload),
            op: item.operation === 'delete' ? 'delete' : 'upsert',
          });
        } catch {
          console.warn(`[Sync] Corrupt queue item ${item.id}, skipping`);
          corruptIds.push(item.id);
        }
      }
      if (corruptIds.length) await removeQueueItems(corruptIds);
      if (!changes.length) continue;

      let pushResult: any;
      try {
        pushResult = await apiSyncPush(token, _lastSyncAt, changes, userId);
      } catch (pushErr: any) {
        // Network or server error — apply exponential backoff
        console.error('[Sync] Push request failed:', pushErr);
      log.error(pushErr, { phase: 'push' });
        for (const item of items) {
          const newAttempt = item.retry_count + 1;
          if (newAttempt >= MAX_RETRY_ATTEMPTS) {
            await markQueueItemFailed(item.id, pushErr?.message || 'Push request failed');
          } else {
            const delay = getBackoffDelay(newAttempt);
            await markQueueItemRetry(item.id, newAttempt, Date.now() + delay);
          }
        }
        continue;
      }

      // Build set of rejected entity+id pairs (before removing from queue)
      const rejectedSet = new Set<string>();
      if (pushResult.rejected?.length) {
        for (const r of pushResult.rejected) {
          const config = ENTITY_CONFIG[r.entity];
          const idField = config?.pk ?? 'id';
          rejectedSet.add(`${r.entity}:${r.payload?.[idField] ?? r.entityId}`);
        }
      }

      // Separate accepted and rejected items
      const acceptedItems = items.filter(i => !rejectedSet.has(`${i.entity}:${i.entity_id}`));
      const rejectedItems = items.filter(i => rejectedSet.has(`${i.entity}:${i.entity_id}`));

      // Remove accepted items from queue
      if (acceptedItems.length) {
        await removeQueueItems(acceptedItems.map(i => i.id));
      }

      // Mark rejected items as conflict (server rejected the data)
      for (const item of rejectedItems) {
        await markQueueItemConflict(item.id, 'Server rejected this change');
      }

      // Mark pushed records as synced / cleanup deleted (only accepted items)
      const upserted: Record<string, string[]> = {};
      const deleted: Record<string, string[]> = {};
      for (const item of acceptedItems) {
        if (item.operation === 'delete') {
          (deleted[item.entity] ??= []).push(item.entity_id);
        } else {
          (upserted[item.entity] ??= []).push(item.entity_id);
        }
      }

      for (const [entity, ids] of Object.entries(upserted)) {
        if (ids.length) await markSynced(entity, ids);
      }
      for (const [entity, ids] of Object.entries(deleted)) {
        if (ids.length) await cleanupDeleted(entity, ids);
      }

      // Apply server changes returned by push (includes server's conflict resolution)
      const allServerChanges = [
        ...(pushResult.changes ?? []),
        ...(pushResult.rejected ?? []),
      ];
      if (allServerChanges.length) {
        const byEntity: Record<string, unknown[]> = {};
        for (const c of allServerChanges) {
          const config = ENTITY_CONFIG[c.entity];
          const pk = config?.pk ?? 'id';
          const payload = {
            ...(c.deleted ? { ...c.payload, deleted: true } : c.payload),
            [pk]: c.payload[pk] ?? c.entityId,
          };
          (byEntity[c.entity] ??= []).push(payload);
        }
        const deletedIds = _deletedIdsProvider?.();
        const patch = await applyServerChanges(byEntity, deletedIds, signal);
        if (Object.keys(patch).length) _onChanges?.(patch);
      }

      if (_syncGeneration === myGeneration) {
        _lastSyncAt = pushResult.serverTime;
        await saveLastSyncAt(_lastSyncAt);
      }
    }

    if (pushedAnything) {
      console.log('[Sync] Push complete');
    }

    // 2. Pull server changes (delta sync with per-entity timestamps)
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    // Collect per-entity last sync timestamps for delta pull
    const entityTimestamps: Record<string, string> = {};
    for (const entity of Object.keys(ENTITY_CONFIG)) {
      entityTimestamps[entity] = await getLastSyncTimestamp(entity);
    }

    const pullResult = await apiSyncPull(token, userId);
    if (pullResult.data && Object.keys(pullResult.data).length > 0) {
      const deletedIds = _deletedIdsProvider?.();
      const patch = await applyServerChanges(pullResult.data, deletedIds, signal);
      if (Object.keys(patch).length) _onChanges?.(patch);

      // Update per-entity sync timestamps based on applied records
      const serverTime = pullResult.serverTime;
      const serverTimeIso = serverTime ? new Date(serverTime).toISOString() : new Date().toISOString();
      for (const entity of Object.keys(pullResult.data)) {
        if (pullResult.data[entity]?.length > 0) {
          await setLastSyncTimestamp(entity, serverTimeIso);
        }
      }
    }

    if (_syncGeneration === myGeneration) {
      _lastSyncAt = pullResult.serverTime;
      await saveLastSyncAt(_lastSyncAt);
    }
    console.log('[Sync] Pull complete');
    if (_hasSyncedDeletes) {
      await purgeDeletedRecords();
      _hasSyncedDeletes = false;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('[Sync] Aborted (timed out)');
    } else {
      console.error('[Sync] Error:', err);
      log.error(err, { phase: 'sync' });
    }
  } finally {
    // Only reset if this is still the current sync (not a stale timed-out call)
    if (_syncGeneration === myGeneration) {
      _syncing = false;
      _abortController = null;
    }
  }
}

export function isSyncing(): boolean {
  return _syncing;
}

/** Purge soft-deleted records that have already been synced to server. */
async function purgeDeletedRecords(): Promise<void> {
  try {
    const db = await openDatabase();
    const tables = new Set(Object.values(ENTITY_CONFIG).map(c => c.table));
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table} WHERE deleted = 1 AND synced = 1`);
    }
  } catch (e) {
    console.error('[Sync] purgeDeletedRecords error:', e);
  }
}

/** Reset all sync state (called on logout/data reset). */
export async function resetSyncState(): Promise<void> {
  _lastSyncAt = 0;
  _lastSyncAtLoaded = false;
  disconnectRealtime();
  try {
    const db = await openDatabase();
    await setState(db, 'lastSyncAt', '0');
    await db.runAsync('DELETE FROM sync_queue');
    await db.runAsync('DELETE FROM sync_metadata');
    // Clear all entity tables to prevent stale data contaminating next user
    const tables = Object.values(ENTITY_CONFIG).map(c => c.table);
    for (const table of new Set(tables)) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
  } catch {}
}
