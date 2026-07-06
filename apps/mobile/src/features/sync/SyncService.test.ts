// ─── SyncService tests ────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('../../db/schema', () => ({
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

vi.mock('../../db/syncQueue', () => ({
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
    buildRowToEntity: vi.fn().mockReturnValue(() => null),
    resolveConflict: vi.fn().mockImplementation(({ clientUpdated, serverUpdated }) => ({
      winner: (clientUpdated ?? 0) >= (serverUpdated ?? 0) ? 'client' : 'server',
    })),
    ApiError: class ApiError extends Error {
      constructor(public status: number, public code: string, message: string) { super(message); }
    },
    KickedOutError,
  };
});

vi.mock('./RealtimeAgent', () => ({
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

import { runSync, resetSyncState, setSyncTokenProvider, isSyncing } from './SyncService';
import { drainQueue, markQueueItemFailed, removeQueueItems, enqueueChange, markQueueItemConflict } from '../../db/syncQueue';
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
      // First call to set syncing, second call should skip
      const first = runSync();
      const second = runSync();
      await first;
      await second;
      // drainQueue called only once
      expect(vi.mocked(drainQueue)).toHaveBeenCalledTimes(1);
    });

    it('removes successful items from queue', async () => {
      vi.mocked(drainQueue).mockResolvedValue([
        { id: 'q1', entity: 'habit', op: 'upsert', payload: '{"id":"h1"}', retryCount: 0, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() } as any,
      ]);
      vi.mocked(apiSyncPush).mockResolvedValue({
        serverTime: Date.now(),
        applied: [{ entityId: 'q1', success: true }],
      } as any);
      await runSync();
      expect(removeQueueItems).toHaveBeenCalledWith(['q1']);
    });

    it('handles mixed results', async () => {
      vi.mocked(drainQueue).mockResolvedValue([
        { id: 'q1', entity: 'habit', operation: 'INSERT', payload: { id: 'h1' }, retryCount: 0, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'q2', entity: 'habit', operation: 'UPDATE', payload: { id: 'h2' }, retryCount: 0, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() },
      ]);
      vi.mocked(apiSyncPush).mockResolvedValue({
        serverTime: Date.now(),
        applied: [
          { entityId: 'q1', success: true },
          { entityId: 'q2', success: false, error: 'conflict' },
        ],
      } as any);
      await runSync();
      expect(removeQueueItems).toHaveBeenCalledWith(['q1']);
      expect(markQueueItemFailed).toHaveBeenCalledWith('q2');
    });

    it('handles network errors gracefully', async () => {
      vi.mocked(drainQueue).mockResolvedValue([
        { id: 'q1', entity: 'habit', op: 'upsert', payload: '{"id":"h1"}', retryCount: 0, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() } as any,
      ]);
      vi.mocked(apiSyncPush).mockRejectedValueOnce(new Error('Network error'));
      await runSync();
      expect(markQueueItemFailed).toHaveBeenCalledWith('q1');
    });
  });

  describe('isSyncing', () => {
    it('returns false when not syncing', () => {
      expect(isSyncing()).toBe(false);
    });
  });

  describe('resetSyncState', () => {
    it('resets the sync lock', async () => {
      // Start sync then reset
      const p = runSync();
      resetSyncState();
      await p;
      // Should be able to sync again
      expect(isSyncing()).toBe(false);
    });
  });
});
