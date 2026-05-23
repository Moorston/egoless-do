// ─── Sync queue operations (Dexie-backed) ────────────────────────
import { db, type SyncEntity, type SyncOperation, type SyncQueueItem } from './webDb';

export async function enqueueChange(
  entity: SyncEntity,
  entityId: string,
  operation: SyncOperation,
  payload: unknown,
): Promise<void> {
  // Deduplicate: remove any existing pending op for the same entity+id,
  // then insert the latest state. For 'delete' we keep only the delete.
  await db.transaction('rw', db.syncQueue, async () => {
    await db.syncQueue.where({ entity, entityId }).delete();
    await db.syncQueue.add({
      entity,
      entityId,
      operation,
      payload,
      createdAt: Date.now(),
    });
  });
}

export async function drainQueue(limit = 50): Promise<SyncQueueItem[]> {
  const items = await db.syncQueue
    .orderBy('_id')
    .limit(limit)
    .toArray();
  return items;
}

export async function removeQueueItems(ids: number[]): Promise<void> {
  if (!ids.length) return;
  await db.syncQueue.bulkDelete(ids);
}

export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear();
}

export async function getQueueCount(): Promise<number> {
  return db.syncQueue.count();
}
