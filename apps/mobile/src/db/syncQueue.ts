// ─── Mobile sync queue (SQLite-backed) ──────────────────────────
import type { SyncEntity } from '@egoless-do/core';
import { openDatabase } from './schema';

export interface SyncQueueItem {
  id: number;
  entity: SyncEntity;
  entity_id: string;
  operation: 'upsert' | 'delete';
  payload: string;
  created_at: number;
}

/** Enqueue a change for later sync. Deduplicates by (entity, entity_id). */
export async function enqueueChange(
  entity: SyncEntity,
  entityId: string,
  operation: 'upsert' | 'delete',
  payload: unknown,
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
    [entity, entityId],
  );
  await db.runAsync(
    'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    [entity, entityId, operation, JSON.stringify(payload), Date.now()],
  );
}

/** Drain up to `limit` items from the queue, ordered by creation time. */
export async function drainQueue(limit = 50): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  return db.getAllAsync<SyncQueueItem>(
    'SELECT * FROM sync_queue ORDER BY id LIMIT ?',
    [limit],
  );
}

/** Remove processed queue items by their IDs. */
export async function removeQueueItems(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
    ids,
  );
}

/** Get the count of pending queue items. */
export async function getQueueCount(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue',
  );
  return row?.count ?? 0;
}

/** Clear all queue items. */
export async function clearQueue(): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM sync_queue');
}
