import type { StorageAdapter, SyncEntity } from '@egoless-do/core';
import type { Table } from 'dexie';
import { db } from '../db/webDb';
import { enqueueChange } from '../db/syncQueue';

// ─── Config-driven entity → IndexedDB table mapping ─────────────
interface EntityConfig {
  table: Table;
  pk: string;
  /** Transform data before writing to IndexedDB (optional) */
  toRecord?: (data: Record<string, unknown>, id: string) => Record<string, unknown>;
}

const ENTITY_TABLE_MAP: Record<SyncEntity, EntityConfig> = {
  habit:           { table: db.habits, pk: 'id' },
  reflection:      { table: db.reflections, pk: 'id' },
  fasting:         { table: db.fastingSessions, pk: 'id' },
  food:            { table: db.foodEntries, pk: 'id' },
  checkin:         { table: db.checkins, pk: 'date' },
  exercise:        { table: db.exerciseEntries, pk: 'id' },
  meditation:      { table: db.meditationEntries, pk: 'date' },
  plan:            { table: db.plans, pk: 'id' },
  planItem:        { table: db.planItems, pk: 'id' },
  planItemCheckin: { table: db.planItemCheckins, pk: 'id' },
  grace:           { table: db.graceHistory, pk: 'date' },
  profile: {
    table: db.profiles,
    pk: 'profileId',
    toRecord: (data, id) => ({
      profileId: id || 'self',
      data: typeof data === 'string' ? data : JSON.stringify(data),
      updatedAt: Date.now(),
      deleted: false,
    }),
  },
};

function getEntityConfig(entity: SyncEntity): EntityConfig {
  return ENTITY_TABLE_MAP[entity];
}

// ─── IndexedDB operations ───────────────────────────────────────

async function writeToIndexedDB(entity: SyncEntity, id: string, data: Record<string, unknown>): Promise<void> {
  const config = getEntityConfig(entity);
  const now = Date.now();
  const record = config.toRecord
    ? config.toRecord(data, id)
    : {
        ...data,
        updatedAt: (data.updatedAt as number) ?? now,
        deleted: (data.deleted as boolean) ?? false,
        [config.pk]: id,
      };
  await config.table.put(record as any);
}

async function markDeletedInIndexedDB(entity: SyncEntity, id: string): Promise<void> {
  const config = getEntityConfig(entity);
  const key = entity === 'profile' ? (id || 'self') : id;
  const existing = await config.table.get(key);
  if (existing) {
    await config.table.put({ ...existing, deleted: true, updatedAt: Date.now() } as any);
  }
}

// ─── StorageAdapter implementation ──────────────────────────────

export const webStorageAdapter: StorageAdapter = {
  async persistChange(entity, id, data) {
    await writeToIndexedDB(entity, id, data as Record<string, unknown>);
    await enqueueChange(entity, id, 'upsert', data);
  },
  async markDeleted(entity, id) {
    await markDeletedInIndexedDB(entity, id);
    await enqueueChange(entity, id, 'delete', { updatedAt: Date.now(), deleted: true });
  },
};
