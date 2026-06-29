import type { StorageAdapter, SyncEntity } from '@egoless-do/core';
import { WriteBatcher } from '../features/sync/WriteBatcher';
import { triggerSyncDebounced } from '../features/sync/SyncService';

// Global batcher coalesces all writes within a 100ms window into single transaction.
// Flushes are also triggered on app background via useAppStore.
const _batcher = new WriteBatcher(100, () => { triggerSyncDebounced(); });

export function flushWrites(): Promise<boolean> {
  return _batcher.flushNow();
}

export const mobileStorageAdapter: StorageAdapter = {
  async persistChange(entity: SyncEntity, id: string, data: any): Promise<void> {
    _batcher.write(entity, id, data);
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
