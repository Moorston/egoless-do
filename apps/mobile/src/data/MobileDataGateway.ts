// ─── Mobile DataGateway implementation ────────────────────────────
// Uses SQLite for local storage and sync_queue for change tracking.

import type { DataGateway, DataChangeEvent } from '@egoless-do/core';
import type { SyncEntity } from '@egoless-do/core';
import { openDatabase } from '../db/schema';
import { enqueueChange } from '../db/syncQueue';
import { ENTITY_REGISTRY, type EntityMeta } from '@egoless-do/core';

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
    const params: unknown[] = [];

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        sql += ` AND ${key} = ?`;
        params.push(value);
      }
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params);
    return rows as T[];
  }

  async upsert<T>(entity: string, id: string, data: T): Promise<void> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();
    const record = data as Record<string, unknown>;

    const columns = Object.keys(record);
    const values = Object.values(record);
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
      } catch (err: any) {
        if (err?.message?.includes('UNIQUE constraint')) {
          await db.runAsync(
            `UPDATE ${meta.collection} SET ${setClause},synced=0 WHERE ${meta.localPk}=?`,
            [...values, id],
          );
        } else {
          throw err;
        }
      }
    }

    // Enqueue for sync
    await enqueueChange(entity as SyncEntity, id, 'upsert', data);
  }

  async delete(entity: string, id: string): Promise<void> {
    const meta = this.getMeta(entity);
    const db = await openDatabase();

    // Soft delete
    await db.runAsync(
      `UPDATE ${meta.collection} SET deleted=1, synced=0 WHERE ${meta.localPk}=?`,
      [id],
    );

    // Enqueue for sync
    await enqueueChange(entity as SyncEntity, id, 'delete', { [meta.localPk]: id });
  }

  private getMeta(entity: string): EntityMeta {
    const meta = ENTITY_REGISTRY[entity as SyncEntity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);
    return meta;
  }
}
