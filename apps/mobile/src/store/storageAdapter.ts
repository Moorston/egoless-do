import type { StorageAdapter, SyncEntity } from '@egoless-do/core';
import { openDatabase } from '../db/schema';
import { enqueueChange } from '../db/syncQueue';
import { ENTITY_TABLE_MAP } from './entityTableMap';

export const mobileStorageAdapter: StorageAdapter = {
  async persistChange(entity: SyncEntity, id: string, data: Record<string, unknown>) {
    const db = await openDatabase();
    const config = ENTITY_TABLE_MAP[entity];
    if (!config) {
      console.warn(`[storageAdapter] Unknown entity: ${entity}`);
      return;
    }
    const row = config.toRow(data);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(',');
    const values = Object.values(row);
    await db.runAsync(
      `INSERT OR REPLACE INTO ${config.table} (${columns.join(',')},synced) VALUES (${placeholders},0)`,
      values,
    );
    await enqueueChange(entity, id, 'upsert', data).catch(console.error);
  },

  async markDeleted(entity: SyncEntity, id: string) {
    const db = await openDatabase();
    const config = ENTITY_TABLE_MAP[entity];
    if (!config) {
      console.warn(`[storageAdapter] Unknown entity: ${entity}`);
      return;
    }
    await db.runAsync(`UPDATE ${config.table} SET synced = 2 WHERE ${config.pk} = ?`, [id]);
    await enqueueChange(entity, id, 'delete', { updatedAt: Date.now() }).catch(console.error);
  },
};
