import type { SyncEntity } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';
import { openDatabase, withDbLock } from '../../db/schema';
import { ENTITY_TABLE_MAP } from '../../store/entityTableMap';

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

  constructor(flushDelayMs = 100, onFlushed?: () => void) {
    this._flushDelayMs = flushDelayMs;
    this._onFlushed = onFlushed ?? null;
  }

  write(entity: SyncEntity, id: string, data: Record<string, unknown>, changedFields?: string[]) {
    const key = `${entity}:${id}`;
    const existing = this._pendingWrites.get(key);
    if (existing) {
      // Merge: keep the latest data, merge changedFields
      existing.data = { ...existing.data, ...data };
      existing.operation = 'upsert';
      if (changedFields) {
        existing.changedFields = existing.changedFields
          ? [...new Set([...existing.changedFields, ...changedFields])]
          : changedFields;
      }
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
      this._flush();
    }, this._flushDelayMs);
  }

  async flushNow(): Promise<boolean> {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._pendingWrites.size === 0) return false;
    await this._flush();
    return true;
  }

  get pendingCount(): number { return this._pendingWrites.size; }

  private async _flush() {
    const writes = [...this._pendingWrites.values()];
    this._pendingWrites.clear();
    if (writes.length === 0) return;
    console.log(`[WriteBatcher] Flushing ${writes.length} writes: ${writes.map(w => w.entity).join(', ')}`);

    const db = await openDatabase();
    try {
      await withDbLock(() => db.withTransactionAsync(async () => {
        for (const w of writes) {
          const config = ENTITY_TABLE_MAP[w.entity];
          if (!config) continue;

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

            const result = await db.runAsync(
              `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
              [...values, w.id],
            );
            if (result.changes === 0) {
              try {
                await db.runAsync(
                  `INSERT INTO ${config.table} (${columns.join(',')},synced) VALUES (${placeholders},0)`,
                  values,
                );
              } catch (insertErr: any) {
                if (insertErr?.message?.includes('UNIQUE constraint')) {
                  await db.runAsync(
                    `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
                    [...values, w.id],
                  );
                } else throw insertErr;
              }
            }
          }

          // Enqueue sync — include changedFields for field-level delta push
          const payload = w.changedFields
            ? { ...w.data, _changedFields: w.changedFields }
            : w.data;

          await db.runAsync(
            'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
            [w.entity, w.id],
          );
          await db.runAsync(
            'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
            [w.entity, w.id, w.operation, JSON.stringify(payload), Date.now(), 'pending'],
          );
        }
      }));
      this._onFlushed?.();
    } catch (err) {
      log.error(err, { msg: 'flush failed' });
      let allFallbacksOk = true;
      for (const w of writes) {
        const config = ENTITY_TABLE_MAP[w.entity];
        if (!config) continue;
        try {
          const db2 = await openDatabase();
          // Fallback: write to both data table AND sync_queue individually
          if (w.operation === 'delete') {
            await db2.runAsync(
              `UPDATE ${config.table} SET deleted = 1, synced = 0, updated_at = ? WHERE ${config.pk} = ?`,
              [Date.now(), w.id],
            );
          } else {
            const row = config.toRow(w.data);
            const cols = Object.keys(row);
            const vals = Object.values(row) as (string | number | null)[];
            const setClause = cols.map(c => `${c}=?`).join(',');
            const placeholders = cols.map(() => '?').join(',');
            const r = await db2.runAsync(
              `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
              [...vals, w.id],
            );
            if (r.changes === 0) {
              await db2.runAsync(
                `INSERT INTO ${config.table} (${cols.join(',')},synced) VALUES (${placeholders},0)`,
                vals,
              );
            }
          }
          await db2.runAsync(
            'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
            [w.entity, w.id],
          );
          await db2.runAsync(
            'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
            [w.entity, w.id, w.operation, JSON.stringify(w.data), Date.now(), 'pending'],
          );
        } catch (reErr) {
          log.error(reErr, { msg: 'fallback write failed' });
          allFallbacksOk = false;
        }
      }
      // If the fallback also failed, re-add writes to _pendingWrites for retry
      if (!allFallbacksOk) {
        for (const w of writes) {
          const key = `${w.entity}:${w.id}`;
          if (!this._pendingWrites.has(key)) {
            this._pendingWrites.set(key, w);
          }
        }
      }
      // Trigger sync callback even in fallback path (some writes may have succeeded)
      this._onFlushed?.();
    }
  }
}
