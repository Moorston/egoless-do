import type { StorageAdapter, SyncEntity, SyncDataMap } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { openDatabase, withDbLock, getState, setState } from '../db/schema';
import { WriteBatcher } from './WriteBatcher';
import { ENTITY_TABLE_MAP } from './entityTableMap';

const log = createLogger('StorageAdapter');

// Lazy reference to avoid circular dependency:
// storageAdapter → SyncService → SyncEngine → storageAdapter
let _triggerSync: (() => void) | null = null;
export function setStorageAdapterTrigger(fn: () => void) { _triggerSync = fn; }

// Lazy reference for registering local deletes with sync engine
let _registerLocalDelete: ((entity: string, id: string) => void) | null = null;
export function setRegisterLocalDelete(fn: (entity: string, id: string) => void) { _registerLocalDelete = fn; }

// Global batcher coalesces all writes within a 100ms window into single transaction.
// Flushes are also triggered on app background via useAppStore.
const _batcher = new WriteBatcher(100, () => {
  log.debug('WriteBatcher flushed, triggering sync...');
  _triggerSync?.();
}, (error, entity, id) => {
  log.warn(`Persist failed: ${entity}/${id}`, error.message);
  // Surface to UI via store (connected after store init)
  _onPersistError?.(error, entity, id);
});

// Lazy reference for persist error callback (connected by useAppStore)
let _onPersistError: ((error: Error, entity: string, id: string) => void) | null = null;
export function setPersistErrorHandler(fn: (error: Error, entity: string, id: string) => void) {
  _onPersistError = fn;
}

export function flushWrites(): Promise<boolean> {
  return _batcher.flushNow();
}

export const mobileStorageAdapter: StorageAdapter = {
  /**
   * Persist a single entity change to SQLite via WriteBatcher.
   * ⚠️ The returned Promise resolves IMMEDIATELY (before the actual DB write).
   * The write is batched and flushed after a 100ms debounce window.
   * If you need to guarantee the write has landed in SQLite before reading
   * (e.g., during migration or before a sync pull), call `flushWrites()` explicitly.
   */
  async persistChange<K extends SyncEntity>(entity: K, id: string, data: SyncDataMap[K]): Promise<void> {
    _batcher.write(entity, id, data as Record<string, unknown>);
  },

  async markDeleted(entity: SyncEntity, id: string) {
    _registerLocalDelete?.(entity, id);
    _batcher.markDeleted(entity, id);
  },

  async batchDelete(operations: Array<{ entity: SyncEntity; id: string }>) {
    for (const { entity, id } of operations) {
      _registerLocalDelete?.(entity, id);
      _batcher.markDeleted(entity, id);
    }
    // Flush immediately for batch operations
    await _batcher.flushNow();
  },

  async hardDelete(operations: Array<{ entity: SyncEntity; id: string }>) {
    const db = await openDatabase();
    await withDbLock(async () => {
      for (const { entity, id } of operations) {
        const config = ENTITY_TABLE_MAP[entity];
        if (!config) continue;
        // Physically remove the row from SQLite
        await db.runAsync(`DELETE FROM ${config.table} WHERE ${config.pk} = ?`, [id]);
        // Register with SyncApplyService to prevent resurrection (60s window)
        _registerLocalDelete?.(entity, id);
      }
    });
    // Enqueue delete operations for sync push
    for (const { entity, id } of operations) {
      _batcher.markDeleted(entity, id);
    }
    await _batcher.flushNow();
  },

  // ── Settings persistence (unified storage) ───────────────────
  async persistSettings(key: string, value: unknown): Promise<void> {
    const db = await openDatabase();
    await withDbLock(async () => {
      await setState(db, key, JSON.stringify(value));
    });
  },

  async getSettings(key: string): Promise<unknown | null> {
    const db = await openDatabase();
    return withDbLock(async () => {
      const raw = await getState(db, key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    });
  },

  // ── Transaction support ──────────────────────────────────────
  // NOTE: withDbLock already serializes all database access, making the inner
  // BEGIN TRANSACTION redundant for single-writer scenarios. The nested
  // transaction pattern is safe because withDbLock ensures only one writer
  // at a time — no deadlock risk. However, if a caller calls transaction()
  // from within another withDbLock context, SQLite may deadlock.
  // Use withDbLock directly for simple serialization, and this transaction()
  // method only when you need atomic rollback across multiple operations.
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = await openDatabase();
    return withDbLock(async () => {
      await db.execAsync('BEGIN TRANSACTION');
      try {
        const result = await fn();
        await db.execAsync('COMMIT');
        return result;
      } catch (e) {
        await db.execAsync('ROLLBACK');
        throw e;
      }
    });
  },
};
