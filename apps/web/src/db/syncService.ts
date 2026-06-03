// ─── Background sync engine: local IndexedDB → self-hosted API ────
import { drainQueue, removeQueueItems, getQueueCount, type SyncQueueItem } from './syncQueue';
import { db } from './webDb';
import { getRealtimeSyncService, normalizeEntity, SyncEngine, type SyncChange, type RealtimeEvent } from '@egoless-do/core';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

type Listener = (state: import('@egoless-do/core').SyncState) => void;

let getToken: (() => string | null) | null = null;
let storeUpdater: ((changes: SyncChange[]) => void) | null = null;
let deletedIdsProvider: (() => Set<string>) | null = null;

// ── SyncEngine instance ──────────────────────────────────────────

const engine = new SyncEngine({
  getToken: () => getToken?.() ?? null,

  getPending: async () => {
    const items = await drainQueue(100);
    return items.map(i => ({
      entity: i.entity as SyncChange['entity'],
      entityId: i.entityId,
      op: i.operation as 'upsert' | 'delete',
      payload: i.payload as Record<string, unknown>,
    }));
  },

  removePending: async (ids) => {
    // IDs in the sync queue are numeric _id, not entity IDs
    // We need to drain and match by entityId
    const items = await drainQueue(1000);
    const toRemove = items.filter(i => ids.includes(i.entityId)).map(i => i._id!).filter(Boolean);
    if (toRemove.length) await removeQueueItems(toRemove);
  },

  push: async (token, lastSyncAt, changes) => {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        lastSyncAt,
        changes: changes.map(c => ({
          entity: c.entity,
          entityId: c.entityId,
          op: c.op,
          payload: c.payload,
          deleted: c.deleted,
        })),
      }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('登录已过期，请重新登录');
      throw new Error(`同步失败: ${res.status}`);
    }

    return res.json();
  },

  pull: async (token) => {
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`拉取失败: ${res.status}`);
    return res.json();
  },

  applyChanges: async (changes, deletedIds) => {
    return applyChangesToIndexedDB(changes, deletedIds);
  },

  storeUpdater: (changes) => {
    storeUpdater?.(changes);
  },

  getDeletedIds: () => deletedIdsProvider?.() ?? new Set(),

  getPendingCount: () => getQueueCount(),
});

// ── Configure auth token provider ─────────────────────────────────

export function setSyncTokenProvider(provider: () => string | null) {
  getToken = provider;
}

export function setSyncStoreUpdater(updater: (changes: SyncChange[]) => void) {
  storeUpdater = updater;
}

export function setDeletedIdsProvider(provider: () => Set<string>) {
  deletedIdsProvider = provider;
}

// ── Apply server changes to local IndexedDB ────────────────────

async function applyChangesToIndexedDB(changes: SyncChange[], deletedIds?: Set<string>): Promise<Record<string, unknown>> {
  if (!changes.length) return {};

  // Ensure database is ready
  await db.open();

  const storeMap: Record<string, { table: any; pk: string }> = {
    habit:          { table: db.habits, pk: 'id' },
    reflection:     { table: db.reflections, pk: 'id' },
    fasting:        { table: db.fastingSessions, pk: 'id' },
    food:           { table: db.foodEntries, pk: 'id' },
    checkin:        { table: db.checkins, pk: 'date' },
    exercise:       { table: db.exerciseEntries, pk: 'id' },
    meditation:     { table: db.meditationEntries, pk: 'date' },
    plan:           { table: db.plans, pk: 'id' },
    planItem:       { table: db.planItems, pk: 'id' },
    planItemCheckin:{ table: db.planItemCheckins, pk: 'id' },
    grace:          { table: db.graceHistory, pk: 'date' },
  };

  const tables = Object.values(storeMap).map(s => s.table);

  await db.transaction('rw', tables, async () => {
    for (const c of changes) {
      const normalized = normalizeEntity(c.payload as Record<string, unknown>);
      const serverTs = Number((normalized as any).updatedAt ?? 0);

      // Profile is stored as a wrapper record
      if (c.entity === 'profile') {
        if (c.deleted || deletedIds?.has(c.entityId)) {
          const local = await db.profiles.get(c.entityId);
          if (local && (local.updatedAt ?? 0) > serverTs) continue;
          await db.profiles.put({ profileId: c.entityId, data: JSON.stringify(normalized), updatedAt: serverTs || Date.now(), deleted: true });
        } else {
          const local = await db.profiles.get(c.entityId);
          if (local && (local.updatedAt ?? 0) > serverTs) continue;
          await db.profiles.put({ profileId: c.entityId, data: JSON.stringify(normalized), updatedAt: serverTs || Date.now(), deleted: false });
        }
        continue;
      }

      const config = storeMap[c.entity];
      if (!config) continue;
      const { table } = config;

      // If server says deleted or locally in recycle bin, soft-delete
      if (c.deleted || deletedIds?.has(c.entityId)) {
        const local = await table.get(c.entityId);
        if (local && (local.updatedAt ?? 0) > serverTs) continue;
        await table.put({ ...(normalized as Record<string, unknown>), deleted: true });
        continue;
      }

      // Timestamp-aware merge: skip if local record is newer or locally deleted
      if (serverTs > 0) {
        const local = await table.get(c.entityId);
        if (local) {
          if (local.deleted) {
            // Local is deleted — only accept if server also deleted with newer timestamp
            if (!(c.deleted && serverTs > (local.updatedAt ?? 0))) continue;
          } else if ((local.updatedAt ?? 0) > serverTs) {
            continue;
          }
        }
      }

      // Preserve local colors field for reflections if server data lacks it
      if (c.entity === 'reflection' && !(normalized as any).colors) {
        const local = await table.get(c.entityId);
        if (local?.colors) (normalized as any).colors = local.colors;
      }
      await table.put(normalized as Record<string, unknown>);
    }
  });

  return {};
}

// ── Public API ────────────────────────────────────────────────────

export async function triggerSync(): Promise<void> {
  await engine.triggerSync();
}

export async function refreshPendingCount(): Promise<void> {
  await engine.refreshPendingCount();
}

export function subscribeSyncState(fn: Listener): () => void {
  return engine.subscribe(fn);
}

export function getSyncState(): import('@egoless-do/core').SyncState {
  return engine.getState();
}

export type SyncStatus = import('@egoless-do/core').SyncStatus;
export type SyncState = import('@egoless-do/core').SyncState;

// ── Initialization ────────────────────────────────────────────────

let timerHandle: ReturnType<typeof setInterval> | null = null;
let realtimeService: ReturnType<typeof getRealtimeSyncService> | null = null;

export function initSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onOnline = () => {
    engine.setOnline(true);
    triggerSync();
    connectRealtime();
  };
  const onOffline = () => {
    engine.setOnline(false);
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  timerHandle = setInterval(() => {
    const s = engine.getState();
    if (s.online && s.status !== 'syncing') {
      triggerSync();
    }
  }, SYNC_INTERVAL_MS);

  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SYNC_REQUEST') triggerSync();
  };
  navigator.serviceWorker?.addEventListener('message', onMessage);

  registerBgSync();
  refreshPendingCount();
  connectRealtime();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    navigator.serviceWorker?.removeEventListener('message', onMessage);
    if (timerHandle) clearInterval(timerHandle);
    disconnectRealtime();
  };
}

// ── Real-time sync ───────────────────────────────────────────────

function connectRealtime() {
  const token = getToken?.();
  if (!token) return;

  const apiBase = window.location.origin;
  realtimeService = getRealtimeSyncService(apiBase);
  realtimeService.setToken(token);

  realtimeService.subscribe((event: RealtimeEvent) => {
    handleRealtimeEvent(event);
  });
}

function disconnectRealtime() {
  if (realtimeService) {
    realtimeService.disconnect();
    realtimeService = null;
  }
}

async function handleRealtimeEvent(event: RealtimeEvent) {
  const change: SyncChange = {
    entity: event.entity as SyncChange['entity'],
    entityId: event.entityId,
    op: event.deleted ? 'delete' : 'upsert',
    payload: event.payload as Record<string, unknown>,
    deleted: event.deleted,
  };

  await applyChangesToIndexedDB([change]);

  if (storeUpdater) {
    storeUpdater([change]);
  }

  refreshPendingCount();
}

async function registerBgSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    // @ts-expect-error -- Background Sync API types not in all TS configs
    if (reg?.sync?.register) {
      // @ts-expect-error
      await reg.sync.register('egoless-do-sync');
    }
  } catch {
    // Background Sync not supported (Safari, Firefox) — graceful degradation
  }
}
