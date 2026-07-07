import type { StorageAdapter, SyncEntity, SyncDataMap } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';

import { openDatabase, withDbLock, getState, setState } from '../db/schema';
import { WriteBatcher } from '../features/sync/WriteBatcher';

const log = createLogger('StorageAdapter');

// Lazy reference to avoid circular dependency:
// storageAdapter → SyncService → SyncEngine → storageAdapter
let _triggerSync: (() => void) | null = null;
export function setStorageAdapterTrigger(fn: () => void) { _triggerSync = fn; }

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
  // Writes are batched (100ms debounce) for performance. The promise resolves
  // immediately — use flushWrites() if you need to guarantee DB persistence
  // before proceeding (e.g., during migration).
  async persistChange<K extends SyncEntity>(entity: K, id: string, data: SyncDataMap[K]): Promise<void> {
    _batcher.write(entity, id, data as Record<string, unknown>);
  },

  async markDeleted(entity: SyncEntity, id: string) {
    _batcher.markDeleted(entity, id);
  },

  async batchDelete(operations: Array<{ entity: SyncEntity; id: string }>) {
    for (const { entity, id } of operations) {
      _batcher.markDeleted(entity, id);
    }
    // Flush immediately for batch operations
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
