// ─── SyncRealtimeController ────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-2 of AR-01 refactoring)
// Manages realtime connection (SSE) and fallback polling.

import { apiSyncPullPost, apiSyncCheck, createLogger, KickedOutError } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';
import NetInfo from '@react-native-community/netinfo';

import { openDatabase, getState, setState } from '../../db/schema';
import { getQueueCount, resetAllPendingForRetry } from '../../db/syncQueue';

import { RealtimeAgent, type RealtimeChangeEvent } from './RealtimeAgent';

const log = createLogger('SyncRealtime');

export class SyncRealtimeController {
  private _realtimeAgent = new RealtimeAgent();
  private _sseConnected = false;
  private _realtimeFallbackTimer: ReturnType<typeof setInterval> | null = null;
  private _netInfoUnsubscribe: (() => void) | null = null;
  private _realtimeDebounce = new Map<string, ReturnType<typeof setTimeout>>();
  private _realtimeEventTimes = new Map<string, number[]>();
  private _logoutHandler: (() => void) | null = null;
  private _userIdProvider: (() => string | undefined) | null = null;
  private _runSync: (() => void) | null = null;
  private _applyServerChanges: ((data: Record<string, unknown[]>, deletedIds: Set<string>) => Promise<Record<string, unknown>>) | null = null;
  private _onServerTime: ((serverTime: number) => void) | null = null;

  constructor() {}

  setLogoutHandler(fn: () => void) { this._logoutHandler = fn; }
  setUserIdProvider(fn: () => string | undefined) { this._userIdProvider = fn; }
  setRunSync(fn: () => void) { this._runSync = fn; }
  setApplyServerChanges(fn: (data: Record<string, unknown[]>, deletedIds: Set<string>) => Promise<Record<string, unknown>>) { this._applyServerChanges = fn; }
  setOnServerTime(fn: (serverTime: number) => void) { this._onServerTime = fn; }

  // ── Connection Management ──────────────────────────────────────────────

  connectRealtime(
    pbUrl: string | undefined,
    getToken: () => string | null,
    onChange: (patch: Record<string, unknown>) => void,
    onKickedOut: () => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
    onServerTime?: (serverTime: number) => void,
  ): void {
    this._onServerTime = onServerTime ?? null;
    const token = getToken();
    if (!token) return;

    this.disconnectRealtime();
    this.startNetworkRecoveryListener(onChange, getLastSyncAt, deletedIdsProvider, getToken);

    if (pbUrl) {
      this._realtimeAgent.setChangeHandler((event) => this.handleRealtimeEvent(event, onChange, getLastSyncAt, deletedIdsProvider, getToken));
      this._realtimeAgent.setStatusHandler((connected) => {
        this._sseConnected = connected;
        if (!connected && !this._realtimeFallbackTimer) this.startFallbackPolling(getToken, onChange, getLastSyncAt, deletedIdsProvider);
        else if (connected) this.stopFallbackPolling();
      });
      // Wire heartbeat failure detection → logout handler
      // Note: RealtimeAgent no longer uses heartbeat failures for kicked-out detection.
      // This handler is kept for compatibility but will only fire if explicitly triggered
      // by the RealtimeAgent in the future. Kicked-out is handled via API 401 KICKED_OUT.
      this._realtimeAgent.setKickedOutHandler(() => {
        log.warn('Realtime heartbeat failure threshold reached, triggering kicked-out');
        this._logoutHandler?.();
      });
      this._realtimeAgent.connect(pbUrl, token);
    }
    // Only start fallback polling if SSE isn't going to be connected
    if (!pbUrl) this.startFallbackPolling(getToken, onChange, getLastSyncAt, deletedIdsProvider);
  }

  disconnectRealtime(): void {
    this._realtimeAgent.disconnect();
    this._sseConnected = false;
    this.stopFallbackPolling();
    this.stopNetworkRecoveryListener();
    // Clear pending debounce timers and event time tracking
    for (const timer of this._realtimeDebounce.values()) clearTimeout(timer);
    this._realtimeDebounce.clear();
    this._realtimeEventTimes.clear();
  }

  isRealtimeConnected(): boolean {
    return this._sseConnected;
  }

  // ── Fallback Polling ───────────────────────────────────────────────────

  private stopFallbackPolling() {
    if (this._realtimeFallbackTimer) {
      clearInterval(this._realtimeFallbackTimer);
      this._realtimeFallbackTimer = null;
    }
  }

  private startFallbackPolling(
    getToken: () => string | null,
    onChange: (patch: Record<string, unknown>) => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
  ) {
    if (this._realtimeFallbackTimer) return;
    this._realtimeFallbackTimer = setInterval(() => {
      const currentToken = getToken();
      if (currentToken) this.pollForChanges(currentToken, onChange, getLastSyncAt(), deletedIdsProvider);
    }, 120_000);
  }

  private async pollForChanges(
    token: string,
    onChange: (patch: Record<string, unknown>) => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
  ): Promise<void> {
    try {
      const queueCount = await getQueueCount();
      if (queueCount > 0) {
        this._runSync?.();
        return;
      }

      try {
        const userId = this._userIdProvider?.() ?? undefined;

        const checkResult = await apiSyncCheck(token, lastSyncAt, userId);
        if (!checkResult.hasChanges) return;
        const changedEntities = Object.keys(checkResult.changed);
        if (changedEntities.length > 0) {
          const result = await apiSyncPullPost(token, {
            entities: changedEntities,
            since: lastSyncAt > 0 ? lastSyncAt : undefined,
          });
          if (result?.data) {
            const deletedIds = deletedIdsProvider();
            const patch = await (this._applyServerChanges?.(result.data, deletedIds) ?? Promise.resolve({}));
            if (patch && Object.keys(patch).length) onChange(patch);

            // Update lastSyncAt via callback
            if (result?.serverTime) {
              this._onServerTime?.(result.serverTime);
            }
          }
          return;
        }
      } catch (checkErr) {
        if (checkErr instanceof KickedOutError) {
          this._logoutHandler?.();
          return;
        }
        log.warn(checkErr, { phase: 'poll-check' });
        return;
      }

      this._runSync?.();
    } catch (err) {
      log.error(err, { phase: 'poll' });
    }
  }

  // ── Network Recovery ───────────────────────────────────────────────────

  private startNetworkRecoveryListener(
    onChange: (patch: Record<string, unknown>) => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): void {
    if (this._netInfoUnsubscribe) return;
    this._netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        (async () => {
          const count = await resetAllPendingForRetry().catch(() => 0);
          if (count > 0) {
            log.info(`Network recovered, resetting ${count} items`);
            this._runSync?.();
          }
        })();
      }
    });
  }

  private stopNetworkRecoveryListener(): void {
    this._netInfoUnsubscribe?.();
    this._netInfoUnsubscribe = null;
  }

  // ── Realtime Event Handling ────────────────────────────────────────────

  private getAdaptiveDebounce(entity: string): number {
    const times = this._realtimeEventTimes.get(entity) || [];
    const now = Date.now();
    const recent = times.filter(t => now - t < 2000);
    this._realtimeEventTimes.set(entity, [...recent, now]);
    if (recent.length >= 5) return 1500;
    if (recent.length >= 2) return 300;
    return 0;
  }

  handleRealtimeEvent(
    event: RealtimeChangeEvent,
    onChange: (patch: Record<string, unknown>) => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): void {
    const { entity, payload } = event;
    if (!entity) return;

    const delay = this.getAdaptiveDebounce(entity);
    if (delay === 0) {
      this.processRealtimeEntity(entity, payload, onChange, getLastSyncAt, deletedIdsProvider, getToken);
      return;
    }

    // Debounced path: always use null payload to force incremental pull.
    // This prevents data loss when intermediate events are dropped by debounce.
    // PocketBase SSE sends notifications without per-record payloads, so the
    // pull path (apiSyncPullPost with since=lastSyncAt) catches ALL changes
    // for this entity type regardless of how many events were debounced.
    const existing = this._realtimeDebounce.get(entity);
    if (existing) clearTimeout(existing);
    this._realtimeDebounce.set(entity, setTimeout(() => {
      this._realtimeDebounce.delete(entity);
      this.processRealtimeEntity(entity, null, onChange, getLastSyncAt, deletedIdsProvider, getToken);
    }, delay));
  }

  private async processRealtimeEntity(
    entity: string,
    payload: unknown,
    onChange: (patch: Record<string, unknown>) => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): Promise<void> {
    const token = getToken();
    if (!token) return;

    try {
      if (payload) {
        // Direct payload processing - apply immediately
        const deletedIds = deletedIdsProvider();
        const patch = await (this._applyServerChanges?.({ [entity]: [payload] }, deletedIds) ?? Promise.resolve({}));
        if (patch && Object.keys(patch).length) onChange(patch);
        return;
      }

      // No payload - do incremental pull
      const currentLastSyncAt = getLastSyncAt();
      const result = await apiSyncPullPost(token, {
        entities: [entity],
        since: currentLastSyncAt > 0 ? currentLastSyncAt : undefined,
      });
      if (result?.data?.[entity]) {
        const deletedIds = deletedIdsProvider();
        const patch = await (this._applyServerChanges?.({ [entity]: result.data[entity] }, deletedIds) ?? Promise.resolve({}));
        if (patch && Object.keys(patch).length) onChange(patch);
      }

      // Update lastSyncAt via callback
      if (result?.serverTime) {
        this._onServerTime?.(result.serverTime);
      }
    } catch (err) {
      if (err instanceof KickedOutError) {
        this._logoutHandler?.();
        return;
      }
      log.warn(err, { phase: 'realtime-pull' });
      // Don't trigger full sync — SSE will retry on next event
    }
  }
}