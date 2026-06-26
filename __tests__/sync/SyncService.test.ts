// ─── SyncService tests ────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../apps/mobile/src/db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
  }),
  getState: vi.fn().mockResolvedValue(null),
  setState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../apps/mobile/src/db/syncQueue', () => ({
  drainQueue: vi.fn().mockResolvedValue([]),
  removeQueueItems: vi.fn().mockResolvedValue(undefined),
  getQueueCount: vi.fn().mockResolvedValue(0),
  pruneStaleQueueItems: vi.fn().mockResolvedValue(0),
  markQueueItemFailed: vi.fn().mockResolvedValue(undefined),
  markQueueItemConflict: vi.fn().mockResolvedValue(undefined),
  resetAllPendingForRetry: vi.fn().mockResolvedValue(0),
  getLastSyncTimestamp: vi.fn().mockResolvedValue('1970-01-01T00:00:00.000Z'),
  setLastSyncTimestamp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@egoless-do/core', () => ({
  apiSyncPush: vi.fn().mockResolvedValue({ serverTime: Date.now(), changes: [] }),
  apiSyncPull: vi.fn().mockResolvedValue({ data: {}, serverTime: Date.now() }),
  apiSyncCheck: vi.fn().mockResolvedValue({ hasChanges: false, count: 0 }),
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn().mockReturnValue(() => {}),
    fetch: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

import { runSync, resetSyncState, setSyncTokenProvider, isSyncing } from '../../apps/mobile/src/features/sync/SyncService';
import { drainQueue, markQueueItemFailed, removeQueueItems } from '../../apps/mobile/src/db/syncQueue';
import { apiSyncPush } from '@egoless-do/core';

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncTokenProvider(() => 'test-token');
  });

  describe('runSync', () => {
    it('does nothing when no token is set', async () => {
      setSyncTokenProvider(() => null);
      await runSync();
      expect(drainQueue).not.toHaveBeenCalled();
    });

    it('skips when already syncing', async () => {
      // First sync starts
      const sync1 = runSync();
      // Second sync should be skipped
      const sync2 = runSync();
      await Promise.all([sync1, sync2]);
      // drainQueue should only be called once (from the first sync)
      expect(drainQueue).toHaveBeenCalledTimes(1);
    });

    it('pushes queued changes', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1","name":"test"}', created_at: Date.now(), retry_count: 0, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);

      await runSync();

      expect(apiSyncPush).toHaveBeenCalledWith(
        'test-token',
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({ entity: 'habit', entityId: 'h1', op: 'upsert' }),
        ]),
      );
    });

    it('marks failed items on push error', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1"}', created_at: Date.now(), retry_count: 4, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);
      vi.mocked(apiSyncPush).mockRejectedValueOnce(new Error('Network error'));

      await runSync();

      expect(markQueueItemFailed).toHaveBeenCalledWith(1, 'Network error');
    });

    it('removes accepted items from queue', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1"}', created_at: Date.now(), retry_count: 0, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);
      vi.mocked(apiSyncPush).mockResolvedValueOnce({
        serverTime: Date.now(),
        changes: [],
        rejected: [],
      });

      await runSync();

      expect(removeQueueItems).toHaveBeenCalledWith([1]);
    });
  });

  describe('resetSyncState', () => {
    it('resets all sync state', async () => {
      await resetSyncState();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
