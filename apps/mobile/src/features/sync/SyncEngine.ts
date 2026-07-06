import { openDatabase, getState, setState, withDbLock } from '../../db/schema';
import {
  drainQueue, removeQueueItems, getQueueCount, pruneStaleQueueItems,
  markQueueItemFailed, markQueueItemConflict, markQueueItemRetry, resetAllPendingForRetry,
  getLastSyncTimestamp, setLastSyncTimestamp,
  type SyncQueueItem,
} from '../../db/syncQueue';
import { flushWrites } from '../../store/storageAdapter';
import {
  apiSyncPush, apiSyncPull, apiSyncPullPost, apiSyncCheck,
  createLogger, ApiError, KickedOutError,
  ALL_ENTITY_TABLES,
} from '@egoless-do/core';
import type { SyncEntity, SyncPushResult, SyncPullResult } from '@egoless-do/core';
import { recoverOrphans, shouldRunOrphanRecovery, type EntityConfig, type GetRowMapperFn } from './orphanRecovery';
import { SyncApplyService, ENTITY_CONFIG } from './SyncApplyService';
import { SyncRealtimeController } from './SyncRealtimeController';
import { SyncRehydrationManager } from './SyncRehydrationManager';
import { SyncTimestampManager } from './SyncTimestampManager';
import { SyncResetService } from './SyncResetService';

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

export class SyncEngine {
  private _applyService = new SyncApplyService();
  private _realtimeController = new SyncRealtimeController();
  private _rehydrationManager = new SyncRehydrationManager();
  private _timestampManager = new SyncTimestampManager();
  private _resetService = new SyncResetService();
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
  private _hasSyncedDeletes = false;
  private _initialSyncing = false;
  private _pendingSyncAfterInit = false;
  private _lastOrphanScanAt = 0;

  // ── Configuration ────────────────────────────────────────────────
  setTokenProvider(fn: () => string | null) { this._tokenProvider = fn; }
  setUserIdProvider(fn: () => string | null) { this._userIdProvider = fn; }
  setChangeHandler(fn: (patch: Record<string, unknown>) => void) { this._onChanges = fn; }
  setDeletedIdsProvider(fn: () => Set<string>) { this._deletedIdsProvider = fn; }
  setKickedOutHandler(fn: () => void) { this._onKickedOut = fn; }
  setMigrationDone(v: boolean) { this._migrationDone = v; }
  setLastSyncAt(ts: number) { this._timestampManager.setLastSyncAt(ts); }
  getMigrationDone(): boolean { return this._migrationDone; }
  getClockOffset(): number { return this._timestampManager.getClockOffset(); }

  async isDeviceSyncedBefore(): Promise<boolean> {
    return this._rehydrationManager.isDeviceSyncedBefore();
  }

  // ── Realtime (SSE) ───────────────────────────────────────────────
  connectRealtime(pbUrl?: string): void {
    const token = this._tokenProvider?.();
    if (!token) return;

    this.disconnectRealtime();
    this._realtimeController.connectRealtime(
      pbUrl,
      () => this._tokenProvider?.(),
      (patch) => this._onChanges?.(patch),
      () => this.handleKickedOut(),
      this._timestampManager.getLastSyncAt(),
      () => this._deletedIdsProvider?.() ?? new Set(),
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
  ): Promise<{ pushedAnything: boolean; pushedItemCount: number; pushApplySucceeded: boolean; lastPushResult: SyncPushResult | null }> {
    let pushedAnything = false;
    let pushedItemCount = 0;
    let pushApplySucceeded = false;
    let lastPushResult: SyncPushResult | null = null;

    for (let batch = 0; batch < 10; batch++) {
      const items = await drainQueue(50).catch(e => { log.error(e, { phase: 'drain' }); return [] as SyncQueueItem[]; });
      log.debug(`drainQueue batch ${batch + 1}: ${items.length} items`);
      if (!items.length) break;
      pushedAnything = true;
      pushedItemCount += items.length;

      const changes: Array<{ entity: string; entityId: string; payload: Record<string, unknown>; operation: string; changedFields?: string[] }> = [];
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

      let pushResult: SyncPushResult;
      try {
        pushResult = await apiSyncPush(freshToken(), lastSyncAt, changes, userId);
        log.info(`Push OK: ${changes.length} changes, serverTime=${pushResult.serverTime}, rejected=${pushResult.rejected?.length ?? 0}`);
      } catch (pushErr: unknown) {
        if (this.isKickedOutError(pushErr)) { this.handleKickedOut(); return { pushedAnything, pushedItemCount, pushApplySucceeded, lastPushResult: null }; }
        log.error(pushErr, { phase: 'push' });
        for (const item of items) {
          const na = item.retry_count + 1;
          if (na >= MAX_RETRY_ATTEMPTS) await markQueueItemFailed(item.id, (pushErr instanceof Error ? pushErr.message : null) || 'Push failed');
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
              const row = this._applyService.serverPayloadToRow(item.entity, rejection.serverData);
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
            if (patch && Object.keys(patch).length) this._onChanges?.(patch);
            pushApplySucceeded = true;
          }
        } catch (pushPullErr) {
          log.warn(pushPullErr, { phase: 'post-push pull' });
        }
      }

      // Update timestamps
      if (pushResult.serverTime) {
        this.updateTimestamps(pushResult.serverTime);
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
    lastSyncAt: number,
    signal: AbortSignal,
  ): Promise<void> {
    // If push applied everything cleanly + no rejections, skip full pull
    const pushAllClean = pushedAnything && lastPushResult?.rejected?.length === 0;
    const wasLargePush = pushAllClean && pushedItemCount > PUSH_PULL_SEPARATE_THRESHOLD;
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
          : await apiSyncCheck(freshToken(), lastSyncAt, userId);
        hasChanges = cr.hasChanges;
      } catch (checkErr) {
        if (this.isKickedOutError(checkErr)) { this.handleKickedOut(); return; }
        hasChanges = true;
      }

      if (hasChanges) {
        let pullResult: SyncPullResult | null = null;
        try {
          if (pullEntities) {
            pullResult = await apiSyncPullPost(freshToken(), { entities: pullEntities, since: lastSyncAt > 0 ? lastSyncAt : undefined });
          } else {
            pullResult = await apiSyncPull(freshToken(), userId, lastSyncAt > 0 ? lastSyncAt : undefined);
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
      }
    }

    // Large-push safeguard: even when push was clean, check if server has new changes
    if (wasLargePush) {
      try {
        const cr = await apiSyncCheck(freshToken(), lastSyncAt, userId);
        if (cr.hasChanges) {
          const pullResult = await apiSyncPull(freshToken(), userId, lastSyncAt > 0 ? lastSyncAt : undefined);
          if (pullResult?.data) {
            const patch = await this._applyService.applyServerChanges(pullResult.data, this._deletedIdsProvider?.() ?? new Set(), signal);
            if (patch && Object.keys(patch).length) this._onChanges?.(patch);
          }
        }
      } catch (checkErr) {
        if (this.isKickedOutError(checkErr)) { this.handleKickedOut(); return; }
        log.warn(checkErr, { phase: 'large-push check' });
      }
    }
  }

  // ── Timestamp update helper ─────────────────────────────────────
  private _currentSyncGeneration = 0;

  private updateTimestamps(serverTime: number): void {
    if (this._syncGeneration === this._currentSyncGeneration && serverTime > 0) {
      this._timestampManager.setLastSyncAt(Math.max(this._timestampManager.getLastSyncAt(), serverTime));
      this._timestampManager.saveLastSyncAt(this._timestampManager.getLastSyncAt());
      this._timestampManager.updateClockOffset(serverTime);
    }
  }

  // ── Main sync ────────────────────────────────────────────────────
  async runSync(): Promise<void> {
    // ── Concurrency guard ──────────────────────────────────────────────
    if (this._syncing) {
      if (Date.now() - this._syncingSince > SYNC_TIMEOUT_MS) {
        log.warn('Previous sync timed out, aborting');
        this._abortController?.abort();
        this._abortController = null;
        this._syncing = false;
        this._syncGeneration++;
      } else return;
    }
    if (this._initialSyncing) {
      log.info('Initial sync in progress, deferring runSync');
      this._pendingSyncAfterInit = true;
      return;
    }

    // ── Token check ────────────────────────────────────────────────────
    this._syncing = true;
    this._syncingSince = Date.now();

    let token = this._tokenProvider?.();
    if (!token) {
      log.warn('runSync: no token, attempting recovery...');
      try {
        const { useAppStore } = await import('../../store/useAppStore');
        const auth = useAppStore.getState().auth;
        if (auth.refreshToken) {
          log.debug('Attempting token refresh...');
          await useAppStore.getState().refreshAuth();
          token = useAppStore.getState().auth.token ?? undefined;
          if (token) log.info('Token refreshed, proceeding with sync');
        }
        if (!token) {
          log.warn('No recovery possible, logging out');
          useAppStore.getState().logout();
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
    await flushWrites();
    await this._timestampManager.loadLastSyncAt();
    await this._timestampManager.loadClockOffset();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const myGeneration = ++this._syncGeneration;
    this._currentSyncGeneration = myGeneration;
    const currentLastSyncAt = this._timestampManager.getLastSyncAt();

    // Reset failed/conflict items back to pending so they get another chance
    await resetAllPendingForRetry().catch(e => log.error(e, { phase: 'resetFailed' }));
    pruneStaleQueueItems().catch(e => log.error(e, { phase: 'prune' }));

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
      const ctx = await this.executePush(token, userId, freshToken, currentLastSyncAt, signal);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // Pull phase
      await this.executePull(
        ctx.pushedAnything, ctx.pushedItemCount, ctx.lastPushResult, ctx.pushApplySucceeded,
        token, userId, freshToken, this._timestampManager.getLastSyncAt(), signal,
      );

      // Cleanup
      await this.internalCleanup();
      this.recordMetric(Date.now() - this._syncingSince, ctx.pushedItemCount, 0, true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') log.warn('Aborted');
      else log.error(err);
      this.recordMetric(Date.now() - this._syncingSince, 0, 0, false, errMsg);
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
    const pendingCount = await getQueueCount().catch(() => 0);
    return { lastSyncAt: this._timestampManager.getLastSyncAt(), pendingCount, isSyncing: this._syncing };
  }

  isSyncing(): boolean { return this._syncing; }

  private async purgeDeletedRecords(): Promise<void> {
    try {
      const db = await openDatabase();
      for (const table of ALL_ENTITY_TABLES) {
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
      if (done !== 'true') {
        const r1 = await db.runAsync("DELETE FROM habits WHERE name IS NULL OR name = '' OR name = 'undefined'");
        if (r1.changes > 0) log.info(`Cleaned ${r1.changes} corrupted habits`);
        const r2 = await db.runAsync("DELETE FROM mind_reflections WHERE content IS NULL OR content = ''");
        if (r2.changes > 0) log.info(`Cleaned ${r2.changes} corrupted reflections`);
        const r3 = await db.runAsync("DELETE FROM plans WHERE name IS NULL OR name = ''");
        if (r3.changes > 0) log.info(`Cleaned ${r3.changes} corrupted plans`);
        const r4 = await db.runAsync("DELETE FROM exercise_entries WHERE sport_key IS NULL OR sport_key = '' OR sport_key = 'unknown'");
        if (r4.changes > 0) log.info(`Cleaned ${r4.changes} corrupted exercises`);
        await setState(db, 'corruptionCleanupDone', 'true');
      }
      // Always clean empty-name mantra_defs (may be created by sync bugs)
      const r5 = await db.runAsync("DELETE FROM mantra_defs WHERE (name IS NULL OR name = '') AND deleted = 0");
      if (r5.changes > 0) log.info(`Cleaned ${r5.changes} corrupted mantra_defs`);
      // Clean empty-name thought trails
      const r6 = await db.runAsync("DELETE FROM thought_trails WHERE (name IS NULL OR name = '') AND deleted = 0");
      if (r6.changes > 0) log.info(`Cleaned ${r6.changes} corrupted thought_trails`);
      // Clean empty-content trail notes
      const r7 = await db.runAsync("DELETE FROM trail_notes WHERE (content IS NULL OR content = '') AND deleted = 0");
      if (r7.changes > 0) log.info(`Cleaned ${r7.changes} corrupted trail_notes`);
      // Clean empty-text visions
      const r8 = await db.runAsync("DELETE FROM visions WHERE (text IS NULL OR text = '') AND deleted = 0");
      if (r8.changes > 0) log.info(`Cleaned ${r8.changes} corrupted visions`);
      // Clean empty-name daily custom todos
      const r9 = await db.runAsync("DELETE FROM daily_custom_todos WHERE (name IS NULL OR name = '') AND deleted = 0");
      if (r9.changes > 0) log.info(`Cleaned ${r9.changes} corrupted daily_custom_todos`);
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
    return this.runSync();
  }

  // ── Rehydrate (delegated to SyncRehydrationManager) ─────────────────
  async rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> {
    return this._rehydrationManager.rehydrateFromDb(entities);
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
