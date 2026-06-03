// ─── Shared Sync Engine ───────────────────────────────────────────
// Platform-agnostic sync orchestration with push/pull/retry.
// Platform-specific data access is injected via SyncEngineDeps.

import type { SyncChange, SyncPushResult, SyncPullResult } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  online: boolean;
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
}

export interface SyncEngineDeps {
  /** Get the auth token (null if not logged in) */
  getToken: () => string | null;
  /** Get pending local changes to push */
  getPending: () => Promise<SyncChange[]>;
  /** Remove synced items from the pending queue */
  removePending: (ids: string[]) => Promise<void>;
  /** Push local changes to server */
  push: (token: string, lastSyncAt: number, changes: SyncChange[]) => Promise<SyncPushResult>;
  /** Pull server changes */
  pull: (token: string) => Promise<SyncPullResult>;
  /** Apply server changes to local DB and return a store patch */
  applyChanges: (changes: SyncChange[], deletedIds?: Set<string>) => Promise<Record<string, unknown>>;
  /** Update the Zustand store with server changes */
  storeUpdater: (changes: SyncChange[]) => void;
  /** Get IDs in the recycle bin (for soft-delete conflict resolution) */
  getDeletedIds?: () => Set<string>;
  /** Get current pending count */
  getPendingCount?: () => Promise<number>;
}

const MAX_RETRY = 3;
const BASE_DELAY_MS = 1000;

export class SyncEngine {
  private state: SyncState = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    status: 'idle',
    lastSyncAt: 0,
    pendingCount: 0,
    error: null,
  };

  private listeners = new Set<(state: SyncState) => void>();
  private syncing = false;

  constructor(private deps: SyncEngineDeps) {}

  getState(): SyncState {
    return this.state;
  }

  subscribe(fn: (state: SyncState) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  setOnline(online: boolean): void {
    this.patch({ online });
  }

  setLastSyncAt(ts: number): void {
    this.patch({ lastSyncAt: ts });
  }

  async refreshPendingCount(): Promise<void> {
    if (this.deps.getPendingCount) {
      this.patch({ pendingCount: await this.deps.getPendingCount() });
    }
  }

  /** Main sync entry point with retry */
  async triggerSync(): Promise<void> {
    if (!this.state.online || this.syncing) return;
    this.syncing = true;
    this.patch({ status: 'syncing', error: null });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      try {
        await this.attemptSync();
        this.patch({ status: 'idle', lastSyncAt: this.state.lastSyncAt ?? Date.now() });
        this.syncing = false;
        await this.refreshPendingCount();
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    this.patch({
      status: 'error',
      error: lastError?.message ?? '同步失败',
    });
    this.syncing = false;
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  private async attemptSync(): Promise<void> {
    const token = this.deps.getToken();
    if (!token) return;

    const items = await this.deps.getPending();
    const deletedIds = this.deps.getDeletedIds?.();

    if (items.length > 0) {
      // Push local changes to server
      const result = await this.deps.push(token, this.state.lastSyncAt ?? 0, items);

      // Apply server changes returned by push
      if (result.changes?.length) {
        await this.deps.applyChanges(result.changes, deletedIds);
        this.deps.storeUpdater(result.changes);
      }

      // Apply rejected changes (server won conflict)
      if (result.rejected?.length) {
        await this.deps.applyChanges(result.rejected, deletedIds);
        this.deps.storeUpdater(result.rejected);
      }

      // Remove synced items from queue
      const syncedIds = items.map(i => i.entityId).filter(Boolean);
      if (syncedIds.length) await this.deps.removePending(syncedIds);

      this.state.lastSyncAt = result.serverTime;
      return;
    }

    // Nothing to push — pull server changes
    const pullResult = await this.deps.pull(token);
    if (pullResult.data && Object.keys(pullResult.data).length > 0) {
      const flatChanges = this.flattenPullData(pullResult.data);
      if (flatChanges.length) {
        await this.deps.applyChanges(flatChanges, deletedIds);
        this.deps.storeUpdater(flatChanges);
      }
    }

    this.state.lastSyncAt = pullResult.serverTime;
  }

  /** Convert pull response data (keyed by entity) to flat change array */
  private flattenPullData(data: Record<string, unknown[]>): SyncChange[] {
    const changes: SyncChange[] = [];
    const idFieldMap: Record<string, string> = {
      habit: 'id', reflection: 'id', fasting: 'id', food: 'id',
      checkin: 'date', exercise: 'id', meditation: 'date',
      plan: 'id', planItem: 'id', planItemCheckin: 'id',
    };

    for (const [entity, records] of Object.entries(data)) {
      if (entity === 'profile') {
        const profileArr = Array.isArray(records) ? records : [records];
        for (const payload of profileArr) {
          changes.push({ entity: entity as any, entityId: 'self', op: 'upsert', payload: payload as Record<string, unknown> });
        }
        continue;
      }
      const idField = idFieldMap[entity];
      if (!idField) continue;
      for (const payload of records) {
        const p = payload as Record<string, unknown>;
        changes.push({ entity: entity as any, entityId: p[idField] as string, op: 'upsert', payload: p });
      }
    }

    return changes;
  }

  private patch(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    for (const fn of this.listeners) fn(this.state);
  }
}
