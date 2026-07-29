import type { SyncEntity } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { openDatabase, withDbLock } from '../db/schema';
import { SYNC_QUEUE_UPSERT_SQL } from '../db/sqlHelper';

import { ENTITY_TABLE_MAP } from './entityTableMap';
import { isNotNullConstraintError, decideNotNullRetry } from './flushPolicy';

const log = createLogger('Sync');

interface WriteOp {
  entity: SyncEntity;
  id: string;
  data: Record<string, unknown>;
  operation: 'upsert' | 'delete';
  changedFields?: string[];
}

export class WriteBatcher {
  private _pendingWrites = new Map<string, WriteOp>();
  private _flushTimer: ReturnType<typeof setTimeout> | null = null;
  private _flushDelayMs: number;
  private _onFlushed: (() => void) | null = null;
  private _onPersistError: ((error: Error, entity: string, id: string) => void) | null = null;
  private _retryCount = 0;
  // Counts consecutive NOT NULL failures per key so we surface the error once
  // and then stop retrying (instead of dropping the record silently on the 1st try).
  private _notNullAttempts = new Map<string, number>();

  constructor(flushDelayMs = 250, onFlushed?: () => void, onPersistError?: (error: Error, entity: string, id: string) => void) {
    this._flushDelayMs = flushDelayMs;
    this._onFlushed = onFlushed ?? null;
    this._onPersistError = onPersistError ?? null;
  }

  write(entity: SyncEntity, id: string, data: Record<string, unknown>, changedFields?: string[]) {
    const key = `${entity}:${id}`;
    const existing = this._pendingWrites.get(key);
    if (existing) {
      // If the existing entry is a delete, don't resurrect it — keep the delete
      if (existing.operation === 'delete') return;
      // Create a NEW object (don't mutate in-place) to avoid corrupting in-flight flush snapshots
      this._pendingWrites.set(key, {
        entity, id,
        data: { ...existing.data, ...data },
        operation: 'upsert',
        changedFields: changedFields
          ? [...new Set([...(existing.changedFields ?? []), ...changedFields])]
          : existing.changedFields ?? [],
      });
    } else {
      this._pendingWrites.set(key, { entity, id, data, operation: 'upsert', changedFields });
    }
    this._scheduleFlush();
  }

  markDeleted(entity: SyncEntity, id: string, now = Date.now()) {
    this._pendingWrites.set(`${entity}:${id}`, {
      entity, id,
      data: { updatedAt: now, deleted: true },
      operation: 'delete',
    });
    this._scheduleFlush();
  }

  private _scheduleFlush() {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      void this._flush();
    }, this._flushDelayMs);
  }

  async flushNow(): Promise<boolean> {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._pendingWrites.size === 0) { log.debug("flushNow: no pending writes"); return false; }
    log.debug(`flushNow: flushing ${this._pendingWrites.size} pending writes`);
    await this._flush();
    return true;
  }

  get pendingCount(): number { return this._pendingWrites.size; }

  private async _flush() {
    const keys = [...this._pendingWrites.entries()].map(([k]) => k);
    // Snapshot value references to detect merges during async flush
    const snapRefs = new Map(keys.map(k => [k, this._pendingWrites.get(k)!]));
    const writes = keys.map(k => snapRefs.get(k)!);
    if (writes.length === 0) return;
    log.debug(`Flushing ${writes.length} writes: ${writes.map(w => w.entity).join(', ')}`);
      for (const w of writes) { log.debug(`  flush entity=${w.entity} id=${w.id} op=${w.operation}`); }

    const db = await openDatabase();
    // Records that fail deterministically (e.g. NOT NULL on a column the payload
    // doesn't carry) can't be fixed by retrying — drop them individually instead
    // of discarding the whole batch.
    const failedKeys = new Set<string>();
    // Keys that failed with NOT NULL — kept in the pending queue for retry
    // (see the NOT NULL branch above) and therefore must NOT be deleted.
    const notNullKeys = new Set<string>();
    try {
      await withDbLock(async () => {
        for (const w of writes) {
          const key = `${w.entity}:${w.id}`;
          const config = ENTITY_TABLE_MAP[w.entity];
          if (!config) { log.warn(`[Flush] No config for entity=${w.entity} id=${w.id}`); continue; }

          // Each record's data-write and its sync_queue enqueue must be atomic:
          // a crash between them would otherwise leave local data persisted but
          // never queued for sync. Wrap both in a single SQLite transaction.
          await db.runAsync('BEGIN TRANSACTION');
          try {
            if (w.operation === 'delete') {
              const nowVal = typeof w.data.updatedAt === 'number' ? w.data.updatedAt : Date.now();
              await db.runAsync(
                `UPDATE ${config.table} SET deleted = 1, synced = 0, updated_at = ? WHERE ${config.pk} = ?`,
                [nowVal, w.id],
              );
            } else {
              const row = config.toRow(w.data);
              const columns = Object.keys(row);
              const values = Object.values(row) as (string | number | null)[];
              const setClause = columns.map(c => `${c}=?`).join(',');
              const placeholders = columns.map(() => '?').join(',');

              log.debug(`[Flush] UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=${w.id}`);
              const result = await db.runAsync(
                `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
                [...values, w.id],
              );
              log.debug(`[Flush] UPDATE result: changes=${result.changes}`);
              if (result.changes === 0) {
                log.debug(`[Flush] INSERT ${config.table} (${columns.join(',')},deleted,synced) VALUES (${placeholders},0,0)`);
                try {
                  await db.runAsync(
                    `INSERT INTO ${config.table} (${columns.join(',')},deleted,synced) VALUES (${placeholders},0,0)`,
                    values,
                  );
                } catch (insertErr: unknown) {
                  const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
                  if (msg.includes('UNIQUE constraint')) {
                    await db.runAsync(
                      `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
                      [...values, w.id],
                    );
                  } else throw insertErr;
                }
              }
            }

            // Each record's data write + sync_queue enqueue in one transaction
            const payload = w.changedFields
              ? { ...w.data, _changedFields: w.changedFields }
              : w.data;

            await db.runAsync(
              SYNC_QUEUE_UPSERT_SQL,
              [w.entity, w.id, w.operation, JSON.stringify(payload), Date.now(), 'pending'],
            );

            await db.runAsync('COMMIT');
          } catch (txErr) {
            await db.runAsync('ROLLBACK');
            const msg = txErr instanceof Error ? txErr.message : String(txErr);
            // Deterministic schema constraint failure (e.g. a NOT NULL column the
            // payload doesn't carry) will fail on every retry and can't be fixed
            // here. Report the single record and drop it, rather than aborting the
            // whole batch — previously this rethrew, retried 10x, and discarded all
            // pending writes (M-3). Transient errors (disk I/O, mid-write crash)
            // still propagate to the per-item fallback so the M-1 no-data-without-
            // queue guarantee holds.
            if (isNotNullConstraintError(msg)) {
              // A NOT NULL failure means an entity's toRow() omits a required column.
              // Previously this record was dropped from the batch on the 1st failure,
              // so the data existed only in memory and was lost when the app was killed
              // (and was never queued for sync). Now we KEEP it in the pending queue so
              // it is retried and surfaced, rather than silently discarded.
              const prev = this._notNullAttempts.get(key) ?? 0;
              const decision = decideNotNullRetry(prev);
              this._notNullAttempts.set(key, decision.nextAttempts);
              if (decision.action === 'report') {
                // Surface only on the first failure to avoid log spam; the dev must fix
                // the missing column in the entity's toRow().
                log.error(txErr, { entity: w.entity, id: w.id, phase: 'flush-notnull' });
                if (this._onPersistError) {
                  this._onPersistError(
                    txErr instanceof Error ? txErr : new Error(msg),
                    w.entity,
                    w.id,
                  );
                }
              } else if (decision.action === 'giveup') {
                // Give up after NOT_NULL_MAX_ATTEMPTS to avoid an endless retry loop, but log it.
                log.error(txErr, { entity: w.entity, id: w.id, phase: 'flush-notnull-giveup' });
                failedKeys.add(key);
                this._notNullAttempts.delete(key);
                continue;
              }
              notNullKeys.add(key); // keep pending for retry; not dropped
              continue;
            }
            throw txErr; // transient → outer per-item fallback path
          }
        }
        // Force WAL pages back into the main DB file so a process kill (common on
        // MIUI) cannot drop un-checkpointed commits.
        try { await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* best-effort */ }
      });
      // Only remove entries that weren't merged with new data during flush,
      // plus records that failed deterministically (reported and dropped above).
      // NOT NULL keys are intentionally retained so they are retried next flush.
      for (const k of keys) {
        if (this._pendingWrites.get(k) === snapRefs.get(k) || failedKeys.has(k)) {
          if (!notNullKeys.has(k)) this._pendingWrites.delete(k);
        }
      }
      this._retryCount = 0;
      this._onFlushed?.();
    } catch (err) {
      log.error(err, { msg: 'flush failed' });
      let allFallbacksOk = true;
      await withDbLock(async () => {
        for (const w of writes) {
          const config = ENTITY_TABLE_MAP[w.entity];
          if (!config) { log.warn(`[Flush] No config for entity=${w.entity} id=${w.id}`); continue; }
          try {
            // Fallback: write to both data table AND sync_queue individually
            if (w.operation === 'delete') {
              await db.runAsync(
                `UPDATE ${config.table} SET deleted = 1, synced = 0, updated_at = ? WHERE ${config.pk} = ?`,
                [Date.now(), w.id],
              );
            } else {
              const row = config.toRow(w.data);
              const cols = Object.keys(row);
              const vals = Object.values(row) as (string | number | null)[];
              const setClause = cols.map(c => `${c}=?`).join(',');
              const placeholders = cols.map(() => '?').join(',');
              const r = await db.runAsync(
                `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
                [...vals, w.id],
              );
              if (r.changes === 0) {
                await db.runAsync(
                  `INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${placeholders},0)`,
                  vals,
                );
              }
            }
            const fallbackPayload = w.changedFields
              ? { ...w.data, _changedFields: w.changedFields }
              : w.data;
            await db.runAsync(
              SYNC_QUEUE_UPSERT_SQL,
              [w.entity, w.id, w.operation, JSON.stringify(fallbackPayload), Date.now(), 'pending'],
            );
          } catch (reErr) {
            log.error(reErr, { msg: 'fallback write failed' });
            allFallbacksOk = false;
            if (this._onPersistError) {
              const err = reErr instanceof Error ? reErr : new Error(String(reErr));
              this._onPersistError(err, w.entity, w.id);
            }
          }
        }
        try { await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* best-effort */ }
      });
      if (allFallbacksOk) {
        // All fallback writes succeeded — remove entries not merged with new data
        for (const k of keys) {
          if (this._pendingWrites.get(k) === snapRefs.get(k)) this._pendingWrites.delete(k);
        }
        this._retryCount = 0;
      } else {
        // Remove only successfully written entries; keep failed ones for retry
        // We can't distinguish which succeeded, so keep all for retry
        // but new arrivals are still preserved since we use specific keys
        // Schedule a retry with backoff so stuck entries are eventually flushed
        if (!this._flushTimer) {
          this._retryCount++;
          if (this._retryCount >= 10) {
            log.error('WriteBatcher: max retries reached, discarding pending writes', { count: this._pendingWrites.size });
            // Notify about each discarded write so UI can show error state
            for (const [, entry] of this._pendingWrites) {
              this._onPersistError?.(new Error('Write discarded after max retries'), entry.entity, entry.id);
            }
            this._pendingWrites.clear();
            this._retryCount = 0;
            return;
          }
          this._flushTimer = setTimeout(() => {
            this._flushTimer = null;
            if (this._pendingWrites.size > 0) void this._flush();
          }, 5000);
        }
      }
      // Trigger sync callback only when all fallback writes succeeded
      if (allFallbacksOk) {
        this._onFlushed?.();
      }
    }
  }
}
