// ─── Mobile sync queue (SQLite-backed) ──────────────────────────
import type { SyncEntity } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { openDatabase, withDbLock } from './schema';
import { buildDeleteInStatement, buildSelectInStatement, SYNC_QUEUE_UPSERT_SQL } from './sqlHelper';

const log = createLogger('DB');

const MAX_QUEUE_SIZE = 1000;

// Callback triggered after successful enqueue (set by SyncService)
let _onEnqueued: (() => void) | null = null;
export function setOnEnqueuedCallback(fn: () => void) { _onEnqueued = fn; }

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

/** Enqueue a change for later sync. Deduplicates by (entity, entity_id) atomically. */
export async function enqueueChange(
  entity: SyncEntity,
  entityId: string,
  operation: 'upsert' | 'delete',
  payload: unknown,
): Promise<void> {
  try {
    const db = await openDatabase();
    // Evict + insert atomically to prevent race conditions
    await withDbLock(async () => {
      const count = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM sync_queue');
      if ((count?.c ?? 0) >= MAX_QUEUE_SIZE) {
        await db.runAsync('DELETE FROM sync_queue WHERE id = (SELECT id FROM sync_queue ORDER BY created_at ASC LIMIT 1)');
        log.warn(`Queue full (${MAX_QUEUE_SIZE}), evicted oldest item for ${entity}:${entityId}`);
      }
      await db.runAsync(
        SYNC_QUEUE_UPSERT_SQL,
        [entity, entityId, operation, JSON.stringify(payload), Date.now(), 'pending'],
      );
    });
    // Trigger debounced sync after successful enqueue
    _onEnqueued?.();
  } catch (err) {
    log.error(err, { message: 'enqueue failed' });
    throw err;
  }
}

/** Drain up to `limit` pending items from the queue, ordered by creation time. Atomically marks them as 'syncing'. */
export async function drainQueue(limit = 50): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  const now = Date.now();
  return withDbLock(async () => {
    const items = await db.getAllAsync<SyncQueueItem>(
      "SELECT * FROM sync_queue WHERE status = 'pending' AND (next_retry_at = 0 OR next_retry_at <= ?) ORDER BY id LIMIT ?",
      [now, limit],
    );
    if (items.length > 0) {
      const ids = items.map(i => i.id);
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE sync_queue SET status = 'syncing' WHERE id IN (${placeholders}) AND status = 'pending'`,
        ids,
      );
    }
    return items;
  });
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
  const { sql, values } = buildDeleteInStatement('sync_queue', 'id', ids);
  await db.runAsync(sql, values);
}

/** Mark a queue item as failed with error message. */
export async function markQueueItemFailed(id: number, error: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1 WHERE id = ?",
    [error, id],
  );
}

/** Mark a queue item for retry with backoff delay. Resets status to pending. */
export async function markQueueItemRetry(id: number, attempt: number, nextRetryAt: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'pending', retry_count = ?, next_retry_at = ? WHERE id = ?",
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
  const { sql, values } = buildSelectInStatement('sync_queue', 'id', ids);
  // Use the IN clause to build the UPDATE
  const inClause = sql.replace('SELECT * FROM sync_queue WHERE id IN ', 'id IN');
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = NULL WHERE ${inClause} AND retry_count < 5`,
    values,
  );
}

/** Reset pending items for retry in batches. Prevents push storms when many items accumulated. */
export async function resetAllPendingForRetry(batchSize = 50): Promise<number> {
  const db = await openDatabase();
  const result = await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', next_retry_at = 0
     WHERE id IN (SELECT id FROM sync_queue WHERE status IN ('failed', 'conflict', 'syncing')
                  AND retry_count < 10
                  ORDER BY created_at LIMIT ?)`,
    [batchSize],
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

/**
 * Remove stale queue items.
 * - Failed/conflict items older than 7 days are removed (shorter window to avoid stale retries).
 * - Default maxAgeMs is 7 days (was 30 days).
 */
export async function pruneStaleQueueItems(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const db = await openDatabase();
  const cutoff = Date.now() - maxAgeMs;
  const result = await db.runAsync(
    "DELETE FROM sync_queue WHERE created_at < ? AND (status = 'failed' OR status = 'conflict')",
    [cutoff]
  );
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

// ── Sync progress (for phased initial sync) ──────────────────────

export interface SyncProgressRow {
  entity: string;
  phase: number;
  status: 'pending' | 'downloading' | 'done' | 'failed';
  pulled_count: number;
  total_count: number;
  last_page: number;
  last_error: string | null;
  retry_count: number;
  next_retry_at: number;
  updated_at: number;
}

/** Get sync progress for a specific entity. */
export async function getSyncProgress(entity: string): Promise<SyncProgressRow | null> {
  const db = await openDatabase();
  return db.getFirstAsync<SyncProgressRow>(
    'SELECT * FROM sync_progress WHERE entity = ?',
    [entity],
  );
}

/** Get all sync progress entries. */
export async function getAllSyncProgress(): Promise<SyncProgressRow[]> {
  const db = await openDatabase();
  return db.getAllAsync<SyncProgressRow>('SELECT * FROM sync_progress ORDER BY phase, entity');
}

/** Upsert sync progress for an entity. */
export async function updateSyncProgress(entity: string, fields: Partial<Omit<SyncProgressRow, 'entity'>>): Promise<void> {
  const db = await openDatabase();
  const allowedFields = new Set(['phase', 'status', 'pulled_count', 'total_count', 'last_page', 'last_error', 'retry_count', 'next_retry_at']);
  // Always include required fields with defaults for INSERT
  const cols = ['entity', 'updated_at', 'phase', 'status'];
  const vals: (string | number)[] = [entity, Date.now(), 0, 'pending'];
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && allowedFields.has(key)) {
      // Override default if provided
      const idx = cols.indexOf(key);
      if (idx >= 0) {
        vals[idx] = value as string | number;
      } else {
        cols.push(key);
        vals.push(value as string | number);
      }
    }
  }
  const placeholders = cols.map(() => '?').join(',');
  const updateCols = cols.filter(c => c !== 'entity');
  const updateSets = updateCols.map(c => `${c} = excluded.${c}`).join(', ');
  await db.runAsync(
    `INSERT INTO sync_progress (${cols.join(',')}) VALUES (${placeholders})
     ON CONFLICT(entity) DO UPDATE SET ${updateSets}`,
    vals,
  );
}

/** Reset all sync progress (called before a new initial sync). */
export async function resetSyncProgress(): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM sync_progress');
}
