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
import { SyncPushService } from './SyncPushService';
import { SyncPullService } from './SyncPullService';

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
  private _pushService = new SyncPushService();
  private _pullService = new SyncPullService();
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
    const lastSyncAt = this._timestampManager.getLastSyncAt();

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
    const pushResult_ServerTime = 0;
    const updateTimestamps = (serverTime: number) => {
      if (this._syncGeneration === myGeneration && serverTime > 0) {
        this._timestampManager.setLastSyncAt(Math.max(this._timestampManager.getLastSyncAt(), serverTime));
        this._timestampManager.saveLastSyncAt(this._timestampManager.getLastSyncAt());
        this._timestampManager.updateClockOffset(serverTime);
      }
    };

    try {
      // Push phase
      const ctx = await this._pushService.executePush(
        token, userId, freshToken, lastSyncAt, signal,
        this._applyService, this._onChanges,
        (err) => this.isKickedOutError(err), () => this.handleKickedOut(),
        updateTimestamps,
        () => this._deletedIdsProvider?.() ?? new Set(),
      );
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // Pull phase
      await this._pullService.executePull(
        ctx.pushedAnything, ctx.pushedItemCount, ctx.lastPushResult, ctx.pushApplySucceeded,
        token, userId, freshToken, this._timestampManager.getLastSyncAt(), signal,
        this._applyService, this._onChanges,
        (err) => this.isKickedOutError(err), () => this.handleKickedOut(),
        () => this._deletedIdsProvider?.() ?? new Set(),
        PUSH_PULL_SEPARATE_THRESHOLD,
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
