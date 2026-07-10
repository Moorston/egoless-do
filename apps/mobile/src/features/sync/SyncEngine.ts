import {
  apiSyncPush, apiSyncPull, apiSyncPullPost, apiSyncCheck,
  createLogger, ApiError, KickedOutError,
  ALL_ENTITY_TABLES,
} from '@egoless-do/core';
import type { SyncEntity, SyncPushResult, SyncPullResult } from '@egoless-do/core';

import { openDatabase, getState, setState, withDbLock } from '../../db/schema';
import { isValidSqlName } from '../../db/sqlHelper';
import {
  drainQueue, removeQueueItems, getQueueCount, pruneStaleQueueItems,
  markQueueItemFailed, markQueueItemConflict, markQueueItemRetry, resetAllPendingForRetry,
  getLastSyncTimestamp, setLastSyncTimestamp,
  type SyncQueueItem,
} from '../../db/syncQueue';
import { flushWrites } from '../../store/storageAdapter';

import { SyncApplyService, ENTITY_CONFIG } from './SyncApplyService';
import { SyncRealtimeController } from './SyncRealtimeController';
import { SyncRehydrationManager } from './SyncRehydrationManager';
import { SyncResetService } from './SyncResetService';
import { SyncTimestampManager } from './SyncTimestampManager';
import { recoverOrphans, shouldRunOrphanRecovery, type EntityConfig, type GetRowMapperFn } from './orphanRecovery';

const DOMException = (globalThis as Record<string, unknown>).DOMException as typeof Error | undefined
  ?? class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? 'DOMException';
    }
  };

const log = createLogger('SyncEngine');
const PUSH_PULL_SEPARATE_THRESHOLD = 20;
const SYNC_TIMEOUT_MS = 120_000;
const MAX_RETRY_ATTEMPTS = 5;

// ALL_ENTITY_TABLES is now imported from @egoless-do/core (derived from SCHEMAS)

export interface SyncMetric {
  timestamp: number;
  durationMs: number;
  pushed: number;
  pulled: number;
  success: boolean;
  error?: string;
}

export interface SyncEngineDeps {
  applyService?: SyncApplyService;
  realtimeController?: SyncRealtimeController;
  rehydrationManager?: SyncRehydrationManager;
  resetService?: SyncResetService;
  timestampManager?: SyncTimestampManager;
  // Injectable db and queue dependencies (for testability)
  db?: {
    openDatabase: typeof openDatabase;
    getState: typeof getState;
    setState: typeof setState;
    withDbLock: typeof withDbLock;
  };
  syncQueue?: {
    drainQueue: typeof drainQueue;
    removeQueueItems: typeof removeQueueItems;
    getQueueCount: typeof getQueueCount;
    pruneStaleQueueItems: typeof pruneStaleQueueItems;
    markQueueItemFailed: typeof markQueueItemFailed;
    markQueueItemConflict: typeof markQueueItemConflict;
    markQueueItemRetry: typeof markQueueItemRetry;
    resetAllPendingForRetry: typeof resetAllPendingForRetry;
    setLastSyncTimestamp: typeof setLastSyncTimestamp;
  };
  storageAdapter?: {
    flushWrites: typeof flushWrites;
  };
}

export class SyncEngine {
  private _applyService: SyncApplyService;
  private _realtimeController: SyncRealtimeController;
  private _rehydrationManager: SyncRehydrationManager;
  private _timestampManager: SyncTimestampManager;
  private _resetService: SyncResetService;
  private _db: NonNullable<SyncEngineDeps['db']> | null = null;
  private _syncQueue: NonNullable<SyncEngineDeps['syncQueue']> | null = null;
  private _storageAdapter: NonNullable<SyncEngineDeps['storageAdapter']> | null = null;

  constructor(deps?: SyncEngineDeps) {
    this._applyService = deps?.applyService ?? new SyncApplyService();
    this._realtimeController = deps?.realtimeController ?? new SyncRealtimeController();
    this._rehydrationManager = deps?.rehydrationManager ?? new SyncRehydrationManager();
    this._timestampManager = deps?.timestampManager ?? new SyncTimestampManager();
    this._resetService = deps?.resetService ?? new SyncResetService();
    this._db = deps?.db ?? null;
    this._syncQueue = deps?.syncQueue ?? null;
    this._storageAdapter = deps?.storageAdapter ?? null;
  }

  // ── Injected-dependency helpers (fall back to direct imports) ──────────
  private _openDatabase(): ReturnType<typeof openDatabase> {
    return this._db ? this._db.openDatabase() : openDatabase();
  }
  private _withDbLock<T>(fn: () => Promise<T>): Promise<T> {
    return this._db ? this._db.withDbLock(fn) : withDbLock(fn);
  }
  private _flushWrites(): ReturnType<typeof flushWrites> {
    return this._storageAdapter ? this._storageAdapter.flushWrites() : flushWrites();
  }
  private _drainQueue(limit: number): ReturnType<typeof drainQueue> {
    return this._syncQueue ? this._syncQueue.drainQueue(limit) : drainQueue(limit);
  }
  private _removeQueueItems(ids: number[]): ReturnType<typeof removeQueueItems> {
    return this._syncQueue ? this._syncQueue.removeQueueItems(ids) : removeQueueItems(ids);
  }
  private _getQueueCount(): ReturnType<typeof getQueueCount> {
    return this._syncQueue ? this._syncQueue.getQueueCount() : getQueueCount();
  }
  private _pruneStaleQueueItems(): ReturnType<typeof pruneStaleQueueItems> {
    return this._syncQueue ? this._syncQueue.pruneStaleQueueItems() : pruneStaleQueueItems();
  }
  private _markQueueItemFailed(id: number, reason: string): ReturnType<typeof markQueueItemFailed> {
    return this._syncQueue ? this._syncQueue.markQueueItemFailed(id, reason) : markQueueItemFailed(id, reason);
  }
  private _markQueueItemConflict(id: number, reason: string): ReturnType<typeof markQueueItemConflict> {
    return this._syncQueue ? this._syncQueue.markQueueItemConflict(id, reason) : markQueueItemConflict(id, reason);
  }
  private _markQueueItemRetry(id: number, attempt: number, nextRetryAt: number): ReturnType<typeof markQueueItemRetry> {
    return this._syncQueue ? this._syncQueue.markQueueItemRetry(id, attempt, nextRetryAt) : markQueueItemRetry(id, attempt, nextRetryAt);
  }
  private _resetAllPendingForRetry(): ReturnType<typeof resetAllPendingForRetry> {
    return this._syncQueue ? this._syncQueue.resetAllPendingForRetry() : resetAllPendingForRetry();
  }
  private _setLastSyncTimestamp(entity: string, iso: string): ReturnType<typeof setLastSyncTimestamp> {
    return this._syncQueue ? this._syncQueue.setLastSyncTimestamp(entity, iso) : setLastSyncTimestamp(entity, iso);
  }

  private _syncing = false;
  private _syncingSince = 0;
  private _syncGeneration = 0;
  private _abortController: AbortController | null = null;
  private _orphanRecoveryDone = false;
  private _migrationDone = false;
  private _syncMetrics: SyncMetric[] = [];
  private static MAX_METRICS = 20;
  private _tokenProvider: (() => string | null) | null = null;
  private _userIdProvider: (() => string | null) | null = null;
  private _onChanges: ((patch: Record<string, unknown>) => void) | null = null;
  private _deletedIdsProvider: (() => Set<string>) | null = null;
  private _onKickedOut: (() => void) | null = null;
  private _tokenRecoveryFn: (() => Promise<string | null>) | null = null;
  private _hasSyncedDeletes = false;
  private _forcePull = false;
  private _lastRoutineCleanupAt = 0;
  private _initialSyncing = false;
  private _lastOrphanScanAt = 0;
  private _syncTriggerCallback: (() => void) | null = null;
  private _syncTriggerTimer: ReturnType<typeof setTimeout> | null = null;
  private static SYNC_TRIGGER_DEBOUNCE_MS = 2000;
  private _onSyncError: ((error: string) => void) | null = null;

  // ── Configuration ────────────────────────────────────────────────
  setTokenProvider(fn: () => string | null) { this._tokenProvider = fn; }
  setUserIdProvider(fn: () => string | null) { this._userIdProvider = fn; }
  setChangeHandler(fn: (patch: Record<string, unknown>) => void) { this._onChanges = fn; }
  setDeletedIdsProvider(fn: () => Set<string>) { this._deletedIdsProvider = fn; }
  setKickedOutHandler(fn: () => void) { this._onKickedOut = fn; }
  setTokenRecoveryFn(fn: () => Promise<string | null>) { this._tokenRecoveryFn = fn; }
  setRealtimeLogoutHandler(fn: () => void) { this._realtimeController.setLogoutHandler(fn); }
  setRealtimeUserIdProvider(fn: () => string | undefined) { this._realtimeController.setUserIdProvider(fn); }
  setRealtimeRunSync(fn: () => void) { this._realtimeController.setRunSync(fn); }
  setRealtimeApplyServerChanges(fn: (data: Record<string, unknown[]>, deletedIds: Set<string>) => Promise<Record<string, unknown>>) { this._realtimeController.setApplyServerChanges(fn); }
  setMigrationDone(v: boolean) { this._migrationDone = v; }
  getMigrationDone(): boolean { return this._migrationDone; }
  setSyncErrorHandler(fn: (error: string) => void) { this._onSyncError = fn; }
  setLastSyncAt(ts: number) { this._timestampManager.setLastSyncAt(ts); }
  getClockOffset(): number { return this._timestampManager.getClockOffset(); }

  // ── Debounced sync trigger ────────────────────────────────────────
  setSyncTriggerCallback(fn: () => void) { this._syncTriggerCallback = fn; }

  triggerSyncDebounced(): void {
    if (!this._syncTriggerCallback) {
      log.warn('triggerSyncDebounced called but _syncTriggerCallback is null');
      return;
    }
    // Guard: skip entirely if not authenticated (prevents false kicked-out on cold start)
    const token = this._tokenProvider?.();
    if (!token) {
      log.debug('triggerSyncDebounced: no token, skipping');
      return;
    }
    if (this._syncTriggerTimer) clearTimeout(this._syncTriggerTimer);
    this._syncTriggerTimer = setTimeout(async () => {
      this._syncTriggerTimer = null;
      log.debug('Debounced sync trigger firing');
      this._syncTriggerCallback?.();
      // Only re-trigger if there's still a token (prevents infinite loop after logout)
      const freshToken = this._tokenProvider?.();
      if (!freshToken) return;
      const remaining = await this._getQueueCount();
      if (remaining > 0) this.triggerSyncDebounced();
    }, SyncEngine.SYNC_TRIGGER_DEBOUNCE_MS);
  }

  clearSyncTrigger(): void {
    if (this._syncTriggerTimer) { clearTimeout(this._syncTriggerTimer); this._syncTriggerTimer = null; }
  }

  async isDeviceSyncedBefore(): Promise<boolean> {
    return this._rehydrationManager.isDeviceSyncedBefore();
  }

  // ── Realtime (SSE) ───────────────────────────────────────────────
  connectRealtime(pbUrl?: string): void {
    const token = this._tokenProvider?.();
    if (!token) return;

    this.disconnectRealtime();
    // Wire callbacks to eliminate dynamic imports in SyncRealtimeController
    this._realtimeController.setRunSync(() => { this.runSync().catch(e => log.error(e, { phase: 'realtime-sync' })); });
    this._realtimeController.setApplyServerChanges(
      (data, deletedIds) => this._applyService.applyServerChanges(data, deletedIds),
    );
    this._realtimeController.connectRealtime(
      pbUrl,
      () => this._tokenProvider?.() ?? null,
      (patch) => this._onChanges?.(patch),
      () => this.handleKickedOut(),
      () => this._timestampManager.getLastSyncAt(),
      () => this._deletedIdsProvider?.() ?? new Set(),
      (serverTime) => {
        if (serverTime > 0) {
          this._timestampManager.setLastSyncAt(Math.max(this._timestampManager.getLastSyncAt(), serverTime));
          this._timestampManager.saveLastSyncAt(this._timestampManager.getLastSyncAt());
          this._timestampManager.updateClockOffset(serverTime);
        }
      },
    );
  }

  disconnectRealtime(): void {
    this._realtimeController.disconnectRealtime();
  }

  isRealtimeConnected(): boolean {
    return this._realtimeController.isRealtimeConnected();
  }

  // ── Clock offset & timestamp (delegated to SyncTimestampManager) ──
  private get lastSyncAt() { return this._timestampManager.getLastSyncAt(); }
  private set lastSyncAt(ts: number) { this._timestampManager.setLastSyncAt(ts); }
  private get clockOffset() { return this._timestampManager.getClockOffset(); }

  // ── Soft/Hard reset (delegated to SyncResetService) ─────────────────
  async softReset(): Promise<void> {
    return this._resetService.softReset(
      () => this.disconnectRealtime(),
      () => this._timestampManager.resetLastSyncAt(),
    );
  }

  async hardReset(confirmToken?: string): Promise<void> {
    return this._resetService.hardReset(
      confirmToken,
      () => this.disconnectRealtime(),
      () => this._timestampManager.resetLastSyncAt(),
    );
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

  // ── Apply server changes (delegated to SyncApplyService) ─────────────
  async applyServerChanges(data: Record<string, unknown[]>, deletedIds?: Set<string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
    return this._applyService.applyServerChanges(data, deletedIds, signal);
  }

  // ── Server payload helpers (delegated to SyncApplyService) ───────────
  private serverPayloadToRow(entity: string, r: Record<string, unknown>): Record<string, unknown> | null {
    return this._applyService.serverPayloadToRow(entity, r);
  }

  // ── Mark synced helpers (delegated to SyncApplyService) ──────────────
  private async markSyncedAndRemove(upserted: Record<string, string[]>, deleted: Record<string, string[]>, queueIds: number[]): Promise<void> {
    return this._applyService.markSyncedAndRemove(upserted, deleted, queueIds, () => { this._hasSyncedDeletes = true; });
  }

  // ── Push phase ──────────────────────────────────────────────────
  private async executePush(
    token: string,
    userId: string | undefined,
    freshToken: () => string,
    lastSyncAt: number,
    signal: AbortSignal,
    generation: number,
  ): Promise<{ pushedAnything: boolean; pushedItemCount: number; pushApplySucceeded: boolean; lastPushResult: SyncPushResult | null }> {
    let pushedAnything = false;
    let pushedItemCount = 0;
    let pushApplySucceeded = false;
    let lastPushResult: SyncPushResult | null = null;

    for (let batch = 0; batch < 10; batch++) {
      // Reset items stuck in 'syncing' status from a previous crashed sync
      // before drainQueue so they get picked up again
      try {
        await this._resetAllPendingForRetry();
      } catch (e) { log.error(e, { phase: 'resetStuck' }); }
      const items = await this._drainQueue(50).catch(e => { log.error(e, { phase: 'drain' }); return [] as SyncQueueItem[]; });
      log.debug(`drainQueue batch ${batch + 1}: ${items.length} items`);
      if (!items.length) break;
      pushedAnything = true;
      pushedItemCount += items.length;

      const changes: Array<{ entity: SyncEntity; entityId: string; payload: Record<string, unknown>; op: 'upsert' | 'delete'; changedFields?: string[] }> = [];
      for (const item of items) {
        try {
          const parsed = JSON.parse(item.payload);
          const changedFields = parsed._changedFields;
          if (changedFields) delete parsed._changedFields;
          changes.push({ entity: item.entity as SyncEntity, entityId: item.entity_id, payload: parsed, op: item.operation === 'delete' ? 'delete' : 'upsert', changedFields });
        } catch {
          await this._markQueueItemFailed(item.id, 'Corrupt payload');
        }
      }
      if (!changes.length) continue;

      let pushResult: SyncPushResult;
      try {
        pushResult = await apiSyncPush(freshToken(), lastSyncAt, changes, userId);
        log.info(`Push OK: ${changes.length} changes, serverTime=${pushResult.serverTime}, rejected=${pushResult.rejected?.length ?? 0}`);
      } catch (pushErr: unknown) {
        if (this.isKickedOutError(pushErr)) { this.handleKickedOut(); return { pushedAnything, pushedItemCount, pushApplySucceeded, lastPushResult: null }; }
        log.error(pushErr, { phase: 'push' });
        for (const item of items) {
          try {
            const na = item.retry_count + 1;
            if (na >= MAX_RETRY_ATTEMPTS) await this._markQueueItemFailed(item.id, (pushErr instanceof Error ? pushErr.message : null) || 'Push failed');
            else await this._markQueueItemRetry(item.id, na, Date.now() + Math.min(Math.pow(2, na) * 1000, 60000));
          } catch (markErr) {
            // Atomicity guard: if marking retry fails, mark as failed instead of losing the item
            log.error(markErr, { phase: 'markRetry-fallback', itemId: item.id });
            try { await this._markQueueItemFailed(item.id, 'Retry mark failed'); } catch (e) { log.error(e, { phase: 'markRetry-fallback' }); } // last resort
          }
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

      // Auto-resolve conflicts (server-wins)
      const autoResolvedIds: number[] = [];
      for (const item of rejectedItems) {
        const rejection = pushResult.rejected?.find(
          (r) => r?.entity === item.entity && r?.entityId === item.entity_id,
        );
        if (rejection?.serverData) {
          try {
            const config = ENTITY_CONFIG[item.entity];
            let resolved = false;
            if (config) {
              if (!isValidSqlName(config.table)) throw new Error(`Invalid table name: ${config.table}`);
              if (!isValidSqlName(config.pk)) throw new Error(`Invalid pk name: ${config.pk}`);
              // Server says record is deleted — mark local as deleted too
              if (rejection.error === 'deleted') {
                await this._withDbLock(async () => {
                  const db = await this._openDatabase();
                  await db.runAsync(
                    `UPDATE ${config.table} SET deleted=1, synced=1 WHERE ${config.pk}=?`,
                    [item.entity_id],
                  );
                });
                log.debug(`[SyncEngine] Marked ${item.entity}:${item.entity_id} as deleted (server rejected)`);
                resolved = true;
              } else {
              const row = this._applyService.serverPayloadToRow(item.entity, rejection.serverData);
              if (row) {
                const cols = Object.keys(row);
                const vals = Object.values(row) as (string | number | null)[];
                for (const col of cols) {
                  if (!isValidSqlName(col)) throw new Error(`Invalid column name: ${col}`);
                }
                if (cols.length) {
                  const db = await this._openDatabase();
                  const skipReason = await this._withDbLock<string | null>(async () => {
                    // Don't resurrect locally-deleted records
                    const local = await db.getFirstAsync<{ deleted: number }>(
                      `SELECT deleted FROM ${config.table} WHERE ${config.pk}=?`, [item.entity_id],
                    );
                    if (local?.deleted === 1) {
                      await this._markQueueItemConflict(item.id, 'Locally deleted');
                      return 'deleted';
                    }
                    const setClause = cols.map(c => `${c}=?`).join(',');
                    const r2 = await db.runAsync(`UPDATE ${config.table} SET ${setClause},deleted=0,synced=1 WHERE ${config.pk}=?`, [...vals, item.entity_id]);
                    if (r2.changes === 0) {
                      await db.runAsync(`INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${cols.map(() => '?').join(',')},1)`, vals);
                    }
                    return null;
                  });
                  if (skipReason === 'deleted') {
                    log.debug(`[SyncEngine] Skipping auto-resolve for deleted ${item.entity}:${item.entity_id}`);
                    continue;
                  }
                  resolved = true;
                }
              }
              } // end else (not 'deleted' error)
            }
            if (resolved) {
              autoResolvedIds.push(item.id);
            } else {
              await this._markQueueItemConflict(item.id, 'Invalid serverData');
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
              } catch (e) { log.warn(e, { phase: 'addConflict' }); } // intentional: conflict UI is optional
            }
          } catch (resolveErr) {
            log.error(resolveErr, { entity: item.entity, id: item.entity_id, phase: 'auto-resolve' });
            await this._markQueueItemConflict(item.id, 'Auto-resolve failed');
          }
        } else {
          await this._markQueueItemConflict(item.id, 'Server rejected');
        }
      }
      if (autoResolvedIds.length) await this._withDbLock(async () => { await this._removeQueueItems(autoResolvedIds); });

      // Mark synced
      try {
        const upserted: Record<string, string[]> = {};
        const deletedMap: Record<string, string[]> = {};
        for (const item of acceptedItems) {
          (item.operation === 'delete' ? deletedMap : upserted)[item.entity] ??= [];
          (item.operation === 'delete' ? deletedMap : upserted)[item.entity].push(item.entity_id);
        }
        await this._applyService.markSyncedAndRemove(upserted, deletedMap, acceptedItems.map(i => i.id), () => { this._hasSyncedDeletes = true; });
      } catch (markErr) {
        log.error(markErr, { phase: 'markSyncedAndRemove' });
      }

      // Post-push pull for small batches
      if (pushResult.serverTime && pushedItemCount <= PUSH_PULL_SEPARATE_THRESHOLD) {
        try {
          const affectedEntities = [...new Set(items.map(i => i.entity))];
          const pullResult = await apiSyncPullPost(freshToken(), { entities: affectedEntities, since: lastSyncAt > 0 ? lastSyncAt : undefined });
          if (pullResult?.data) {
            const patch = await this._applyService.applyServerChanges(pullResult.data, this._deletedIdsProvider?.() ?? new Set(), signal);
            // Guard: skip _onChanges if this sync was superseded (ghost sync prevention)
            if (patch && Object.keys(patch).length && this._syncGeneration === generation) this._onChanges?.(patch);
            pushApplySucceeded = true;
          }
        } catch (pushPullErr) {
          log.warn(pushPullErr, { phase: 'post-push pull' });
        }
      }

      // Update timestamps
      if (pushResult.serverTime) {
        this.updateTimestamps(pushResult.serverTime, generation);
      }
    }

    return { pushedAnything, pushedItemCount, pushApplySucceeded, lastPushResult };
  }

  // ── Pull phase ──────────────────────────────────────────────────
  private async executePull(
    pushedAnything: boolean,
    pushedItemCount: number,
    lastPushResult: SyncPushResult | null,
    pushApplySucceeded: boolean,
    token: string,
    userId: string | undefined,
    freshToken: () => string,
    signal: AbortSignal,
    myGeneration: number,
  ): Promise<void> {
    // If push applied everything cleanly + no rejections, skip full pull (unless forcePull)
    const pushAllClean = pushedAnything && lastPushResult?.rejected?.length === 0;
    const wasLargePush = pushAllClean && pushedItemCount > PUSH_PULL_SEPARATE_THRESHOLD;
    if (this._forcePull || (!pushAllClean && !pushApplySucceeded)) {
      this._forcePull = false;
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
          : await apiSyncCheck(freshToken(), this.lastSyncAt, userId);
        hasChanges = cr.hasChanges;
      } catch (checkErr) {
        if (this.isKickedOutError(checkErr)) { this.handleKickedOut(); return; }
        hasChanges = true;
      }

      if (hasChanges) {
        let pullResult: SyncPullResult | null = null;
        try {
          if (pullEntities) {
            pullResult = await apiSyncPullPost(freshToken(), { entities: pullEntities, since: this.lastSyncAt > 0 ? this.lastSyncAt : undefined });
          } else {
            pullResult = await apiSyncPull(freshToken(), userId, this.lastSyncAt > 0 ? this.lastSyncAt : undefined);
          }
        } catch (pullErr) {
          if (this.isKickedOutError(pullErr)) { this.handleKickedOut(); return; }
          log.error(pullErr, { phase: 'pull' });
        }

        if (pullResult?.data) {
          let patch: Record<string, unknown> = {};
          try {
            patch = await this._applyService.applyServerChanges(pullResult.data, this._deletedIdsProvider?.() ?? new Set(), signal);
          } catch (applyErr) {
            log.error(applyErr, { phase: 'applyServerChanges' });
          }
          // Guard: skip _onChanges if this sync was superseded (ghost sync prevention)
          if (patch && Object.keys(patch).length && this._syncGeneration === myGeneration) this._onChanges?.(patch);

          // Per-entity timestamps
          try {
            const st = pullResult.serverTime;
            const iso = st > 0 ? new Date(st).toISOString() : new Date().toISOString();
            for (const entity of Object.keys(pullResult.data)) {
              if (Array.isArray(pullResult.data[entity]) && pullResult.data[entity].length > 0) {
                await this._setLastSyncTimestamp(entity, iso);
              }
            }
          } catch (tsErr) {
            log.warn(tsErr, { phase: 'updateSyncTimestamps' });
          }
        }
      }
    }

    // Large-push safeguard: even when push was clean, check if server has new changes
    if (wasLargePush) {
      try {
        const cr = await apiSyncCheck(freshToken(), this.lastSyncAt, userId);
        if (cr.hasChanges) {
          const pullResult = await apiSyncPull(freshToken(), userId, this.lastSyncAt > 0 ? this.lastSyncAt : undefined);
          if (pullResult?.data) {
            const patch = await this._applyService.applyServerChanges(pullResult.data, this._deletedIdsProvider?.() ?? new Set(), signal);
            // Guard: skip _onChanges if this sync was superseded (ghost sync prevention)
            if (patch && Object.keys(patch).length && this._syncGeneration === myGeneration) this._onChanges?.(patch);
          }
        }
      } catch (checkErr) {
        if (this.isKickedOutError(checkErr)) { this.handleKickedOut(); return; }
        log.warn(checkErr, { phase: 'large-push check' });
      }
    }
  }

  // ── Timestamp update helper ─────────────────────────────────────
  private updateTimestamps(serverTime: number, generation: number): void {
    if (this._syncGeneration === generation && serverTime > 0) {
      this._timestampManager.setLastSyncAt(Math.max(this._timestampManager.getLastSyncAt(), serverTime));
      this._timestampManager.saveLastSyncAt(this._timestampManager.getLastSyncAt());
      this._timestampManager.updateClockOffset(serverTime);
    }
  }

  // ── Main sync ────────────────────────────────────────────────────
  async runSync(): Promise<void> {
    // ── Concurrency guard (generation-based, avoids TOCTOU) ──
    // Abort previous sync if timed out
    if (this._syncing && Date.now() - this._syncingSince > SYNC_TIMEOUT_MS) {
      log.warn('Previous sync timed out, aborting');
      this._abortController?.abort();
      this._abortController = null;
      this._syncing = false;
    }

    // Another healthy sync is still running — defer
    if (this._syncing) {
      log.info('Sync already in progress, deferring');
      return;
    }

    const myGeneration = ++this._syncGeneration;

    // ── Token check ────────────────────────────────────────────────────
    this._syncing = true;
    this._syncingSince = Date.now();

    let token = this._tokenProvider?.();
    if (!token) {
      log.warn('runSync: no token, attempting recovery...');
      try {
        if (this._tokenRecoveryFn) {
          log.debug('Attempting token refresh via recovery function...');
          token = await this._tokenRecoveryFn() ?? undefined;
          if (token) log.info('Token refreshed, proceeding with sync');
        }
        if (!token) {
          log.warn('No recovery possible');
          this.clearSyncTrigger();
          // Only show "kicked out" if user was actually logged in (had a userId).
          // If userId is also null, the user was never logged in — silently skip.
          const userId = this._userIdProvider?.();
          if (userId) {
            log.warn('User was logged in but token recovery failed — triggering kicked out');
            this._onKickedOut?.();
          }
          this._syncing = false;
          return;
        }
      } catch (e) {
        log.error(e, { msg: 'Token recovery failed' });
        this._syncing = false;
        return;
      }
    }

    log.info('runSync starting, token present');
    const userId = this._userIdProvider?.() ?? undefined;
    const freshToken = () => this._tokenProvider?.() ?? '';

    // ── Pre-sync preparation ───────────────────────────────────────────
    await this._flushWrites();
    await this._timestampManager.loadLastSyncAt();
    await this._timestampManager.loadClockOffset();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    // Reset failed/conflict items back to pending so they get another chance
    await this._resetAllPendingForRetry().catch(e => log.error(e, { phase: 'resetFailed' }));
    await this._pruneStaleQueueItems().catch(e => log.error(e, { phase: 'prune' }));

    // Orphan recovery — skip if last sync was <30s ago (orphan events are rare)
    if (shouldRunOrphanRecovery(this._lastOrphanScanAt)) {
      try {
        const result = await recoverOrphans(
          ENTITY_CONFIG as Record<string, EntityConfig>,
          (entity: string) => this._applyService.getRowMapper(entity),
        );
        if (result.total > 0) {
          log.info(`Orphan recovery: ${result.total} items`, { byEntity: result.byEntity });
        }
        this._orphanRecoveryDone = true;
        this._lastOrphanScanAt = Date.now();
      } catch (e) {
        log.error(e, { phase: 'orphan-recovery' });
      }
    }

    // ── Execute phases ─────────────────────────────────────────────────
    try {
      // Push phase
      const ctx = await this.executePush(token, userId, freshToken, this._timestampManager.getLastSyncAt(), signal, myGeneration);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (this._syncGeneration !== myGeneration) { log.info('Sync superseded after push'); return; }

      // Pull phase
      await this.executePull(
        ctx.pushedAnything, ctx.pushedItemCount, ctx.lastPushResult, ctx.pushApplySucceeded,
        token, userId, freshToken, signal,
        myGeneration,
      );

      // Cleanup
      await this.internalCleanup();
      this.recordMetric(Date.now() - this._syncingSince, ctx.pushedItemCount, 0, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') log.warn('Aborted');
      else log.error(err);
      this.recordMetric(Date.now() - this._syncingSince, 0, 0, false, errMsg);
      this._onSyncError?.(errMsg);
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

  async getSyncStatus(): Promise<{ lastSyncAt: number; pendingCount: number; isSyncing: boolean }> {
    const pendingCount = await this._getQueueCount().catch(() => 0);
    return { lastSyncAt: this._timestampManager.getLastSyncAt(), pendingCount, isSyncing: this._syncing };
  }

  isSyncing(): boolean { return this._syncing; }

  private async purgeDeletedRecords(): Promise<void> {
    try {
      const db = await this._openDatabase();
      await this._withDbLock(async () => {
        for (const table of ALL_ENTITY_TABLES) {
          if (!isValidSqlName(table)) { log.warn(`Skipping invalid table name: ${table}`); continue; }
          await db.runAsync(`DELETE FROM ${table} WHERE deleted = 1 AND synced = 1`);
        }
      });
    } catch (e) {
      log.error(e, { phase: 'purgeDeletedRecords' });
    }
  }

  private async cleanupCorruptedRecords(): Promise<void> {
    try {
      const db = await this._openDatabase();
      const done = await getState(db, 'corruptionCleanupDone');
      if (done !== 'true') {
        // First-time cleanup: wrap in withDbLock for transactional safety
        await this._withDbLock(async () => {
          const r1 = await db.runAsync("DELETE FROM habits WHERE name IS NULL OR name = '' OR name = 'undefined'");
          if (r1.changes > 0) log.info(`Cleaned ${r1.changes} corrupted habits`);
          const r2 = await db.runAsync("DELETE FROM mind_reflections WHERE content IS NULL OR content = ''");
          if (r2.changes > 0) log.info(`Cleaned ${r2.changes} corrupted reflections`);
          const r3 = await db.runAsync("DELETE FROM plans WHERE name IS NULL OR name = ''");
          if (r3.changes > 0) log.info(`Cleaned ${r3.changes} corrupted plans`);
          const r4 = await db.runAsync("DELETE FROM exercise_entries WHERE sport_key IS NULL OR sport_key = '' OR sport_key = 'unknown'");
          if (r4.changes > 0) log.info(`Cleaned ${r4.changes} corrupted exercises`);
          await setState(db, 'corruptionCleanupDone', 'true');
        });
      }
      // Throttled routine cleanup — only run every 5 minutes to avoid per-sync overhead
      const ROUTINE_CLEANUP_INTERVAL = 5 * 60 * 1000;
      const now = Date.now();
      if (now - this._lastRoutineCleanupAt > ROUTINE_CLEANUP_INTERVAL) {
        this._lastRoutineCleanupAt = now;
        // Each DELETE in its own try/catch so one failure doesn't block the rest
        try {
          const r5 = await db.runAsync("DELETE FROM mantra_defs WHERE (name IS NULL OR name = '') AND deleted = 0");
          if (r5.changes > 0) log.info(`Cleaned ${r5.changes} corrupted mantra_defs`);
        } catch (e) { log.warn(e, { phase: 'routineCleanup:mantra_defs' }); }
        try {
          const r6 = await db.runAsync("DELETE FROM thought_trails WHERE (name IS NULL OR name = '') AND deleted = 0");
          if (r6.changes > 0) log.info(`Cleaned ${r6.changes} corrupted thought_trails`);
        } catch (e) { log.warn(e, { phase: 'routineCleanup:thought_trails' }); }
        try {
          const r7 = await db.runAsync("DELETE FROM trail_notes WHERE (content IS NULL OR content = '') AND deleted = 0");
          if (r7.changes > 0) log.info(`Cleaned ${r7.changes} corrupted trail_notes`);
        } catch (e) { log.warn(e, { phase: 'routineCleanup:trail_notes' }); }
        try {
          const r8 = await db.runAsync("DELETE FROM visions WHERE (text IS NULL OR text = '') AND deleted = 0");
          if (r8.changes > 0) log.info(`Cleaned ${r8.changes} corrupted visions`);
        } catch (e) { log.warn(e, { phase: 'routineCleanup:visions' }); }
        try {
          const r9 = await db.runAsync("DELETE FROM daily_custom_todos WHERE (name IS NULL OR name = '') AND deleted = 0");
          if (r9.changes > 0) log.info(`Cleaned ${r9.changes} corrupted daily_custom_todos`);
        } catch (e) { log.warn(e, { phase: 'routineCleanup:daily_custom_todos' }); }
      }
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
    this._timestampManager.resetLastSyncAt();
    await this._timestampManager.saveLastSyncAt(0);
    this._forcePull = true;
    return this.runSync();
  }

  // ── Rehydrate (delegated to SyncRehydrationManager) ─────────────────
  async rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> {
    return this._rehydrationManager.rehydrateFromDb(entities);
  }

  /** Register a locally deleted entity so sync won't resurrect it within the next 60s */
  registerLocalDelete(entity: string, id: string) {
    this._applyService.registerLocalDelete(entity, id);
  }

  /** Lazy-load a single entity from SQLite into the store. Useful for cold-start optimization. */
  async lazyRehydrate(entity: string): Promise<void> {
    return this._rehydrationManager.lazyRehydrate(entity, this._onChanges);
  }

  // ── Initial sync (delegated to SyncRehydrationManager) ────────────
  async initialSync(token: string, userId?: string): Promise<'done' | 'partial'> {
    return this._rehydrationManager.initialSync(
      token, userId,
      this.applyServerChanges.bind(this),
      (err) => this.isKickedOutError(err),
      (v) => { this._initialSyncing = v; },
    );
  }

  async resumeInitialSync(token: string, userId?: string): Promise<void> {
    await this._rehydrationManager.resumeInitialSync(
      token, userId,
      this.applyServerChanges.bind(this),
      (err) => this.isKickedOutError(err),
    );
    // Update _lastSyncAt using server-adjusted time to avoid clock skew issues
    const serverNow = Date.now() + this._timestampManager.getClockOffset();
    this._timestampManager.setLastSyncAt(serverNow);
    await this._timestampManager.saveLastSyncAt(serverNow);
  }
}
