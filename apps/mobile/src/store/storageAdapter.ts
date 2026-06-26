import type { StorageAdapter, SyncEntity } from '@egoless-do/core';
import { openDatabase, withDbLock } from '../db/schema';
import { ENTITY_TABLE_MAP } from './entityTableMap';

/** Write sync queue entry directly inside a transaction (no mutex, no nested transaction). */
async function enqueueInTx(
  db: Awaited<ReturnType<typeof openDatabase>>,
  entity: SyncEntity,
  entityId: string,
  operation: 'upsert' | 'delete',
  payload: unknown,
) {
  await db.runAsync(
    'DELETE FROM sync_queue WHERE entity = ? AND entity_id = ?',
    [entity, entityId],
  );
  await db.runAsync(
    'INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
    [entity, entityId, operation, JSON.stringify(payload), Date.now(), 'pending'],
  );
}

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
    const setClause = columns.map(c => `${c}=?`).join(',');
    // Transactional: entity write + sync queue enqueue are atomic
    await withDbLock(() => db.withTransactionAsync(async () => {
      // UPDATE-first-INSERT to preserve local-only columns (e.g. exercise.health_synced)
      const result = await db.runAsync(
        `UPDATE ${config.table} SET ${setClause},synced=0 WHERE ${config.pk}=?`,
        [...values, id],
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
              [...values, id],
            );
          } else {
            throw insertErr;
          }
        }
      }
      await enqueueInTx(db, entity, id, 'upsert', data);
    }));
  },

  async markDeleted(entity: SyncEntity, id: string) {
    const db = await openDatabase();
    const config = ENTITY_TABLE_MAP[entity];
    if (!config) {
      console.warn(`[storageAdapter] Unknown entity: ${entity}`);
      return;
    }
    // Transactional: soft-delete + sync queue enqueue are atomic
    await withDbLock(() => db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE ${config.table} SET deleted = 1, synced = 2 WHERE ${config.pk} = ?`, [id]);
      await enqueueInTx(db, entity, id, 'delete', { updatedAt: Date.now(), deleted: true });
    }));
  },

  async batchDelete(operations: Array<{ entity: SyncEntity; id: string }>) {
    const db = await openDatabase();
    // Transactional: all soft-deletes + all sync queue enqueues are atomic
    await withDbLock(() => db.withTransactionAsync(async () => {
      for (const { entity, id } of operations) {
        const config = ENTITY_TABLE_MAP[entity];
        if (!config) continue;
        await db.runAsync(`UPDATE ${config.table} SET deleted = 1, synced = 2 WHERE ${config.pk} = ?`, [id]);
        await enqueueInTx(db, entity, id, 'delete', { updatedAt: Date.now(), deleted: true });
      }
    }));
  },
};
