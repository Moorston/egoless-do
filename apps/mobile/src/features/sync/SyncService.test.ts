// ─── SyncService tests ────────────────────────────────────────────
import {describe, it, expect, beforeEach, vi} from 'vitest';

// Mock all dependencies before importing
vi.mock('../../db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue({
    execAsync: vi.fn(),
    runAsync: vi.fn().mockResolvedValue({ changes: 0 }),
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    withTransactionAsync: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  }),
  withDbLock: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
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
    createLogger: vi.fn().mockReturnValue({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
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

import { drainQueue } from '../../db/syncQueue';

import { runSync, resetSyncState, setSyncTokenProvider, isSyncing } from './SyncService';

describe('SyncService', () => {
  beforeEach(() => {
    vi.mocked(drainQueue).mockReset().mockResolvedValue([]);
    setSyncTokenProvider(() => 'test-token');
    resetSyncState();
  });

  describe('runSync', () => {
    it('does nothing when no token is set', async () => {
      setSyncTokenProvider(() => null);
      await runSync();
      expect(drainQueue).not.toHaveBeenCalled();
    });

    it('skips when already syncing', async () => {
      const first = runSync();
      const second = runSync();
      await first;
      await second;
      expect(vi.mocked(drainQueue)).toHaveBeenCalledTimes(1);
    });

    it('completes successfully with empty queue', async () => {
      vi.mocked(drainQueue).mockResolvedValue([]);
      await runSync();
      // Should not throw
    });

    it('completes successfully with items in queue', async () => {
      vi.mocked(drainQueue).mockResolvedValue([
        { id: 1, entity: 'habit', entity_id: 'h1', operation: 'upsert', payload: '{"id":"h1"}', retry_count: 0, status: 'pending', created_at: Date.now(), updated_at: Date.now() },
      ]);
      await runSync();
      // Should not throw even with items in queue
    });
  });

  describe('isSyncing', () => {
    it('returns false when not syncing', () => {
      expect(isSyncing()).toBe(false);
    });
  });

  describe('resetSyncState', () => {
    it('resets the sync lock', async () => {
      const p = runSync();
      resetSyncState();
      await p;
      expect(isSyncing()).toBe(false);
    });
  });
});
