// ─── Mobile sync queue (SQLite-backed) ──────────────────────────
import type { SyncEntity } from '@egoless-do/core';
import { openDatabase, withDbLock } from './schema';

let _enqueueMutex: Promise<void> = Promise.resolve();

export interface SyncQueueItem {
  id: number;
  entity: SyncEntity;
  entity_id: string;
  operation: 'upsert' | 'delete';
  payload: string;
  created_at: number;
  retry_count: number;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  next_retry_at: number;
}

/** Enqueue a change for later sync. Deduplicates by (entity, entity_id). Serialized via mutex. */
export function enqueueChange(
  entity: SyncEntity,
  entityId: string,
  operation: 'upsert' | 'delete',
  payload: unknown,
): Promise<void> {
  const result = _enqueueMutex.then(async () => {
    try {
      const db = await openDatabase();
      // Transactional: DELETE + INSERT must be atomic to prevent queue entry loss on crash
      await withDbLock(() => db.withTransactionAsync(async () => {
        await db.runAsync(
          'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
          [entity, entityId],
        );
        await db.runAsync(
          'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
          [entity, entityId, operation, JSON.stringify(payload), Date.now(), 'pending'],
        );
      }));
    } catch (err) {
      console.error('[syncQueue] enqueue failed:', err);
      throw err;
    }
  });
  // Decouple: swallow rejection on the mutex chain so subsequent callers aren't poisoned
  _enqueueMutex = result.catch(() => {});
  return result;
}

/** Drain up to `limit` pending items from the queue, ordered by creation time. Skips items with active backoff. */
export async function drainQueue(limit = 50): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  const now = Date.now();
  return db.getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE status = 'pending' AND (next_retry_at = 0 OR next_retry_at <= ?) ORDER BY id LIMIT ?",
    [now, limit],
  );
}

/** Get all items with a specific status. */
export async function getQueueItemsByStatus(
  status: SyncQueueItem['status'],
  limit = 100,
): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  return db.getAllAsync<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE status = ? ORDER BY id LIMIT ?',
    [status, limit],
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

/** Mark a queue item as failed with error message. */
export async function markQueueItemFailed(id: number, error: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1 WHERE id = ?",
    [error, id],
  );
}

/** Mark a queue item for retry with backoff delay. */
export async function markQueueItemRetry(id: number, attempt: number, nextRetryAt: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'UPDATE sync_queue SET retry_count = ?, next_retry_at = ? WHERE id = ?',
    [attempt, nextRetryAt, id],
  );
}

/** Mark a queue item as conflict. */
export async function markQueueItemConflict(id: number, error: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'conflict', last_error = ? WHERE id = ?",
    [error, id],
  );
}

/** Reset failed/conflict items back to pending for retry. */
export async function resetQueueItemsForRetry(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL WHERE id IN (${placeholders}) AND retry_count < 5`,
    ids,
  );
}

/** Reset all pending items for network recovery retry. */
export async function resetAllPendingForRetry(): Promise<number> {
  const db = await openDatabase();
  const result = await db.runAsync(
    "UPDATE sync_queue SET status = 'pending', next_retry_at = 0 WHERE status IN ('failed', 'conflict') AND retry_count < 5"
  );
  return result.changes;
}

/** Get the count of pending queue items. */
export async function getQueueCount(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'",
  );
  return row?.count ?? 0;
}

/** Get the count of all non-resolved queue items. */
export async function getTotalQueueCount(): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue WHERE status != 'syncing'",
  );
  return row?.count ?? 0;
}

/** Clear all queue items. */
export async function clearQueue(): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM sync_queue');
}

/** Remove queue items older than maxAgeMs (default: 30 days). */
export async function pruneStaleQueueItems(maxAgeMs = 30 * 24 * 60 * 60 * 1000): Promise<number> {
  const db = await openDatabase();
  const cutoff = Date.now() - maxAgeMs;
  const result = await db.runAsync('DELETE FROM sync_queue WHERE created_at < ?', [cutoff]);
  return result.changes;
}

// ── Sync metadata helpers ────────────────────────────────────────

/** Get the last sync timestamp for an entity. */
export async function getLastSyncTimestamp(entity: string): Promise<string> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ last_sync_timestamp: string }>(
    'SELECT last_sync_timestamp FROM sync_metadata WHERE entity = ?',
    [entity],
  );
  return row?.last_sync_timestamp ?? '1970-01-01T00:00:00.000Z';
}

/** Update the last sync timestamp for an entity. */
export async function setLastSyncTimestamp(entity: string, timestamp: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `INSERT INTO sync_metadata (entity, last_sync_timestamp, last_sync_status, updated_at)
     VALUES (?, ?, 'success', datetime('now'))
     ON CONFLICT(entity) DO UPDATE SET last_sync_timestamp = ?, last_sync_status = 'success', updated_at = datetime('now')`,
    [entity, timestamp, timestamp],
  );
}

/** Get all sync metadata entries. */
export async function getAllSyncMetadata(): Promise<Array<{ entity: string; last_sync_timestamp: string; last_sync_status: string }>> {
  const db = await openDatabase();
  return db.getAllAsync<{ entity: string; last_sync_timestamp: string; last_sync_status: string }>(
    'SELECT * FROM sync_metadata',
  );
}
