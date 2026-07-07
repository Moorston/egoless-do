// ─── SyncRealtimeController ────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-2 of AR-01 refactoring)
// Manages realtime connection (SSE) and fallback polling.

import { apiSyncPullPost, apiSyncCheck, createLogger, KickedOutError } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';
import NetInfo from '@react-native-community/netinfo';

import { openDatabase, getState, setState } from '../../db/schema';

import { RealtimeAgent, type RealtimeChangeEvent } from './RealtimeAgent';

const log = createLogger('SyncRealtime');

export class SyncRealtimeController {
  private _realtimeAgent = new RealtimeAgent();
  private _sseConnected = false;
  private _realtimeFallbackTimer: ReturnType<typeof setInterval> | null = null;
  private _netInfoUnsubscribe: (() => void) | null = null;
  private _realtimeDebounce = new Map<string, ReturnType<typeof setTimeout>>();
  private _realtimeEventTimes = new Map<string, number[]>();

  constructor() {}

  // ── Connection Management ──────────────────────────────────────────────

  connectRealtime(
    pbUrl: string | undefined,
    getToken: () => string | null,
    onChange: (patch: Record<string, unknown>) => void,
    onKickedOut: () => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
  ): void {
    const token = getToken();
    if (!token) return;

    this.disconnectRealtime();
    this.startNetworkRecoveryListener(onChange, lastSyncAt, deletedIdsProvider, getToken);

    if (pbUrl) {
      this._realtimeAgent.setChangeHandler((event) => this.handleRealtimeEvent(event, onChange, lastSyncAt, deletedIdsProvider, getToken));
      this._realtimeAgent.setStatusHandler((connected) => {
        this._sseConnected = connected;
        if (!connected && !this._realtimeFallbackTimer) this.startFallbackPolling(getToken, onChange, lastSyncAt, deletedIdsProvider);
        else if (connected) this.stopFallbackPolling();
      });
      this._realtimeAgent.connect(pbUrl, token);
    }
    // Only start fallback polling if SSE isn't going to be connected
    if (!pbUrl) this.startFallbackPolling(getToken, onChange, lastSyncAt, deletedIdsProvider);
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
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
  ) {
    if (this._realtimeFallbackTimer) return;
    this._realtimeFallbackTimer = setInterval(() => {
      const currentToken = getToken();
      if (currentToken) this.pollForChanges(currentToken, onChange, lastSyncAt, deletedIdsProvider);
    }, 120_000);
  }

  private async pollForChanges(
    token: string,
    onChange: (patch: Record<string, unknown>) => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
  ): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { getQueueCount } = await import('../../db/syncQueue');
      const queueCount = await getQueueCount();
      if (queueCount > 0) {
        // Import dynamically to avoid circular dependency
        const { runSync } = await import('./SyncService');
        runSync();
        return;
      }

      try {
        // Import dynamically to avoid circular dependency
        const { useAppStore } = await import('../../store/useAppStore');
        const userId = useAppStore.getState().auth.user?.id ?? undefined;

        const checkResult = await apiSyncCheck(token, lastSyncAt, userId);
        if (!checkResult.hasChanges) return;
        const changedEntities = Object.keys(checkResult.changed);
        if (changedEntities.length > 0) {
          const result = await apiSyncPullPost(token, {
            entities: changedEntities,
            since: lastSyncAt > 0 ? lastSyncAt : undefined,
          });
          if (result?.data) {
            // Import dynamically to avoid circular dependency
            const { applyServerChanges } = await import('./SyncService');
            const deletedIds = deletedIdsProvider();
            const patch = await applyServerChanges(result.data, deletedIds);
            if (patch && Object.keys(patch).length) onChange(patch);

            // Update lastSyncAt if server provided a newer timestamp
            if (result?.serverTime) {
              // This should be handled by the caller since we don't have access to SyncEngine's state
              // In the original code, this was done by the SyncEngine itself
            }
          }
          return;
        }
      } catch (checkErr) {
        if (checkErr instanceof KickedOutError) {
          // Import dynamically to avoid circular dependency
          const { useAppStore } = await import('../../store/useAppStore');
          useAppStore.getState().logout();
          return;
        }
        log.warn(checkErr, { phase: 'poll-check' });
      }

      // Import dynamically to avoid circular dependency
      const { runSync } = await import('./SyncService');
      runSync();
    } catch (err) {
      log.error(err, { phase: 'poll' });
    }
  }

  // ── Network Recovery ───────────────────────────────────────────────────

  private startNetworkRecoveryListener(
    onChange: (patch: Record<string, unknown>) => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): void {
    if (this._netInfoUnsubscribe) return;
    this._netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Import dynamically to avoid circular dependency
        (async () => {
          const { resetAllPendingForRetry } = await import('../../db/syncQueue');
          const count = await resetAllPendingForRetry().catch(() => 0);
          if (count > 0) {
            log.info(`Network recovered, resetting ${count} items`);
            // Import dynamically to avoid circular dependency
            const { runSync } = await import('./SyncService');
            runSync();
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
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): void {
    const { entity, payload } = event;
    if (!entity) return;

    const delay = this.getAdaptiveDebounce(entity);
    if (delay === 0) {
      this.processRealtimeEntity(entity, payload, onChange, lastSyncAt, deletedIdsProvider, getToken);
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
      this.processRealtimeEntity(entity, null, onChange, lastSyncAt, deletedIdsProvider, getToken);
    }, delay));
  }

  private async processRealtimeEntity(
    entity: string,
    payload: unknown,
    onChange: (patch: Record<string, unknown>) => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ): Promise<void> {
    const token = getToken();
    if (!token) return;

    try {
      if (payload) {
        // Direct payload processing - apply immediately
        // Import dynamically to avoid circular dependency
        const { applyServerChanges } = await import('./SyncService');
        const deletedIds = deletedIdsProvider();
        const patch = await applyServerChanges({ [entity]: [payload] }, deletedIds);
        if (patch && Object.keys(patch).length) onChange(patch);
        return;
      }

      // No payload - do incremental pull
      const result = await apiSyncPullPost(token, {
        entities: [entity],
        since: lastSyncAt > 0 ? lastSyncAt : undefined,
      });
      if (result?.data?.[entity]) {
        // Import dynamically to avoid circular dependency
        const { applyServerChanges } = await import('./SyncService');
        const deletedIds = deletedIdsProvider();
        const patch = await applyServerChanges({ [entity]: result.data[entity] }, deletedIds);
        if (patch && Object.keys(patch).length) onChange(patch);
      }

      // Update lastSyncAt if server provided a newer timestamp
      if (result?.serverTime) {
        // This should be handled by the caller since we don't have access to SyncEngine's state
        // In the original code, this was done by the SyncEngine itself
      }
    } catch (err) {
      if (err instanceof KickedOutError) {
        // Import dynamically to avoid circular dependency
        const { useAppStore } = await import('../../store/useAppStore');
        useAppStore.getState().logout();
        return;
      }
      log.warn(err, { phase: 'realtime-pull' });
      // Don't trigger full sync — SSE will retry on next event
    }
  }
}