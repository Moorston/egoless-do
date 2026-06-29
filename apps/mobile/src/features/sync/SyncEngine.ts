import { openDatabase, getState, setState, withDbLock } from '../../db/schema';
import {
  drainQueue, removeQueueItems, getQueueCount, pruneStaleQueueItems,
  enqueueChange,
  markQueueItemFailed, markQueueItemConflict, markQueueItemRetry, resetAllPendingForRetry,
  getLastSyncTimestamp, setLastSyncTimestamp,
  getSyncProgress, updateSyncProgress, resetSyncProgress,
  type SyncQueueItem,
} from '../../db/syncQueue';
import { flushWrites } from '../../store/storageAdapter';
import {
  apiSyncPush, apiSyncPull, apiSyncPullPost, apiSyncCheck, apiSyncPullEntity,
  createLogger, SCHEMAS, buildServerPayloadToRow, ApiError, KickedOutError, resolveConflict,
  MS_PER_DAY,
} from '@egoless-do/core';
import type { SyncEntity, SyncPushResult, SyncPullResult } from '@egoless-do/core';
import {
  rowToHabit, rowToReflection, rowToFasting, rowToFood, rowToCheckin,
  rowToExercise, rowToMeditation, rowToProfile, rowToPlan, rowToPlanItem,
  rowToPlanItemCheckin, rowToGrace, rowToDailyCustomTodo, rowToDailyTodoHistory,
  rowToThoughtTrail, rowToTrailNote, rowToReflectionLink, rowToAIConfig, rowToCheckinReview,
} from '../../store/rowMappers';
import { dbGetAllFoodEntries } from '../../db/queries';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeAgent, type RealtimeChangeEvent } from './RealtimeAgent';

const DOMException = (globalThis as Record<string, unknown>).DOMException as typeof Error | undefined
  ?? class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? 'DOMException';
    }
  };

const log = createLogger('SyncEngine');
const DEVICE_SYNCED_KEY = 'device_initial_synced';
const CLOCK_OFFSET_KEY = 'sync_clock_offset';
const PUSH_PULL_SEPARATE_THRESHOLD = 20;
const SYNC_TIMEOUT_MS = 120_000;
const MAX_RETRY_ATTEMPTS = 5;
const ENTITY_CONFIG: Record<string, { table: string; pk: string }> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, { table: SCHEMAS[k].sqlite.table, pk: SCHEMAS[k].sqlite.pk }])
);
const ENTITY_STORE_KEY: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fastingHistory',
  food: 'foodLog', checkin: 'checkinHistory', exercise: 'exerciseLog',
  meditation: 'medHistory', profile: 'userProfile',
  plan: 'plans', planItem: 'planItems', planItemCheckin: 'planItemCheckins',
  grace: 'graceHistory', dailyCustomTodo: 'dailyCustomTodos', dailyTodoHistory: 'dailyTodoHistory',
  thoughtTrail: 'thoughtTrails', trailNote: 'trailNotes',
  reflectionLink: 'reflectionLinks', checkinReview: 'checkinReviews',
};
const ENTITY_COLL_MAP: Record<string, string> = {
  habits: 'habit', mind_reflections: 'reflection', fasting_sessions: 'fasting',
  food_entries: 'food', checkin_records: 'checkin', meditation_history: 'meditation',
  user_profiles: 'profile', exercise_entries: 'exercise', plans: 'plan',
  plan_items: 'planItem', plan_item_checkins: 'planItemCheckin',
  daily_custom_todos: 'dailyCustomTodo', daily_todo_history: 'dailyTodoHistory',
  grace_history: 'grace', thought_trails: 'thoughtTrail', trail_notes: 'trailNote',
  reflection_links: 'reflectionLink', ai_configs: 'aiConfig', checkin_reviews: 'checkinReview',
};
const _serverPayloadToRowFns = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [k, buildServerPayloadToRow(SCHEMAS[k])])
) as Record<string, (r: Record<string, unknown>) => Record<string, unknown> | null>;

export interface SyncMetric {
  timestamp: number;
  durationMs: number;
  pushed: number;
  pulled: number;
  success: boolean;
  error?: string;
}

export class SyncEngine {
  private _syncing = false;
  private _syncingSince = 0;
  private _syncGeneration = 0;
  private _abortController: AbortController | null = null;
  private _orphanRecoveryDone = false;
  private _clockOffset = 0;
  private _migrationDone = false;
  private _syncMetrics: SyncMetric[] = [];
  private static MAX_METRICS = 20;
  private _tokenProvider: (() => string | null) | null = null;
  private _userIdProvider: (() => string | null) | null = null;
  private _onChanges: ((patch: Record<string, unknown>) => void) | null = null;
  private _deletedIdsProvider: (() => Set<string>) | null = null;
  private _onKickedOut: (() => void) | null = null;
  private _lastSyncAt = 0;
  private _lastSyncAtLoaded = false;
  private _hasSyncedDeletes = false;
  private _netInfoUnsubscribe: (() => void) | null = null;
  private _realtimeFallbackTimer: ReturnType<typeof setInterval> | null = null;
  private _realtimeAgent = new RealtimeAgent();
  private _initialSyncing = false;
  private _pendingSyncAfterInit = false;
  private _realtimeDebounce = new Map<string, ReturnType<typeof setTimeout>>();
  private _realtimeEventTimes = new Map<string, number[]>();

  // ── Configuration ────────────────────────────────────────────────
  setTokenProvider(fn: () => string | null) { this._tokenProvider = fn; }
  setUserIdProvider(fn: () => string | null) { this._userIdProvider = fn; }
  setChangeHandler(fn: (patch: Record<string, unknown>) => void) { this._onChanges = fn; }
  setDeletedIdsProvider(fn: () => Set<string>) { this._deletedIdsProvider = fn; }
  setKickedOutHandler(fn: () => void) { this._onKickedOut = fn; }
  setMigrationDone(v: boolean) { this._migrationDone = v; }
  setLastSyncAt(ts: number) { this._lastSyncAt = ts; }
  getMigrationDone(): boolean { return this._migrationDone; }
  getClockOffset(): number { return this._clockOffset; }

  async isDeviceSyncedBefore(): Promise<boolean> {
    return (await AsyncStorage.getItem(DEVICE_SYNCED_KEY)) === '1';
  }

  // ── Realtime (SSE) ───────────────────────────────────────────────
  private _sseConnected = false;

  connectRealtime(pbUrl?: string): void {
    const token = this._tokenProvider?.();
    if (!token) return;

    this.disconnectRealtime();
    this.startNetworkRecoveryListener();

    if (pbUrl) {
      this._realtimeAgent.setChangeHandler((event) => this.handleRealtimeEvent(event));
      this._realtimeAgent.setStatusHandler((connected) => {
        this._sseConnected = connected;
        if (!connected && !this._realtimeFallbackTimer) this.startFallbackPolling();
        else if (connected) this.stopFallbackPolling();
      });
      this._realtimeAgent.connect(pbUrl, token);
    }
    // Only start fallback polling if SSE isn't going to be connected
    if (!pbUrl) this.startFallbackPolling();
  }

  disconnectRealtime(): void {
    this._realtimeAgent.disconnect();
    this._sseConnected = false;
    this.stopFallbackPolling();
    this.stopNetworkRecoveryListener();
  }

  isRealtimeConnected(): boolean {
    return this._sseConnected;
  }

  private stopFallbackPolling() {
    if (this._realtimeFallbackTimer) {
      clearInterval(this._realtimeFallbackTimer);
      this._realtimeFallbackTimer = null;
    }
  }

  private startFallbackPolling() {
    if (this._realtimeFallbackTimer) return;
    this._realtimeFallbackTimer = setInterval(() => {
      const currentToken = this._tokenProvider?.();
      if (currentToken) this.pollForChanges(currentToken);
    }, 120_000);
  }

  private getAdaptiveDebounce(entity: string): number {
    const times = this._realtimeEventTimes.get(entity) || [];
    const now = Date.now();
    const recent = times.filter(t => now - t < 2000);
    this._realtimeEventTimes.set(entity, [...recent, now]);
    if (recent.length >= 5) return 1500;
    if (recent.length >= 2) return 300;
    return 0;
  }

  private async handleRealtimeEvent(event: RealtimeChangeEvent): Promise<void> {
    const { entity, payload } = event;
    if (!entity) return;

    const delay = this.getAdaptiveDebounce(entity);
    if (delay === 0) {
      this.processRealtimeEntity(entity, payload);
      return;
    }

    const existing = this._realtimeDebounce.get(entity);
    if (existing) clearTimeout(existing);
    this._realtimeDebounce.set(entity, setTimeout(() => {
      this._realtimeDebounce.delete(entity);
      this.processRealtimeEntity(entity, payload);
    }, delay));
  }

  private async processRealtimeEntity(entity: string, payload: unknown): Promise<void> {
    const token = this._tokenProvider?.();
    if (!token) return;

    try {
      if (payload) {
        const deletedIds = this._deletedIdsProvider?.();
        const patch = await this.applyServerChanges({ [entity]: [payload] }, deletedIds);
        if (patch && Object.keys(patch).length) this._onChanges?.(patch);
        return;
      }

      const result = await apiSyncPullPost(token, {
        entities: [entity],
        since: this._lastSyncAt > 0 ? this._lastSyncAt : undefined,
      });
      if (result?.data?.[entity]) {
        const deletedIds = this._deletedIdsProvider?.();
        const patch = await this.applyServerChanges({ [entity]: result.data[entity] }, deletedIds);
        if (patch && Object.keys(patch).length) this._onChanges?.(patch);
      }
      if (result?.serverTime) {
        this._lastSyncAt = result.serverTime;
        await this.saveLastSyncAt(this._lastSyncAt);
      }
    } catch (err) {
      if (err instanceof KickedOutError) { this.handleKickedOut(); return; }
      log.warn('Realtime event handler failed:', err);
      this.runSync();
    }
  }

  private async pollForChanges(token: string): Promise<void> {
    try {
      const queueCount = await getQueueCount();
      if (queueCount > 0) { this.runSync(); return; }

      try {
        const checkResult = await apiSyncCheck(token, this._lastSyncAt, this._userIdProvider?.() ?? undefined);
        if (!checkResult.hasChanges) return;
        const changedEntities = Object.keys(checkResult.changed);
        if (changedEntities.length > 0) {
          const result = await apiSyncPullPost(token, {
            entities: changedEntities,
            since: this._lastSyncAt > 0 ? this._lastSyncAt : undefined,
          });
          if (result?.data) {
            const deletedIds = this._deletedIdsProvider?.();
            const patch = await this.applyServerChanges(result.data, deletedIds);
            if (patch && Object.keys(patch).length) this._onChanges?.(patch);
            this._lastSyncAt = result.serverTime;
            await this.saveLastSyncAt(this._lastSyncAt);
          }
          return;
        }
      } catch { /* fall through */ }
      this.runSync();
    } catch (err) {
      log.error(err, { phase: 'poll' });
    }
  }

  private startNetworkRecoveryListener(): void {
    if (this._netInfoUnsubscribe) return;
    this._netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        resetAllPendingForRetry().then(count => {
          if (count > 0) {
            log.info(`Network recovered, resetting ${count} items`);
            this.runSync();
          }
        }).catch(() => {});
      }
    });
  }

  private stopNetworkRecoveryListener(): void {
    this._netInfoUnsubscribe?.();
    this._netInfoUnsubscribe = null;
  }

  // ── Clock offset ─────────────────────────────────────────────────
  private async loadClockOffset(): Promise<void> {
    try {
      const v = await AsyncStorage.getItem(CLOCK_OFFSET_KEY);
      if (v) this._clockOffset = parseInt(v, 10) || 0;
    } catch {} // intentional: clock offset is optional, defaults to 0
  }

  private async saveClockOffset(offset: number): Promise<void> {
    this._clockOffset = offset;
    try { await AsyncStorage.setItem(CLOCK_OFFSET_KEY, String(offset)); } catch {} // intentional: best-effort persistence
  }

  private updateClockOffset(serverTime: number): void {
    if (!serverTime || serverTime <= 0) return;
    const offset = serverTime - Date.now();
    if (Math.abs(offset) < MS_PER_DAY) {
      this.saveClockOffset(offset);
    }
  }

  // ── Last sync timestamp ──────────────────────────────────────────
  private async loadLastSyncAt(): Promise<void> {
    if (this._lastSyncAtLoaded) return;
    try {
      const db = await openDatabase();
      const val = await getState(db, 'lastSyncAt');
      if (val) this._lastSyncAt = Number(val) || 0;
    } catch {} // intentional: lastSyncAt defaults to 0
    this._lastSyncAtLoaded = true;
  }

  private async saveLastSyncAt(ts: number): Promise<void> {
    try {
      const db = await openDatabase();
      await setState(db, 'lastSyncAt', String(ts));
    } catch {} // intentional: best-effort persistence
  }

  // ── Soft/Hard reset ──────────────────────────────────────────────
  async softReset(): Promise<void> {
    this._lastSyncAt = 0;
    this._lastSyncAtLoaded = false;
    this.disconnectRealtime();
    try {
      const db = await openDatabase();
      await setState(db, 'lastSyncAt', '0');
      await db.runAsync('DELETE FROM sync_metadata');
    } catch (e) {
      log.warn(e, { phase: 'softReset' });
    }
  }

  async hardReset(): Promise<void> {
    this._lastSyncAt = 0;
    this._lastSyncAtLoaded = false;
    this.disconnectRealtime();
    try {
      const db = await openDatabase();
      await setState(db, 'lastSyncAt', '0');
      await db.runAsync('DELETE FROM sync_queue');
      await db.runAsync('DELETE FROM sync_metadata');
      const tables = ['habits','mind_reflections','fasting_sessions','food_entries','checkin_records','exercise_entries','meditation_history','user_profiles','plans','plan_items','plan_item_checkins','grace_history','daily_custom_todos','daily_todo_history','thought_trails','trail_notes','reflection_links','ai_configs','checkin_reviews'];
      for (const table of new Set(tables)) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
      await db.runAsync("DELETE FROM app_state WHERE key IN ('initialSyncDone', 'initialSyncPhase')");
      await db.runAsync('DELETE FROM sync_progress');
    } catch (e) {
      log.warn(e, { phase: 'hardReset' });
    }
  }

  // ── Kicked out ───────────────────────────────────────────────────
  private isKickedOutError(err: unknown): boolean {
    return err instanceof KickedOutError || (err instanceof ApiError && err.status === 401 && err.code === 'KICKED_OUT');
  }

  private handleKickedOut() {
    log.warn('Kicked out');
    this.disconnectRealtime();
    this._onKickedOut?.();
  }

  // ── Server payload helpers ───────────────────────────────────────
  private serverPayloadToRow(entity: string, r: Record<string, unknown>): Record<string, unknown> | null {
    return _serverPayloadToRowFns[entity]?.(r) ?? null;
  }

  private resolveEntityId(r: Record<string, unknown>, pk: string, fallback?: string): string | undefined {
    return (r[pk] ?? r.id ?? r.date) as string | undefined
      ?? (pk.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as string | undefined)
      ?? fallback;
  }

  // ── Apply server changes ─────────────────────────────────────────
  async applyServerChanges(data: Record<string, unknown[]>, deletedIds?: Set<string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const db = await openDatabase();
    const patch: Record<string, unknown> = {};
    if (!data || typeof data !== 'object') return patch;
    const entries = Object.entries(data);
    for (const [entity, records] of entries) {
      if (!Array.isArray(records) || records.length === 0) continue;
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const { storeMapped } = await this.applyEntityToTable(db, entity, records, deletedIds, signal);
        if (entity === 'meditation') {
          const allMed = await db.getAllAsync<{ dur: string }>('SELECT dur FROM meditation_history WHERE deleted = 0');
          patch.totalMedMinutes = allMed.reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
        }
        if (entity === 'aiConfig' && storeMapped.length > 0) {
          const latest = storeMapped[storeMapped.length - 1] as Record<string, unknown>;
          if (latest.mode) patch.aiMode = latest.mode;
          if (latest.models) patch.aiModels = latest.models;
        }
        const storeKey = ENTITY_STORE_KEY[entity];
        if (storeKey && storeMapped.length > 0) patch[storeKey] = storeMapped;
      } catch (e) {
        log.error(e, { entity, phase: 'applyEntity' });
      }
    }
    return patch;
  }

  private _rowToEntityMap: Record<string, (row: Record<string, unknown>) => unknown> = {
    habit: rowToHabit, reflection: rowToReflection, fasting: rowToFasting,
    food: rowToFood, checkin: rowToCheckin, exercise: rowToExercise,
    meditation: rowToMeditation, profile: rowToProfile, plan: rowToPlan,
    planItem: rowToPlanItem, planItemCheckin: rowToPlanItemCheckin,
    grace: rowToGrace, dailyCustomTodo: rowToDailyCustomTodo,
    dailyTodoHistory: rowToDailyTodoHistory, thoughtTrail: rowToThoughtTrail,
    trailNote: rowToTrailNote, reflectionLink: rowToReflectionLink,
    aiConfig: rowToAIConfig, checkinReview: rowToCheckinReview,
  };

  private async applyEntityToTable(
    db: Awaited<ReturnType<typeof openDatabase>>,
    entity: string, records: any[], deletedIds?: Set<string>, signal?: AbortSignal,
  ): Promise<{ applied: unknown[]; storeMapped: unknown[] }> {
    const config = ENTITY_CONFIG[entity];
    if (!config) return { applied: [], storeMapped: [] };
    const { table, pk } = config;
    const alive = records.filter(r => r && !r.deleted);
    const dead = records.filter(r => r && r.deleted);
    const applied: unknown[] = [];
    const storeMapped: unknown[] = [];
    const mapper = this._rowToEntityMap[entity];

    const allIds = [...alive, ...dead].map(r => this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined)).filter(Boolean) as string[];
    const localMeta = new Map<string, { updated_at: number; deleted: number }>();
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',');
      const localMetaRows = await db.getAllAsync<{ pk_val: string; updated_at: number | null; deleted: number | null }>(
        `SELECT ${pk} as pk_val, updated_at, deleted FROM ${table} WHERE ${pk} IN (${placeholders})`,
        allIds
      );
      for (const row of localMetaRows) {
        localMeta.set(row.pk_val, { updated_at: row.updated_at ?? 0, deleted: row.deleted ?? 0 });
      }
    }

    for (const r of alive) {
      try {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (!r) continue;
        const id = this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
        if (!id) continue;
        if (deletedIds?.has(id)) {
          await db.runAsync(`UPDATE ${table} SET deleted=1,synced=1 WHERE ${pk}=?`, [id]);
          localMeta.set(id, { updated_at: localMeta.get(id)?.updated_at ?? 0, deleted: 1 });
          continue;
        }
        const local = localMeta.get(id);
        const serverTs = Number(r.updatedAt ?? 0);
        if (local && resolveConflict({ clientUpdated: local.updated_at, serverUpdated: serverTs, clientDeleted: local.deleted === 1 }).winner === 'client') continue;

        let processedRecord = r;
        // Preserve local reflection colors if server has none
        if (entity === 'reflection' && !r.colors) {
          try {
            const localColors = await db.getFirstAsync<{ colors: string | null }>('SELECT colors FROM mind_reflections WHERE id=?', [id]);
            if (localColors?.colors) processedRecord = { ...r, colors: JSON.parse(localColors.colors) };
          } catch {} // intentional: color parse failure, use server colors
        }

        const row = this.serverPayloadToRow(entity, processedRecord);
        if (!row) continue;
        const columns = Object.keys(row);
        const values = Object.values(row) as (string | number | null)[];
        if (!columns.length) continue;

        const setClause = columns.map(c => `${c}=?`).join(',');
        const result = await db.runAsync(`UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`, [...values, id]);
        if (result.changes === 0) {
          const placeholders = columns.map(() => '?').join(',');
          try {
            await db.runAsync(`INSERT INTO ${table} (${columns.join(',')},synced) VALUES (${placeholders},1)`, values);
          } catch (insertErr: any) {
            if (insertErr?.message?.includes('UNIQUE constraint')) {
              await db.runAsync(`UPDATE ${table} SET ${setClause},deleted=0,synced=1 WHERE ${pk}=?`, [...values, id]);
            } else throw insertErr;
          }
        }
        localMeta.set(id, { updated_at: serverTs, deleted: 0 });
        applied.push(processedRecord);
        if (mapper) {
          storeMapped.push(mapper(Object.fromEntries(columns.map((c, i) => [c, values[i]]))));
        }
      } catch (e) {
        log.error(e, { entity, phase: 'applyEntity-alive' });
      }
    }

    for (const r of dead) {
      try {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const id = this.resolveEntityId(r, pk, entity === 'profile' ? 'self' : undefined);
        if (!id) continue;
        const local = localMeta.get(id);
        const serverTs = Number(r.updatedAt ?? 0);
        if (local && resolveConflict({ clientUpdated: local.updated_at, serverUpdated: serverTs, clientDeleted: local.deleted === 1, serverDeleted: true }).winner === 'client') continue;
        await db.runAsync(`UPDATE ${table} SET deleted=1,synced=1 WHERE ${pk}=?`, [id]);
        this._hasSyncedDeletes = true;
        if (entity === 'plan') {
          await withDbLock(() => db.withTransactionAsync(async () => {
            await db.runAsync('UPDATE plan_items SET deleted=1,synced=1 WHERE plan_id=?', [id]);
            await db.runAsync('UPDATE plan_item_checkins SET deleted=1,synced=1 WHERE plan_item_id IN (SELECT id FROM plan_items WHERE plan_id=?)', [id]);
            await db.runAsync('UPDATE daily_custom_todos SET deleted=1,synced=1 WHERE plan_id=?', [id]);
            await db.runAsync('UPDATE daily_todo_history SET deleted=1,synced=1 WHERE plan_id=?', [id]);
          }));
        }
      } catch (e) {
        log.error(e, { entity, phase: 'applyEntity-dead' });
      }
    }
    return { applied, storeMapped };
  }

  // ── Mark synced helpers ──────────────────────────────────────────
  private async markSyncedAndRemove(upserted: Record<string, string[]>, deleted: Record<string, string[]>, queueIds: number[]): Promise<void> {
    const db = await openDatabase();
    try {
      await withDbLock(() => db.withTransactionAsync(async () => {
        for (const entity in upserted) {
          const ids = upserted[entity];
          if (!ids?.length) continue;
          const config = ENTITY_CONFIG[entity];
          if (!config) continue;
          const ph = ids.map(() => '?').join(',');
          await db.runAsync(`UPDATE ${config.table} SET synced=1 WHERE ${config.pk} IN (${ph})`, ids);
        }
        for (const entity in deleted) {
          const ids = deleted[entity];
          if (!ids?.length) continue;
          const config = ENTITY_CONFIG[entity];
          if (!config) continue;
          const ph = ids.map(() => '?').join(',');
          await db.runAsync(`UPDATE ${config.table} SET synced=1 WHERE ${config.pk} IN (${ph}) AND deleted=1`, ids);
        }
        if (queueIds.length) {
          const ph = queueIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM sync_queue WHERE id IN (${ph})`, queueIds);
        }
      }));
      if (Object.keys(deleted).length > 0) this._hasSyncedDeletes = true;
    } catch (err) {
      log.error(err, { phase: 'markSyncedAndRemove' });
      throw err;
    }
  }

  // ── Main sync ────────────────────────────────────────────────────
  async runSync(): Promise<void> {
    if (this._syncing) {
      if (Date.now() - this._syncingSince > SYNC_TIMEOUT_MS) {
        log.warn('Previous sync timed out, aborting');
        this._abortController?.abort();
        this._abortController = null;
        this._syncing = false;
      } else return;
    }
    if (this._initialSyncing) {
      log.info('Initial sync in progress, deferring runSync');
      this._pendingSyncAfterInit = true;
      return;
    }
    if (!this._tokenProvider?.()) return;
    const userId = this._userIdProvider?.() ?? undefined;
    const freshToken = () => this._tokenProvider?.() ?? '';

    this._syncing = true;
    this._syncingSince = Date.now();

    // Flush WriteBatcher before draining — ensures buffered writes are in sync_queue
    await flushWrites();
    await this.loadLastSyncAt();
    await this.loadClockOffset();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const myGeneration = ++this._syncGeneration;
    log.info('Starting sync');

    // Reset failed/conflict items back to pending so they get another chance
    await resetAllPendingForRetry().catch(e => log.error(e, { phase: 'resetFailed' }));
    pruneStaleQueueItems().catch(e => log.error(e, { phase: 'prune' }));

    // Orphan recovery (run every sync to catch WriteBatcher failures)
    {
      try {
        const db = await openDatabase();
        let total = 0;
        for (let round = 0; round < 5; round++) {
          let roundTotal = 0;
          for (const [entity, config] of Object.entries(ENTITY_CONFIG)) {
            const orphans = await db.getAllAsync<Record<string, unknown>>(
              `SELECT ${config.pk} FROM ${config.table} WHERE (synced=0 OR synced=2) AND ${config.pk} NOT IN (SELECT entity_id FROM sync_queue WHERE entity=?) LIMIT 200`,
              [entity],
            );
            for (const row of orphans) {
              const id = row[config.pk] as string;
              if (!id) continue;
              try {
                const full = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${config.table} WHERE ${config.pk}=?`, [id]);
                if (full) await enqueueChange(entity as SyncEntity, id, 'upsert', full);
              } catch (e) {
                log.error(e, { entity, id, phase: 'orphan-enqueue' });
              }
            }
            roundTotal += orphans.length;
          }
          total += roundTotal;
          if (roundTotal === 0) break;
        }
        if (total > 0) log.info(`Orphan recovery: ${total} items`);
        this._orphanRecoveryDone = true;
      } catch (e) {
        log.error(e, { phase: 'orphan-recovery' });
      }
    }

    try {
      let pushedAnything = false;
      let pushedItemCount = 0;
      let pushApplySucceeded = false;
      let lastPushResult: SyncPushResult | null = null;
      let pushResult: SyncPushResult | null = null;

      for (let batch = 0; batch < 10; batch++) {
        const items = await drainQueue(50).catch(e => { log.error(e, { phase: 'drain' }); return [] as SyncQueueItem[]; });
        if (!items.length) break;
        pushedAnything = true;
        pushedItemCount += items.length;

        const changes: Array<{ entity: string; entityId: string; payload: any; operation: string; changedFields?: string[] }> = [];
        for (const item of items) {
          try {
            const parsed = JSON.parse(item.payload);
            const changedFields = parsed._changedFields;
            if (changedFields) delete parsed._changedFields;
            changes.push({ entity: item.entity, entityId: item.entity_id, payload: parsed, operation: item.operation === 'delete' ? 'delete' : 'upsert', changedFields });
          } catch {
            await markQueueItemFailed(item.id, 'Corrupt payload');
          }
        }
        if (!changes.length) continue;

        try {
          pushResult = await apiSyncPush(freshToken(), this._lastSyncAt, changes, userId);
        } catch (pushErr: any) {
          if (this.isKickedOutError(pushErr)) { this.handleKickedOut(); return; }
          log.error(pushErr, { phase: 'push' });
          for (const item of items) {
            const na = item.retry_count + 1;
            if (na >= MAX_RETRY_ATTEMPTS) await markQueueItemFailed(item.id, pushErr?.message || 'Push failed');
            else await markQueueItemRetry(item.id, na, Date.now() + Math.min(Math.pow(2, na) * 1000, 60000));
          }
          break;
        }
        lastPushResult = pushResult;

        const rejectedSet = new Set<string>();
        if (Array.isArray(pushResult.rejected)) {
          for (const r of pushResult.rejected) {
            if (r) rejectedSet.add(`${r.entity}:${r.entityId}`);
          }
        }
        const acceptedItems = items.filter(i => !rejectedSet.has(`${i.entity}:${i.entity_id}`));
        const rejectedItems = items.filter(i => rejectedSet.has(`${i.entity}:${i.entity_id}`));

        // Auto-resolve conflicts
        const autoResolvedIds: number[] = [];
        for (const item of rejectedItems) {
          const rejection = pushResult.rejected?.find((r: any) => r?.entity === item.entity && r?.entityId === item.entity_id);
          if (rejection?.serverData) {
            try {
              const config = ENTITY_CONFIG[item.entity];
              let resolved = false;
              if (config) {
                const row = this.serverPayloadToRow(item.entity, rejection.serverData);
                if (row) {
                  const cols = Object.keys(row);
                  const vals = Object.values(row) as (string | number | null)[];
                  if (cols.length) {
                    const db = await openDatabase();
                    const setClause = cols.map(c => `${c}=?`).join(',');
                    const r2 = await db.runAsync(`UPDATE ${config.table} SET ${setClause},deleted=0,synced=1 WHERE ${config.pk}=?`, [...vals, item.entity_id]);
                    if (r2.changes === 0) {
                      await db.runAsync(`INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${cols.map(() => '?').join(',')},1)`, vals);
                    }
                    resolved = true;
                  }
                }
              }
              if (resolved) {
                autoResolvedIds.push(item.id);
              } else {
                await markQueueItemConflict(item.id, 'Invalid serverData');
                try {
                  const { useSyncStore } = await import('../../store/syncStore');
                  useSyncStore.getState().addConflict({
                    id: item.id.toString(),
                    entity: item.entity,
                    entityId: item.entity_id,
                    localData: item.payload,
                    remoteData: rejection.serverData,
                    timestamp: Date.now(),
                  });
                } catch {} // intentional: conflict UI is optional
              }
            } catch (resolveErr) {
              log.error(resolveErr, { entity: item.entity, id: item.entity_id, phase: 'auto-resolve' });
              await markQueueItemConflict(item.id, 'Auto-resolve failed');
            }
          } else {
            await markQueueItemConflict(item.id, 'Server rejected');
          }
        }
        if (autoResolvedIds.length) await removeQueueItems(autoResolvedIds);

        // Mark synced
        try {
          const upserted: Record<string, string[]> = {};
          const deletedMap: Record<string, string[]> = {};
          for (const item of acceptedItems) {
            (item.operation === 'delete' ? deletedMap : upserted)[item.entity] ??= [];
            (item.operation === 'delete' ? deletedMap : upserted)[item.entity].push(item.entity_id);
          }
          await this.markSyncedAndRemove(upserted, deletedMap, acceptedItems.map(i => i.id));
        } catch (markErr) {
          log.error(markErr, { phase: 'markSyncedAndRemove' });
        }

        // Post-push pull for small batches
        if (lastPushResult?.serverTime && pushedItemCount <= PUSH_PULL_SEPARATE_THRESHOLD) {
          try {
            const affectedEntities = [...new Set(items.map(i => i.entity))];
            const pullResult = await apiSyncPullPost(freshToken(), { entities: affectedEntities, since: this._lastSyncAt > 0 ? this._lastSyncAt : undefined });
            if (pullResult?.data) {
              const patch = await this.applyServerChanges(pullResult.data, this._deletedIdsProvider?.(), signal);
              if (patch && Object.keys(patch).length) this._onChanges?.(patch);
              pushApplySucceeded = true;
            }
          } catch (pushPullErr) {
            log.warn(pushPullErr, { phase: 'post-push pull' });
          }
        }

        if (this._syncGeneration === myGeneration) {
          this._lastSyncAt = pushResult.serverTime;
          await this.saveLastSyncAt(this._lastSyncAt);
          this.updateClockOffset(pushResult.serverTime);
        }
      }

      // ── Pull phase (skip if push applied all without rejections) ──
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // If push applied everything cleanly + no rejections, skip full pull
      const pushAllClean = pushedAnything && lastPushResult?.rejected?.length === 0;
      if (!pushAllClean && !pushApplySucceeded) {
        let pullEntities: string[] | undefined;
        // If there were rejections, check only conflicted entities
        const rejected = lastPushResult?.rejected;
        if (rejected && rejected.length > 0) {
          const conflicted = new Set<string>();
          for (const r of rejected) {
            if (r?.entity) conflicted.add(r.entity);
          }
          if (conflicted.size > 0) pullEntities = [...conflicted];
        }

        let hasChanges = true;
        try {
          const cr = pullEntities
            ? { hasChanges: true, changed: Object.fromEntries(pullEntities.map(e => [e, 1])) }
            : await apiSyncCheck(freshToken(), this._lastSyncAt, userId);
          hasChanges = cr.hasChanges;
        } catch (checkErr) {
          if (this.isKickedOutError(checkErr)) { this.handleKickedOut(); return; }
          hasChanges = true;
        }

        if (hasChanges) {
          let pullResult: SyncPullResult | null = null;
          try {
            if (pullEntities) {
              pullResult = await apiSyncPullPost(freshToken(), { entities: pullEntities, since: this._lastSyncAt > 0 ? this._lastSyncAt : undefined });
            } else {
              pullResult = await apiSyncPull(freshToken(), userId, this._lastSyncAt > 0 ? this._lastSyncAt : undefined);
            }
          } catch (pullErr) {
            if (this.isKickedOutError(pullErr)) { this.handleKickedOut(); return; }
            log.error(pullErr, { phase: 'pull' });
          }

          if (pullResult?.data) {
            let patch: Record<string, unknown> = {};
            try {
              patch = await this.applyServerChanges(pullResult.data, this._deletedIdsProvider?.(), signal);
            } catch (applyErr) {
              log.error(applyErr, { phase: 'applyServerChanges' });
            }
            if (patch && Object.keys(patch).length) this._onChanges?.(patch);

            // Per-entity timestamps
            try {
              const st = pullResult.serverTime;
              const iso = st > 0 ? new Date(st).toISOString() : new Date().toISOString();
              for (const entity of Object.keys(pullResult.data)) {
                if (Array.isArray(pullResult.data[entity]) && pullResult.data[entity].length > 0) {
                  await setLastSyncTimestamp(entity, iso);
                }
              }
            } catch (tsErr) {
              log.warn(tsErr, { phase: 'updateSyncTimestamps' });
            }
          }

          if (this._syncGeneration === myGeneration) {
            const st = pushResult?.serverTime ?? pullResult?.serverTime ?? this._lastSyncAt;
            this._lastSyncAt = st;
            await this.saveLastSyncAt(this._lastSyncAt);
            if (st) this.updateClockOffset(st);
          }
        }
      }

      // Cleanup
      await this.internalCleanup();
      this.recordMetric(Date.now() - this._syncingSince, pushedItemCount, 0, true);
    } catch (err: any) {
      if (err?.name === 'AbortError') log.warn('Aborted');
      else log.error(err);
      this.recordMetric(Date.now() - this._syncingSince, 0, 0, false, err?.message);
    } finally {
      if (this._syncGeneration === myGeneration) {
        this._syncing = false;
        this._abortController = null;
      }
    }
  }

  private recordMetric(durationMs: number, pushed: number, pulled: number, success: boolean, error?: string): void {
    this._syncMetrics.push({ timestamp: Date.now(), durationMs, pushed, pulled, success, error });
    if (this._syncMetrics.length > SyncEngine.MAX_METRICS) this._syncMetrics.shift();
  }

  getSyncMetrics(): SyncMetric[] { return [...this._syncMetrics]; }

  getSyncStatus(): { lastSyncAt: number; pendingCount: number; isSyncing: boolean } {
    return { lastSyncAt: this._lastSyncAt, pendingCount: 0, isSyncing: this._syncing };
  }

  isSyncing(): boolean { return this._syncing; }

  private async purgeDeletedRecords(): Promise<void> {
    try {
      const db = await openDatabase();
      const tables = ['habits','mind_reflections','fasting_sessions','food_entries','checkin_records','exercise_entries','meditation_history','user_profiles','plans','plan_items','plan_item_checkins','grace_history','daily_custom_todos','daily_todo_history','thought_trails','trail_notes','reflection_links','ai_configs','checkin_reviews'];
      for (const table of tables) {
        await db.runAsync(`DELETE FROM ${table} WHERE deleted = 1 AND synced = 1`);
      }
    } catch (e) {
      log.error(e, { phase: 'purgeDeletedRecords' });
    }
  }

  private async cleanupCorruptedRecords(): Promise<void> {
    try {
      const db = await openDatabase();
      const done = await getState(db, 'corruptionCleanupDone');
      if (done === 'true') return;
      const r1 = await db.runAsync("DELETE FROM habits WHERE name IS NULL OR name = '' OR name = 'undefined'");
      if (r1.changes > 0) log.info(`Cleaned ${r1.changes} corrupted habits`);
      const r2 = await db.runAsync("DELETE FROM mind_reflections WHERE content IS NULL OR content = ''");
      if (r2.changes > 0) log.info(`Cleaned ${r2.changes} corrupted reflections`);
      const r3 = await db.runAsync("DELETE FROM plans WHERE name IS NULL OR name = ''");
      if (r3.changes > 0) log.info(`Cleaned ${r3.changes} corrupted plans`);
      const r4 = await db.runAsync("DELETE FROM exercise_entries WHERE sport_key IS NULL OR sport_key = '' OR sport_key = 'unknown'");
      if (r4.changes > 0) log.info(`Cleaned ${r4.changes} corrupted exercises`);
      await setState(db, 'corruptionCleanupDone', 'true');
    } catch (e) {
      log.error(e, { phase: 'cleanupCorruptedRecords' });
    }
  }

  private async internalCleanup(): Promise<void> {
    await this.cleanupCorruptedRecords();
    if (this._hasSyncedDeletes) {
      await this.purgeDeletedRecords();
      this._hasSyncedDeletes = false;
    }
  }

  // ── Full sync (public API) ───────────────────────────────────────
  async sync(): Promise<void> { return this.runSync(); }
  async push(): Promise<void> { /* push-only not yet needed */ return this.runSync(); }
  async pull(): Promise<void> { /* pull-only not yet needed */ return this.runSync(); }
  async forceFullSync(): Promise<void> {
    this._lastSyncAt = 0;
    this._lastSyncAtLoaded = false;
    await this.saveLastSyncAt(0);
    return this.runSync();
  }

  // ── Rehydrate ───────────────────────────────────────────────────
  async rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> {
    const db = await openDatabase();
    const patch: Record<string, unknown> = {};
    const REHYDRATE_MAP: Record<string, { table: string; query: string; mapper: (r: Record<string, unknown>) => unknown; storeKey: string }> = {
      habit: { table: 'habits', query: 'SELECT * FROM habits WHERE deleted = 0', mapper: rowToHabit, storeKey: 'habits' },
      food: { table: 'food_entries', query: '', mapper: rowToFood, storeKey: 'foodLog' },
      reflection: { table: 'mind_reflections', query: 'SELECT * FROM mind_reflections WHERE deleted = 0', mapper: rowToReflection, storeKey: 'reflections' },
      fasting: { table: 'fasting_sessions', query: 'SELECT * FROM fasting_sessions WHERE deleted = 0', mapper: rowToFasting, storeKey: 'fastingHistory' },
      checkin: { table: 'checkin_records', query: 'SELECT * FROM checkin_records WHERE deleted = 0', mapper: rowToCheckin, storeKey: 'checkinHistory' },
      exercise: { table: 'exercise_entries', query: 'SELECT * FROM exercise_entries WHERE deleted = 0', mapper: rowToExercise, storeKey: 'exerciseLog' },
      meditation: { table: 'meditation_history', query: 'SELECT * FROM meditation_history WHERE deleted = 0', mapper: rowToMeditation, storeKey: 'medHistory' },
      profile: { table: 'user_profiles', query: 'SELECT * FROM user_profiles WHERE deleted = 0', mapper: rowToProfile, storeKey: 'userProfile' },
      plan: { table: 'plans', query: 'SELECT * FROM plans WHERE deleted = 0', mapper: rowToPlan, storeKey: 'plans' },
      planItem: { table: 'plan_items', query: 'SELECT * FROM plan_items WHERE deleted = 0', mapper: rowToPlanItem, storeKey: 'planItems' },
      planItemCheckin: { table: 'plan_item_checkins', query: 'SELECT * FROM plan_item_checkins WHERE deleted = 0', mapper: rowToPlanItemCheckin, storeKey: 'planItemCheckins' },
      grace: { table: 'grace_history', query: 'SELECT * FROM grace_history WHERE deleted = 0', mapper: rowToGrace, storeKey: 'graceHistory' },
      dailyCustomTodo: { table: 'daily_custom_todos', query: 'SELECT * FROM daily_custom_todos WHERE deleted = 0', mapper: rowToDailyCustomTodo, storeKey: 'dailyCustomTodos' },
      dailyTodoHistory: { table: 'daily_todo_history', query: 'SELECT * FROM daily_todo_history WHERE deleted = 0', mapper: rowToDailyTodoHistory, storeKey: 'dailyTodoHistory' },
      thoughtTrail: { table: 'thought_trails', query: 'SELECT * FROM thought_trails WHERE deleted = 0', mapper: rowToThoughtTrail, storeKey: 'thoughtTrails' },
      trailNote: { table: 'trail_notes', query: 'SELECT * FROM trail_notes WHERE deleted = 0', mapper: rowToTrailNote, storeKey: 'trailNotes' },
      reflectionLink: { table: 'reflection_links', query: 'SELECT * FROM reflection_links WHERE deleted = 0', mapper: rowToReflectionLink, storeKey: 'reflectionLinks' },
      aiConfig: { table: 'ai_configs', query: "SELECT * FROM ai_configs WHERE config_id='self' AND deleted=0", mapper: rowToAIConfig, storeKey: '_aiConfig' },
      checkinReview: { table: 'checkin_reviews', query: 'SELECT * FROM checkin_reviews WHERE deleted = 0', mapper: rowToCheckinReview, storeKey: 'checkinReviews' },
    };

    const targets = entities ?? Object.keys(REHYDRATE_MAP);
    for (const entity of targets) {
      try {
        if (entity === 'food') {
          const rows = await dbGetAllFoodEntries(db) as unknown as Record<string, unknown>[];
          if (rows.length) patch.foodLog = rows.sort((a: any, b: any) => b.timestamp - a.timestamp);
          continue;
        }
        const config = REHYDRATE_MAP[entity];
        if (!config) continue;
        const rows = await db.getAllAsync<Record<string, unknown>>(config.query);
        if (rows.length) {
          const mapped = rows.map(config.mapper);
          if (config.storeKey === '_aiConfig') {
            const ai = mapped[0] as { mode: string; models: unknown[] };
            if (ai) { patch.aiMode = ai.mode; patch.aiModels = ai.models; }
          } else if (config.storeKey === 'userProfile') {
            patch.userProfile = mapped[0];
          } else {
            patch[config.storeKey] = mapped;
          }
        }
      } catch (e) {
        log.error(e, { phase: 'rehydrateFromDb', entity });
      }
    }

    if (patch.plans) {
      try {
        const { computePlanProgress } = await import('@egoless-do/core');
        (patch.plans as any[]).forEach((p: any) => {
          if (!p.deleted) p.progress = computePlanProgress(p);
        });
      } catch {} // intentional: computePlanProgress is optional enhancement
    }
    return patch;
  }

  /** Lazy-load a single entity from SQLite into the store. Useful for cold-start optimization. */
  async lazyRehydrate(entity: string): Promise<void> {
    if (!this._onChanges) return;
    const patch = await this.rehydrateFromDb([entity]);
    if (Object.keys(patch).length) this._onChanges(patch);
  }

  // ── Initial sync ─────────────────────────────────────────────────
  async initialSync(token: string, userId?: string): Promise<'done' | 'partial'> {
    const db = await openDatabase();
    const doneState = await getState(db, 'initialSyncDone');
    if (doneState === 'true') return 'done';

    this._initialSyncing = true;
    try {
      const PHASE_1: SyncEntity[] = ['profile', 'checkin', 'habit', 'grace'];
      const PHASE_2: SyncEntity[] = ['reflection', 'fasting', 'food', 'exercise', 'meditation'];
      const PHASE_3: SyncEntity[] = ['plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview'];

      await this.pullEntitiesParallel(PHASE_1, 1, 1, token, userId);
      await setState(db, 'initialSyncPhase', '2');
      await AsyncStorage.setItem(DEVICE_SYNCED_KEY, '1');

      this.pullEntitiesParallel(PHASE_2, 2, 2, token, userId).then(async () => {
        await this.pullEntitiesParallel(PHASE_3, 1, 3, token, userId);
        await setState(db, 'initialSyncDone', 'true');
        await setState(db, 'initialSyncPhase', 'done');
      }).catch(err => log.error(err, { phase: 'background sync' })).finally(() => {
        this._initialSyncing = false;
        if (this._pendingSyncAfterInit) {
          this._pendingSyncAfterInit = false;
          this.runSync();
        }
      });

      return 'done';
    } catch (err: any) {
      if (this.isKickedOutError(err)) throw err;
      log.error(err, { phase: 'initialSync' });
      throw err;
    } finally {
      this._initialSyncing = false;
    }
  }

  async resumeInitialSync(token: string, userId?: string): Promise<void> {
    const db = await openDatabase();
    if ((await getState(db, 'initialSyncDone')) === 'true') return;
    const allEntities: SyncEntity[] = ['profile', 'checkin', 'habit', 'grace', 'reflection', 'fasting', 'food', 'exercise', 'meditation', 'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview'];

    for (const entity of allEntities) {
      const p = await getSyncProgress(entity);
      if (p?.status === 'done') continue;
      const phase = p?.phase ?? (['profile','checkin','habit','grace'].includes(entity) ? 1 : ['reflection','fasting','food','exercise','meditation'].includes(entity) ? 2 : 3);
      await this.pullEntityWithRetry(entity, phase, token, userId);
    }
    await setState(db, 'initialSyncDone', 'true');
    await setState(db, 'initialSyncPhase', 'done');
    await AsyncStorage.setItem(DEVICE_SYNCED_KEY, '1');
  }

  private async pullEntityWithRetry(entity: SyncEntity, phase: number, token: string, userId?: string): Promise<void> {
    const progress = await getSyncProgress(entity);
    let page = progress?.last_page || 1;
    await updateSyncProgress(entity, { phase, status: 'downloading' });

    while (true) {
      try {
        const result = await apiSyncPullEntity(token, entity, page, 200, userId);
        if (result.data.length > 0) {
          await this.applyServerChanges({ [entity]: result.data });
        }
        const pulled = (progress?.pulled_count ?? 0) + result.data.length;
        await updateSyncProgress(entity, { pulled_count: pulled, total_count: result.total, last_page: page, retry_count: 0, next_retry_at: 0, last_error: null });
        if (!result.hasMore) {
          await updateSyncProgress(entity, { status: 'done' });
          return;
        }
        page++;
      } catch (err: unknown) {
        if (this.isKickedOutError(err)) throw err;
        const currentProgress = await getSyncProgress(entity);
        const attempt = (currentProgress?.retry_count ?? 0) + 1;
        if (phase === 1 || attempt >= 5) {
          await updateSyncProgress(entity, { status: 'failed', last_error: (err as Error).message, retry_count: attempt });
          if (phase === 1) throw err;
          return;
        }
        const delay = Math.min(Math.pow(2, attempt) * 1000, 60000);
        await updateSyncProgress(entity, { retry_count: attempt, next_retry_at: Date.now() + delay });
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async pullEntitiesParallel(entities: SyncEntity[], concurrency: number, phase: number, token: string, userId?: string): Promise<void> {
    const queue = [...entities];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const entity = queue.shift();
          if (!entity) break;
          const existing = await getSyncProgress(entity);
          if (existing?.status === 'done') continue;
          await this.pullEntityWithRetry(entity, phase, token, userId);
        }
      })());
    }
    await Promise.all(workers);
  }
}
