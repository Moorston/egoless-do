// ─── Miniprogram Sync Service ────────────────────────────────────
// Pushes unsynced local changes to server, then pulls server data.
// Uses Taro StorageSync as the local queue.
import Taro from '@tarojs/taro';
import { apiSyncPush, apiSyncPull } from '@egoless-do/core';

const QUEUE_KEY = 'egoless-sync-queue';
const LAST_SYNC_KEY = 'egoless-last-sync';

interface SyncItem {
  entity: string;
  entityId: string;
  payload: Record<string, unknown>;
  deleted?: boolean;
  createdAt: number;
}

// ── Queue operations ──────────────────────────────────────────────
function getQueue(): SyncItem[] {
  try {
    return Taro.getStorageSync(QUEUE_KEY) || [];
  } catch {
    return [];
  }
}

function saveQueue(items: SyncItem[]) {
  Taro.setStorageSync(QUEUE_KEY, items);
}

export function enqueueChange(entity: string, entityId: string, payload: Record<string, unknown>, deleted = false) {
  const queue = getQueue();
  // Deduplicate: remove existing item for same entity+entityId
  const filtered = queue.filter(item => !(item.entity === entity && item.entityId === entityId));
  filtered.push({ entity, entityId, payload, deleted, createdAt: Date.now() });
  saveQueue(filtered);
}

function clearQueue() {
  Taro.removeStorageSync(QUEUE_KEY);
}

export function getQueueCount(): number {
  return getQueue().length;
}

// ── Last sync timestamp ───────────────────────────────────────────
function getLastSyncAt(): number {
  try {
    return Taro.getStorageSync(LAST_SYNC_KEY) || 0;
  } catch {
    return 0;
  }
}

function setLastSyncAt(ts: number) {
  Taro.setStorageSync(LAST_SYNC_KEY, ts);
}

// ── Main sync ─────────────────────────────────────────────────────
let _syncing = false;

export async function runMiniprogramSync(token: string): Promise<{ pushed: number; pulled: number }> {
  if (_syncing) return { pushed: 0, pulled: 0 };
  _syncing = true;

  try {
    const lastSyncAt = getLastSyncAt();
    let pushed = 0;
    let pulled = 0;

    // 1. Push local changes
    const queue = getQueue();
    if (queue.length > 0) {
      const changes = queue.map(({ entity, entityId, payload, deleted }) => ({
        entity, entityId, payload, ...(deleted ? { deleted: true } : {}),
      }));

      const result = await apiSyncPush(token, lastSyncAt, changes);
      clearQueue();
      pushed = changes.length;

      // Apply server changes returned by push
      if (result.changes?.length) {
        const serverData = Taro.getStorageSync('egoless-server-data') || {};
        for (const c of result.changes) {
          if (!serverData[c.entity]) serverData[c.entity] = [];
          // Upsert by id
          const idx = serverData[c.entity].findIndex((item: any) => item.id === c.entityId);
          if (idx >= 0) {
            serverData[c.entity][idx] = c.payload;
          } else {
            serverData[c.entity].push(c.payload);
          }
        }
        Taro.setStorageSync('egoless-server-data', serverData);
        pulled = result.changes.length;
      }

      setLastSyncAt(result.serverTime);
      return { pushed, pulled };
    }

    // 2. Nothing to push — pull server changes
    const result = await apiSyncPull(token);
    if (result.data) {
      Taro.setStorageSync('egoless-server-data', result.data);
      pulled = Object.values(result.data).reduce((sum, arr) => sum + arr.length, 0);
    }

    setLastSyncAt(result.serverTime);
    return { pushed, pulled };
  } finally {
    _syncing = false;
  }
}

export function isMiniprogramSyncing(): boolean {
  return _syncing;
}
