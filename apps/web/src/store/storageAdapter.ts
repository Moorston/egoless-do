import type { StorageAdapter } from '@egoless-do/core';
import { enqueueChange } from '../db/syncQueue';

export const webStorageAdapter: StorageAdapter = {
  async persistChange(entity, id, data) {
    await enqueueChange(entity, id, 'upsert', data);
  },
  async markDeleted(entity, id) {
    await enqueueChange(entity, id, 'delete', { updatedAt: Date.now() });
  },
};
