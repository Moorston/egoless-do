import type { StorageAdapter, SyncEntity, SyncDataMap } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';
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
});

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
};
