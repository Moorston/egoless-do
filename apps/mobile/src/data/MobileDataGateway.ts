// ─── Mobile DataGateway implementation ────────────────────────────
// Uses SQLite for local storage and sync_queue for change tracking.

import type { DataGateway, DataChangeEvent } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';
import { openDatabase } from '../db/schema';
import { enqueueChange } from '../db/syncQueue';
import { ENTITY_REGISTRY, type EntityMeta } from '@egoless-do/core';
import { getClockOffset, resetOrphanRecoveryFlag } from '../features/sync/SyncService';

const log = createLogger('Data');

export class MobileDataGateway implements DataGateway {
  async get<T>(entity: string, id: string): Promise<T | null> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${meta.collection} WHERE ${meta.localPk} = ? AND deleted = 0`,
      [id],
    );
    return row ? (row as T) : null;
  }

  async list<T>(entity: string, filter?: Record<string, unknown>): Promise<T[]> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();

    let sql = `SELECT * FROM ${meta.collection} WHERE deleted = 0`;
    const params: (string | number | null)[] = [];

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        // Sanitize column name: only alphanumeric + underscore allowed
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          log.warn(`[Gateway] Invalid filter key rejected: ${key}`);
          continue;
        }
        sql += ` AND ${key} = ?`;
        params.push(value as string | number | null);
      }
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows as T[];
  }

  async upsert<T>(entity: string, id: string, data: T): Promise<void> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();
    const record = data as Record<string, unknown>;

    // Apply clock offset to updatedAt so push payload has server-calibrated time
    if ('updatedAt' in record) {
      record.updatedAt = Date.now() + getClockOffset();
    }

    const columns = Object.keys(record);
    // Validate column names to prevent SQL injection
    for (const col of columns) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) throw new Error(`Invalid column name: ${col}`);
    }
    const values = Object.values(record) as (string | number | null)[];
    const setClause = columns.map(c => `${c}=?`).join(',');
    const placeholders = columns.map(() => '?').join(',');

    // Try update first, then insert
    const result = await db.runAsync(
      `UPDATE ${meta.collection} SET ${setClause},synced=0 WHERE ${meta.localPk}=?`,
      [...values, id],
    );

    if (result.changes === 0) {
      try {
        await db.runAsync(
          `INSERT INTO ${meta.collection} (${columns.join(',')},synced) VALUES (${placeholders},0)`,
          values,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('UNIQUE constraint')) {
          await db.runAsync(
            `UPDATE ${meta.collection} SET ${setClause},synced=0 WHERE ${meta.localPk}=?`,
            [...values, id],
          );
        } else {
          throw err;
        }
      }
    }

    // Enqueue for sync (non-blocking: failure is recovered by orphan recovery on next startup)
    try {
      await enqueueChange(entity as SyncEntity, id, 'upsert', data);
    } catch (e) {
      log.error(e, { message: `enqueueChange failed for ${entity}/${id}, will be recovered by orphan scan` });
      resetOrphanRecoveryFlag();
    }
  }

  async delete(entity: string, id: string): Promise<void> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();

    // Soft delete
    await db.runAsync(
      `UPDATE ${meta.collection} SET deleted=1, synced=0 WHERE ${meta.localPk}=?`,
      [id],
    );

    // Enqueue for sync (non-blocking: failure is recovered by orphan recovery on next startup)
    try {
      await enqueueChange(entity as SyncEntity, id, 'delete', { [meta.localPk]: id });
    } catch (e) {
      log.error(e, { message: `enqueueChange(delete) failed for ${entity}/${id}, will be recovered by orphan scan` });
      resetOrphanRecoveryFlag();
    }
  }

  private getMeta(entity: string): EntityMeta {
    const meta = ENTITY_REGISTRY[entity as SyncEntity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);
    return meta;
  }
}
