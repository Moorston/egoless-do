// ─── Background sync engine: local IndexedDB → self-hosted API ────
import { drainQueue, removeQueueItems, getQueueCount, type SyncQueueItem } from './syncQueue';
import { db } from './webDb';
import { getRealtimeSyncService, normalizeEntity, type RealtimeEvent } from '@egoless-do/core';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRY = 3;
const BASE_DELAY_MS = 1000;

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  online: boolean;
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
}

type Listener = (state: SyncState) => void;

let state: SyncState = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  status: 'idle',
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
};

const listeners = new Set<Listener>();
let timerHandle: ReturnType<typeof setInterval> | null = null;
let syncing = false;
let getToken: (() => string | null) | null = null;
let storeUpdater: ((changes: Array<{ entity: string; payload: any }>) => void) | null = null;

function emit() {
  for (const fn of listeners) fn(state);
}

function patch(partial: Partial<SyncState>) {
  state = { ...state, ...partial };
  emit();
}

// ── Configure auth token provider ─────────────────────────────────

export function setSyncTokenProvider(provider: () => string | null) {
  getToken = provider;
}

export function setSyncStoreUpdater(updater: (changes: Array<{ entity: string; payload: any }>) => void) {
  storeUpdater = updater;
}

// ── Self-hosted API sync ──────────────────────────────────────────

async function apiSync(changes: SyncQueueItem[]): Promise<{ changes: any[]; rejected?: any[]; serverTime: number }> {
  const token = getToken?.();
  if (!token) throw new Error('未登录');

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      lastSyncAt: state.lastSyncAt ?? 0,
      changes: changes.map(c => ({
        entity: c.entity,
        entityId: c.entityId,
        op: c.operation,
        payload: c.payload,
      })),
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('登录已过期，请重新登录');
    throw new Error(`同步失败: ${res.status}`);
  }

  return res.json();
}

// ── Apply server changes to local IndexedDB ────────────────────

async function applyChangesToIndexedDB(changes: Array<{ entity: string; entityId: string; payload: any; deleted?: boolean }>) {
  // meditation and profile are Zustand-only (localStorage), skip in IndexedDB
  const dbChanges = changes.filter(c => c.entity !== 'meditation' && c.entity !== 'profile');
  if (!dbChanges.length) return;

  await db.transaction('rw', [db.habits, db.reflections, db.fastingSessions, db.foodEntries, db.checkins, db.exerciseEntries, db.plans, db.planItems, db.planItemCheckins], async () => {
    for (const c of dbChanges) {
      if (c.deleted) {
        switch (c.entity) {
          case 'habit':           await db.habits.delete(c.entityId); break;
          case 'reflection':      await db.reflections.delete(c.entityId); break;
          case 'fasting':         await db.fastingSessions.delete(c.entityId); break;
          case 'food':            await db.foodEntries.delete(c.entityId); break;
          case 'checkin':         await db.checkins.delete(c.entityId); break;
          case 'exercise':        await db.exerciseEntries.delete(c.entityId); break;
          case 'plan':            await db.plans.delete(c.entityId); break;
          case 'planItem':        await db.planItems.delete(c.entityId); break;
          case 'planItemCheckin': await db.planItemCheckins.delete(c.entityId); break;
        }
      } else {
        // Normalize mobile legacy snake_case fields to camelCase
        const normalized = normalizeEntity(c.payload as Record<string, unknown>);
        const serverTs = Number((normalized as any).updatedAt ?? 0);

        // Timestamp-aware merge: skip if local record is newer
        const storeMap: Record<string, any> = {
          habit: db.habits, reflection: db.reflections, fasting: db.fastingSessions,
          food: db.foodEntries, checkin: db.checkins, exercise: db.exerciseEntries,
          plan: db.plans, planItem: db.planItems, planItemCheckin: db.planItemCheckins,
        };
        const store = storeMap[c.entity];
        if (store && serverTs > 0) {
          const local = await store.get(c.entityId);
          if (local && (local.updatedAt ?? 0) > serverTs) continue; // local is newer, skip
        }

        switch (c.entity) {
          case 'habit':           await db.habits.put(normalized as any); break;
          case 'reflection':      await db.reflections.put(normalized as any); break;
          case 'fasting':         await db.fastingSessions.put(normalized as any); break;
          case 'food':            await db.foodEntries.put(normalized as any); break;
          case 'checkin':         await db.checkins.put(normalized as any); break;
          case 'exercise':        await db.exerciseEntries.put(normalized as any); break;
          case 'plan':            await db.plans.put(normalized as any); break;
          case 'planItem':        await db.planItems.put(normalized as any); break;
          case 'planItemCheckin': await db.planItemCheckins.put(normalized as any); break;
        }
      }
    }
  });
}

// ── Core sync logic ──────────────────────────────────────────────

async function attemptDrain(): Promise<void> {
  const items = await drainQueue(100);

  if (items.length > 0) {
    // Push local changes to server
    const result = await apiSync(items);

    // Apply server changes returned by push
    if (result.changes?.length) {
      await applyChangesToIndexedDB(result.changes);
    }

    // Apply rejected changes (server won conflict) to IndexedDB + Zustand
    if (result.rejected?.length) {
      await applyChangesToIndexedDB(result.rejected);
      storeUpdater?.(result.rejected);
    }

    // Also notify Zustand about server changes
    if (result.changes?.length && storeUpdater) {
      storeUpdater(result.changes);
    }

    // Remove synced items from queue
    await removeQueueItems(items.map(i => i._id!).filter(Boolean));

    patch({ lastSyncAt: result.serverTime });
    return;
  }

  // Nothing to push — pull server changes via GET
  const token = getToken?.();
  if (!token) return;

  const res = await fetch('/api/sync', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return;

  const { data } = await res.json();
  if (!data) return;

  const flatChanges: Array<{ entity: string; entityId: string; payload: any }> = [];
  const idFieldMap: Record<string, string> = {
    habit: 'id', reflection: 'id', fasting: 'id', food: 'id', checkin: 'date', exercise: 'id',
    plan: 'id', planItem: 'id', planItemCheckin: 'id',
  };
  for (const [entity, records] of Object.entries(data as Record<string, any[]>)) {
    const idField = idFieldMap[entity];
    if (!idField) continue;
    for (const payload of records) {
      flatChanges.push({ entity, entityId: payload[idField], payload });
    }
  }
  if (flatChanges.length) {
    await applyChangesToIndexedDB(flatChanges);
    if (storeUpdater) storeUpdater(flatChanges);
  }

  patch({ lastSyncAt: Date.now() });
}

async function syncWithRetry(): Promise<void> {
  if (syncing) return;
  syncing = true;
  patch({ status: 'syncing', error: null });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      await attemptDrain();
      patch({ status: 'idle', lastSyncAt: Date.now() });
      syncing = false;
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  patch({
    status: 'error',
    error: lastError?.message ?? '同步失败',
  });
  syncing = false;
}

// ── Public API ────────────────────────────────────────────────────

export async function triggerSync(): Promise<void> {
  if (!state.online) return;
  await syncWithRetry();
  patch({ pendingCount: await getQueueCount() });
}

export async function refreshPendingCount(): Promise<void> {
  patch({ pendingCount: await getQueueCount() });
}

export function subscribeSyncState(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getSyncState(): SyncState {
  return state;
}

// ── Initialization ────────────────────────────────────────────────

export function initSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Online / offline listeners
  const onOnline = () => {
    patch({ online: true });
    triggerSync();
    connectRealtime();
  };
  const onOffline = () => {
    patch({ online: false });
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Periodic sync timer
  timerHandle = setInterval(() => {
    if (state.online && state.status !== 'syncing') {
      triggerSync();
    }
  }, SYNC_INTERVAL_MS);

  // Listen for SW background sync messages
  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SYNC_REQUEST') {
      triggerSync();
    }
  };
  navigator.serviceWorker?.addEventListener('message', onMessage);

  // Register Background Sync API if available
  registerBgSync();

  // Initial pending count
  refreshPendingCount();

  // Connect to real-time sync if token is available
  connectRealtime();

  // Cleanup
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    navigator.serviceWorker?.removeEventListener('message', onMessage);
    if (timerHandle) clearInterval(timerHandle);
    disconnectRealtime();
  };
}

// ── Real-time sync ───────────────────────────────────────────────

let realtimeService: ReturnType<typeof getRealtimeSyncService> | null = null;

function connectRealtime() {
  const token = getToken?.();
  if (!token) return;

  const apiBase = window.location.origin;
  realtimeService = getRealtimeSyncService(apiBase);
  realtimeService.setToken(token);

  // Subscribe to real-time events
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
  // Apply real-time changes to local IndexedDB
  const change = {
    entity: event.entity,
    entityId: event.entityId,
    payload: event.payload,
    deleted: event.deleted,
  };

  await applyChangesToIndexedDB([change]);

  // Update pending count
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
