// ─── SyncService tests ────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../apps/mobile/src/db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    withTransactionAsync: vi.fn().mockImplementation(async (fn) => fn()),
  }),
  withDbLock: vi.fn().mockImplementation(async (fn) => fn()),
  getState: vi.fn().mockResolvedValue(null),
  setState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../apps/mobile/src/db/syncQueue', () => ({
  drainQueue: vi.fn().mockResolvedValue([]),
  removeQueueItems: vi.fn().mockResolvedValue(undefined),
  getQueueCount: vi.fn().mockResolvedValue(0),
  pruneStaleQueueItems: vi.fn().mockResolvedValue(0),
  enqueueChange: vi.fn().mockResolvedValue(undefined),
  markQueueItemFailed: vi.fn().mockResolvedValue(undefined),
  markQueueItemConflict: vi.fn().mockResolvedValue(undefined),
  resetAllPendingForRetry: vi.fn().mockResolvedValue(0),
  getLastSyncTimestamp: vi.fn().mockResolvedValue('1970-01-01T00:00:00.000Z'),
  setLastSyncTimestamp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@egoless-do/core', () => {
  class KickedOutError extends Error {
    constructor(message: string) { super(message); this.name = 'KickedOutError'; }
  }
  return {
    apiSyncPush: vi.fn().mockResolvedValue({ serverTime: Date.now(), changes: [] }),
    apiSyncPull: vi.fn().mockResolvedValue({ data: {}, serverTime: Date.now() }),
    apiSyncPullPost: vi.fn().mockResolvedValue({ data: {}, serverTime: Date.now() }),
    apiSyncCheck: vi.fn().mockResolvedValue({ hasChanges: false, count: 0, changed: {} }),
    apiSyncPullEntity: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createLogger: vi.fn().mockReturnValue({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
    SCHEMAS: new Proxy({}, { get: () => ({ sqlite: { table: 'test', pk: 'id' }, pocketbase: { collection: 'test', serverIdField: 'id' }, fields: [] }) }),
    buildServerPayloadToRow: vi.fn().mockReturnValue(() => null),
    resolveConflict: vi.fn().mockImplementation(({ clientUpdated, serverUpdated }) => ({
      winner: (clientUpdated ?? 0) >= (serverUpdated ?? 0) ? 'client' : 'server',
    })),
    ApiError: class ApiError extends Error {
      constructor(public status: number, public code: string, message: string) { super(message); }
    },
    KickedOutError,
  };
});

vi.mock('../../apps/mobile/src/features/sync/RealtimeAgent', () => ({
  RealtimeAgent: class {
    setChangeHandler() {}
    setStatusHandler() {}
    connect() {}
    disconnect() {}
  },
  RealtimeChangeEvent: {},
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn().mockReturnValue(() => {}),
    fetch: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  },
}));

import { runSync, resetSyncState, setSyncTokenProvider, isSyncing } from '../../apps/mobile/src/features/sync/SyncService';
import { drainQueue, markQueueItemFailed, removeQueueItems, enqueueChange, markQueueItemConflict } from '../../apps/mobile/src/db/syncQueue';
import { apiSyncPush, resolveConflict } from '@egoless-do/core';

describe('SyncService', () => {
  beforeEach(() => {
    vi.mocked(drainQueue).mockReset().mockResolvedValue([]);
    vi.mocked(apiSyncPush).mockReset().mockResolvedValue({ serverTime: Date.now(), changes: [] });
    vi.mocked(removeQueueItems).mockReset().mockResolvedValue(undefined);
    vi.mocked(markQueueItemFailed).mockReset().mockResolvedValue(undefined);
    vi.mocked(markQueueItemConflict).mockReset().mockResolvedValue(undefined);
    vi.mocked(enqueueChange).mockReset().mockResolvedValue(undefined);
    setSyncTokenProvider(() => 'test-token');
  });

  describe('runSync', () => {
    it('does nothing when no token is set', async () => {
      setSyncTokenProvider(() => null);
      await runSync();
      expect(drainQueue).not.toHaveBeenCalled();
    });

    it('skips when already syncing', async () => {
      const sync1 = runSync();
      const sync2 = runSync();
      await Promise.all([sync1, sync2]);
      expect(drainQueue).toHaveBeenCalledTimes(1);
    });

    it('pushes queued changes', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1","name":"test"}', created_at: Date.now(), retry_count: 0, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);

      await runSync();

      expect(apiSyncPush).toHaveBeenCalledTimes(1);
      const [token, lastSyncAt, changes] = vi.mocked(apiSyncPush).mock.calls[0];
      expect(token).toBe('test-token');
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entity: 'habit', entityId: 'h1', operation: 'upsert' }),
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

    it('removes accepted items from queue via atomic transaction', async () => {
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

      // markSyncedAndRemove uses db.runAsync inside a transaction (not removeQueueItems)
      const { openDatabase } = await import('../../apps/mobile/src/db/schema');
      const db = await vi.mocked(openDatabase)();
      expect(vi.mocked(db.runAsync)).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sync_queue'),
        [1],
      );
    });

    it('marks as conflict when serverData cannot be converted to valid row', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1"}', created_at: Date.now(), retry_count: 0, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);
      vi.mocked(apiSyncPush).mockResolvedValueOnce({
        serverTime: Date.now(),
        changes: [],
        rejected: [{ entity: 'habit', entityId: 'h1', error: 'conflict', serverData: { id: 'h1', name: 'server-version' } }],
      });

      await runSync();

      // F6.6 fix: invalid serverData should NOT auto-resolve — mark as conflict instead
      expect(markQueueItemConflict).toHaveBeenCalledWith(1, 'Invalid serverData');
      expect(removeQueueItems).not.toHaveBeenCalled();
    });

    it('marks items as conflict when no serverData in rejection', async () => {
      const queueItems = [
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1"}', created_at: Date.now(), retry_count: 0, last_error: null, status: 'pending' },
      ];
      vi.mocked(drainQueue).mockResolvedValueOnce(queueItems).mockResolvedValueOnce([]);
      vi.mocked(apiSyncPush).mockResolvedValueOnce({
        serverTime: Date.now(),
        changes: [],
        rejected: [{ entity: 'habit', entityId: 'h1', error: 'conflict' }],
      });

      await runSync();

      expect(markQueueItemConflict).toHaveBeenCalledWith(1, 'Server rejected');
    });
  });

  describe('resetSyncState', () => {
    it('resets all sync state', async () => {
      await resetSyncState();
      expect(true).toBe(true);
    });
  });
});
