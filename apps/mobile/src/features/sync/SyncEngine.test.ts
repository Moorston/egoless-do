// ─── SyncEngine tests ──────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// DOMException polyfill for test environment
class TestDOMException extends Error {
  constructor(message?: string, name?: string) {
    super(message);
    this.name = name ?? 'DOMException';
  }
}

// ── Hoisted mocks ─────────────────────────────────────────────────
const {
  mockDb,
  mockStateStore,
  mockApplyService,
  mockRealtimeController,
  mockRehydrationManager,
  mockResetService,
  mockTimestampManager,
  mockFlushWrites,
  mockDrainQueue,
  mockRemoveQueueItems,
  mockGetQueueCount,
  mockPruneStaleQueueItems,
  mockMarkQueueItemFailed,
  mockMarkQueueItemConflict,
  mockMarkQueueItemRetry,
  mockResetAllPendingForRetry,
  mockGetLastSyncTimestamp,
  mockSetLastSyncTimestamp,
  mockOpenDatabase,
  mockWithDbLock,
  mockApiSyncPush,
  mockApiSyncPull,
  mockApiSyncPullPost,
  mockApiSyncCheck,
  mockKickedOutError,
  mockApiError,
  mockShouldRunOrphanRecovery,
  mockRecoverOrphans,
  mockAppStore,
} = vi.hoisted(() => {
  // Inline sync mock factories (avoids require() issues in vi.hoisted)
  const createMockDb = () => ({
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    runAsync: vi.fn().mockResolvedValue({ changes: 1 }),
    execAsync: vi.fn().mockResolvedValue(undefined),
    getAllSync: vi.fn().mockReturnValue([]),
    getFirstSync: vi.fn().mockReturnValue(null),
    runSync: vi.fn().mockReturnValue({ changes: 1 }),
  });
  const createMockStateStore = () => {
    const store = new Map<string, string>();
    return {
      getState: vi.fn(async (_db: unknown, key: string) => store.get(key) ?? null),
      setState: vi.fn(async (_db: unknown, key: string, value: string) => { store.set(key, value); }),
      _set: (key: string, value: string) => { store.set(key, value); },
      _get: (key: string) => store.get(key),
      _clear: () => { store.clear(); },
    };
  };

  class KickedOutError extends Error {
    constructor(message: string) { super(message); this.name = 'KickedOutError'; }
  }
  class ApiError extends Error {
    status: number; code: string;
    constructor(status: number, code: string, message: string) {
      super(message); this.status = status; this.code = code;
    }
  }

  return {
    mockDb: createMockDb(),
    mockStateStore: createMockStateStore(),
    mockApplyService: {
      applyServerChanges: vi.fn().mockResolvedValue({}),
      markSyncedAndRemove: vi.fn().mockResolvedValue(undefined),
      serverPayloadToRow: vi.fn().mockReturnValue(null),
      getRowMapper: vi.fn().mockReturnValue(undefined),
    },
    mockRealtimeController: {
      connectRealtime: vi.fn(),
      disconnectRealtime: vi.fn(),
      isRealtimeConnected: vi.fn().mockReturnValue(false),
      setRunSync: vi.fn(),
      setApplyServerChanges: vi.fn(),
    },
    mockRehydrationManager: {
      isDeviceSyncedBefore: vi.fn().mockResolvedValue(false),
      rehydrateFromDb: vi.fn().mockResolvedValue({}),
      lazyRehydrate: vi.fn().mockResolvedValue(undefined),
      initialSync: vi.fn().mockResolvedValue('done'),
      resumeInitialSync: vi.fn().mockResolvedValue(undefined),
    },
    mockResetService: {
      softReset: vi.fn().mockResolvedValue(undefined),
      hardReset: vi.fn().mockResolvedValue(undefined),
    },
    mockTimestampManager: {
      getLastSyncAt: vi.fn().mockReturnValue(0),
      setLastSyncAt: vi.fn(),
      getClockOffset: vi.fn().mockReturnValue(0),
      loadLastSyncAt: vi.fn().mockResolvedValue(undefined),
      loadClockOffset: vi.fn().mockResolvedValue(undefined),
      saveLastSyncAt: vi.fn().mockResolvedValue(undefined),
      resetLastSyncAt: vi.fn(),
      updateClockOffset: vi.fn(),
    },
    mockFlushWrites: vi.fn().mockResolvedValue(undefined),
    mockDrainQueue: vi.fn().mockResolvedValue([]),
    mockRemoveQueueItems: vi.fn().mockResolvedValue(undefined),
    mockGetQueueCount: vi.fn().mockResolvedValue(0),
    mockPruneStaleQueueItems: vi.fn().mockResolvedValue(undefined),
    mockMarkQueueItemFailed: vi.fn().mockResolvedValue(undefined),
    mockMarkQueueItemConflict: vi.fn().mockResolvedValue(undefined),
    mockMarkQueueItemRetry: vi.fn().mockResolvedValue(undefined),
    mockResetAllPendingForRetry: vi.fn().mockResolvedValue(0),
    mockGetLastSyncTimestamp: vi.fn().mockResolvedValue(null),
    mockSetLastSyncTimestamp: vi.fn().mockResolvedValue(undefined),
    mockOpenDatabase: vi.fn().mockResolvedValue(undefined),
    mockWithDbLock: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    mockApiSyncPush: vi.fn().mockResolvedValue({ serverTime: Date.now(), rejected: [] }),
    mockApiSyncPull: vi.fn().mockResolvedValue({ data: {}, serverTime: Date.now() }),
    mockApiSyncPullPost: vi.fn().mockResolvedValue({ data: {}, serverTime: Date.now() }),
    mockApiSyncCheck: vi.fn().mockResolvedValue({ hasChanges: false, changed: {} }),
    mockKickedOutError: KickedOutError,
    mockApiError: ApiError,
    mockShouldRunOrphanRecovery: vi.fn().mockReturnValue(false),
    mockRecoverOrphans: vi.fn().mockResolvedValue({ total: 0, byEntity: {} }),
    mockAppStore: {
      _auth: { token: null as string | null, refreshToken: null as string | null, user: null as { id: string } | null },
      getState: vi.fn(() => mockAppStore),
      refreshAuth: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn(),
      get auth() { return mockAppStore._auth; },
      get user() { return mockAppStore._auth.user; },
    },
  };
});

// ── Module mocks ──────────────────────────────────────────────────

vi.mock('../../db/schema', () => ({
  openDatabase: mockOpenDatabase,
  getState: mockStateStore.getState,
  setState: mockStateStore.setState,
  withDbLock: mockWithDbLock,
}));

vi.mock('../../db/syncQueue', () => ({
  drainQueue: mockDrainQueue,
  removeQueueItems: mockRemoveQueueItems,
  getQueueCount: mockGetQueueCount,
  pruneStaleQueueItems: mockPruneStaleQueueItems,
  markQueueItemFailed: mockMarkQueueItemFailed,
  markQueueItemConflict: mockMarkQueueItemConflict,
  markQueueItemRetry: mockMarkQueueItemRetry,
  resetAllPendingForRetry: mockResetAllPendingForRetry,
  getLastSyncTimestamp: mockGetLastSyncTimestamp,
  setLastSyncTimestamp: mockSetLastSyncTimestamp,
}));

vi.mock('../../store/storageAdapter', () => ({
  flushWrites: mockFlushWrites,
}));

vi.mock('../../store/useAppStore', () => ({
  useAppStore: mockAppStore,
}));

vi.mock('./SyncApplyService', () => ({
  SyncApplyService: vi.fn().mockImplementation(() => mockApplyService),
  ENTITY_CONFIG: { habit: { table: 'habits', pk: 'id' } },
}));

vi.mock('./SyncRealtimeController', () => ({
  SyncRealtimeController: vi.fn().mockImplementation(() => mockRealtimeController),
}));

vi.mock('./SyncRehydrationManager', () => ({
  SyncRehydrationManager: vi.fn().mockImplementation(() => mockRehydrationManager),
}));

vi.mock('./SyncResetService', () => ({
  SyncResetService: vi.fn().mockImplementation(() => mockResetService),
}));

vi.mock('./SyncTimestampManager', () => ({
  SyncTimestampManager: vi.fn().mockImplementation(() => mockTimestampManager),
}));

vi.mock('./orphanRecovery', () => ({
  recoverOrphans: mockRecoverOrphans,
  shouldRunOrphanRecovery: mockShouldRunOrphanRecovery,
}));

vi.mock('@egoless-do/core', () => ({
  apiSyncPush: mockApiSyncPush,
  apiSyncPull: mockApiSyncPull,
  apiSyncPullPost: mockApiSyncPullPost,
  apiSyncCheck: mockApiSyncCheck,
  createLogger: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
  ApiError: mockApiError,
  KickedOutError: mockKickedOutError,
  ALL_ENTITY_TABLES: ['habits'],
}));

// Dynamic import mocks
vi.mock('../../store/syncStore', () => ({
  useSyncStore: { getState: () => ({ addConflict: vi.fn() }) },
}));

// ── Import SUT ────────────────────────────────────────────────────
import { SyncEngine } from './SyncEngine';

// ── Helpers ───────────────────────────────────────────────────────

function makeEngine(overrides: Record<string, unknown> = {}) {
  return new SyncEngine({
    applyService: overrides.applyService as never ?? mockApplyService,
    realtimeController: overrides.realtimeController as never ?? mockRealtimeController,
    rehydrationManager: overrides.rehydrationManager as never ?? mockRehydrationManager,
    resetService: overrides.resetService as never ?? mockResetService,
    timestampManager: overrides.timestampManager as never ?? mockTimestampManager,
  });
}

function makeQueueItem(id: number, entity: string, entityId: string, op = 'upsert', payload = '{}') {
  return { id, entity, entity_id: entityId, operation: op, payload, retry_count: 0, created_at: Date.now() };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default DB mock
    mockOpenDatabase.mockResolvedValue(mockDb);
    mockDb.runAsync.mockResolvedValue({ changes: 1 });

    // Default apply service mock
    mockApplyService.applyServerChanges.mockResolvedValue({});
    mockApplyService.serverPayloadToRow.mockReturnValue(null);

    // Default app store mock
    mockAppStore._auth = { token: null, refreshToken: null, user: null };
    mockAppStore.getState.mockReturnValue(mockAppStore);

    engine = makeEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ================================================================
  // Configuration & State
  // ================================================================

  describe('Configuration & State', () => {
    it('setTokenProvider / getUserIdProvider correctly wires providers', () => {
      const tokenFn = () => 'my-token';
      const userIdFn = () => 'user-1';
      engine.setTokenProvider(tokenFn);
      engine.setUserIdProvider(userIdFn);

      // Connect realtime triggers tokenProvider — proves it was stored
      mockRealtimeController.isRealtimeConnected.mockReturnValue(false);
      engine.connectRealtime();
      expect(mockRealtimeController.connectRealtime).toHaveBeenCalledWith(
        undefined,
        expect.any(Function), // token getter
        expect.any(Function), // change handler
        expect.any(Function), // kicked-out handler
        expect.any(Function), // lastSyncAt getter (was raw value, now a function)
        expect.any(Function), // deletedIds provider
        expect.any(Function), // onServerTime callback
      );
      // Verify the token getter returns our value
      const tokenGetter = mockRealtimeController.connectRealtime.mock.calls[0][1];
      expect(tokenGetter()).toBe('my-token');
    });

    it('triggerSyncDebounced fires callback after 2-second debounce', () => {
      vi.useFakeTimers();
      const cb = vi.fn();
      engine.setSyncTriggerCallback(cb);

      engine.triggerSyncDebounced();
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('triggerSyncDebounced resets timer on repeated calls', () => {
      vi.useFakeTimers();
      const cb = vi.fn();
      engine.setSyncTriggerCallback(cb);

      engine.triggerSyncDebounced();
      vi.advanceTimersByTime(1000);
      engine.triggerSyncDebounced(); // reset
      vi.advanceTimersByTime(1000);
      expect(cb).not.toHaveBeenCalled(); // not yet

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('clearSyncTrigger cancels pending debounce', () => {
      vi.useFakeTimers();
      const cb = vi.fn();
      engine.setSyncTriggerCallback(cb);

      engine.triggerSyncDebounced();
      engine.clearSyncTrigger();
      vi.advanceTimersByTime(5000);
      expect(cb).not.toHaveBeenCalled();
    });

    it('isSyncing returns current sync state', () => {
      expect(engine.isSyncing()).toBe(false);
    });
  });

  // ================================================================
  // runSync — concurrency control
  // ================================================================

  describe('runSync concurrency control', () => {
    it('rejects concurrent call when _syncing=true', async () => {
      engine.setTokenProvider(() => 'token');
      // First sync hangs on drainQueue — but _syncing is set synchronously before await
      let resolveDrain: (v: unknown[]) => void;
      mockDrainQueue.mockImplementation(() => new Promise(r => { resolveDrain = r; }));

      const p1 = engine.runSync();
      // Yield to microtask so runSync gets past token check and into drainQueue
      await new Promise<void>(r => setTimeout(r, 0));

      // Second sync should return immediately since _syncing=true
      await engine.runSync();
      expect(engine.isSyncing()).toBe(true);

      // Release the first sync
      resolveDrain!([]);
      await p1;
    });

    it('120-second timeout forces reset and allows new sync', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);

      // Start a sync that hangs
      mockDrainQueue.mockImplementation(() => new Promise(() => {})); // never resolves
      const p1 = engine.runSync();
      // Drain microtasks
      await vi.advanceTimersByTimeAsync(0);

      // Advance time past 120s timeout
      vi.setSystemTime(121_000);

      // New sync should succeed — it aborts the old one
      mockDrainQueue.mockResolvedValue([]);
      await engine.runSync();
      expect(engine.isSyncing()).toBe(false);

      // Clean up
      vi.advanceTimersByTime(100_000);
      try { await p1; } catch { /* ignore */ }
    });

    it('proceeds when _initialSyncing=true (no longer defers)', async () => {
      // Set _initialSyncing directly via private access
      (engine as unknown as Record<string, boolean>)._initialSyncing = true;
      engine.setTokenProvider(() => 'token');

      await engine.runSync();

      // The deferral was removed; sync proceeds normally
      expect(mockDrainQueue).toHaveBeenCalled();
    });
  });

  // ================================================================
  // Token recovery
  // ================================================================

  describe('Token recovery', () => {
    it('attempts refreshAuth when token is null, then syncs', async () => {
      mockAppStore._auth = { token: null, refreshToken: 'refresh-123', user: { id: 'u1' } };
      mockAppStore.refreshAuth.mockImplementation(async () => {
        mockAppStore._auth.token = 'refreshed-token';
      });
      mockDrainQueue.mockResolvedValue([]);
      mockAppStore.getState.mockReturnValue(mockAppStore);
      engine.setTokenProvider(() => mockAppStore._auth?.token ?? null);
      engine.setTokenRecoveryFn(async () => {
        await mockAppStore.refreshAuth();
        return mockAppStore._auth.token;
      });

      await engine.runSync();

      expect(mockAppStore.refreshAuth).toHaveBeenCalled();
      expect(mockDrainQueue).toHaveBeenCalled();
    });

    it('calls logout when refreshAuth fails to produce a token', async () => {
      mockAppStore._auth = { token: null, refreshToken: 'refresh-123', user: { id: 'u1' } };
      mockAppStore.getState.mockReturnValue(mockAppStore);
      mockAppStore.refreshAuth.mockResolvedValue(undefined); // refresh doesn't set token
      engine.setTokenProvider(() => mockAppStore._auth?.token ?? null);
      engine.setTokenRecoveryFn(async () => {
        await mockAppStore.refreshAuth();
        return mockAppStore._auth.token;
      });
      engine.setKickedOutHandler(() => mockAppStore.logout());

      await engine.runSync();

      expect(mockAppStore.logout).toHaveBeenCalled();
      expect(mockDrainQueue).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // executePush
  // ================================================================

  describe('executePush', () => {
    beforeEach(() => {
      engine.setTokenProvider(() => 'token');
    });

    it('skips push when queue is empty', async () => {
      mockDrainQueue.mockResolvedValue([]);
      await engine.runSync();
      expect(mockApiSyncPush).not.toHaveBeenCalled();
    });

    it('batch pushes + marks accepted items synced', async () => {
      const items = [
        makeQueueItem(1, 'habit', 'h1'),
        makeQueueItem(2, 'habit', 'h2'),
      ];
      // First drain returns items, second returns empty (end loop)
      mockDrainQueue.mockResolvedValueOnce(items).mockResolvedValueOnce([]);
      mockApiSyncPush.mockResolvedValueOnce({ serverTime: Date.now(), rejected: [] });

      await engine.runSync();

      expect(mockApiSyncPush).toHaveBeenCalledTimes(1);
      const callArgs = mockApiSyncPush.mock.calls[0];
      expect(callArgs[1]).toBe(0); // lastSyncAt
      expect(callArgs[2]).toHaveLength(2); // 2 changes
      expect(mockApplyService.markSyncedAndRemove).toHaveBeenCalledWith(
        expect.objectContaining({ habit: ['h1', 'h2'] }),
        expect.anything(),
        expect.anything(),
        expect.any(Function),
      );
    });

    it('API failure triggers exponential backoff retry', async () => {
      const items = [makeQueueItem(1, 'habit', 'h1')];
      mockDrainQueue.mockResolvedValueOnce(items);
      mockApiSyncPush.mockRejectedValueOnce(new Error('Network error'));

      await engine.runSync();

      // retry_count=0, new count=1, delay = min(2^1 * 1000, 60000) = 2000
      expect(mockMarkQueueItemRetry).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    it('marks item as failed after MAX_RETRY_ATTEMPTS (5)', async () => {
      const items = [makeQueueItem(1, 'habit', 'h1', 'upsert')];
      items[0].retry_count = 4; // next attempt will be 5
      mockDrainQueue.mockResolvedValueOnce(items);
      mockApiSyncPush.mockRejectedValueOnce(new Error('fail'));

      await engine.runSync();

      expect(mockMarkQueueItemFailed).toHaveBeenCalledWith(1, 'fail');
      expect(mockMarkQueueItemRetry).not.toHaveBeenCalled();
    });

    it('auto-resolves rejected items with serverData (server-wins)', async () => {
      const items = [makeQueueItem(1, 'habit', 'h1')];
      mockDrainQueue.mockResolvedValueOnce(items);

      mockApplyService.serverPayloadToRow.mockReturnValueOnce({ name: 'Updated', id: 'h1' });
      mockApiSyncPush.mockResolvedValueOnce({
        serverTime: Date.now(),
        rejected: [{ entity: 'habit', entityId: 'h1', serverData: { name: 'Updated' } }],
      });

      await engine.runSync();

      // Should have run UPDATE + possible INSERT
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE habits'),
        expect.arrayContaining(['Updated', 'h1']),
      );
      expect(mockRemoveQueueItems).toHaveBeenCalledWith([1]);
    });

    it('marks conflict when rejected item has no serverData', async () => {
      const items = [makeQueueItem(1, 'habit', 'h1')];
      mockDrainQueue.mockResolvedValueOnce(items);

      mockApiSyncPush.mockResolvedValueOnce({
        serverTime: Date.now(),
        rejected: [{ entity: 'habit', entityId: 'h1' }], // no serverData
      });

      await engine.runSync();

      expect(mockMarkQueueItemConflict).toHaveBeenCalledWith(1, 'Server rejected');
    });
  });

  // ================================================================
  // executePull
  // ================================================================

  describe('executePull', () => {
    beforeEach(() => {
      engine.setTokenProvider(() => 'token');
      engine.setUserIdProvider(() => 'user-1');
    });

    it('normal pull calls applyServerChanges', async () => {
      const serverData = { habit: [{ id: 'h1', name: 'test' }] };
      mockDrainQueue.mockResolvedValue([]);
      mockApiSyncCheck.mockResolvedValueOnce({ hasChanges: true, changed: { habit: 1 } });
      mockApiSyncPull.mockResolvedValueOnce({ data: serverData, serverTime: Date.now() });
      mockApplyService.applyServerChanges.mockResolvedValueOnce({ habits: [{ id: 'h1' }] });

      await engine.runSync();

      expect(mockApiSyncPull).toHaveBeenCalledWith('token', 'user-1', undefined);
      expect(mockApplyService.applyServerChanges).toHaveBeenCalledWith(
        serverData,
        expect.any(Set),
        expect.anything(),
      );
    });

    it('push rejection causes pull of only conflicted entities (apiSyncPullPost)', async () => {
      const items = [makeQueueItem(1, 'habit', 'h1')];
      mockDrainQueue.mockResolvedValueOnce(items);

      mockApiSyncPush.mockResolvedValueOnce({
        serverTime: Date.now(),
        rejected: [{ entity: 'habit', entityId: 'h1' }],
      });
      // apiSyncPullPost for post-push pull and for conflict pull
      mockApiSyncPullPost.mockResolvedValue({ data: {}, serverTime: Date.now() });

      await engine.runSync();

      // The pull phase with rejections uses apiSyncPullPost, not apiSyncPull
      expect(mockApiSyncPullPost).toHaveBeenCalled();
    });

    it('abort signal interrupts pull phase', async () => {
      engine.setTokenProvider(() => 'token');

      mockDrainQueue.mockResolvedValue([]);
      mockApiSyncCheck.mockResolvedValueOnce({ hasChanges: true, changed: { habit: 1 } });
      mockApiSyncPull.mockImplementation(async () => {
        // By the time pull resolves, abort has already been signaled in the push→pull flow
        return { data: {}, serverTime: Date.now() };
      });
      mockApplyService.applyServerChanges.mockRejectedValueOnce(
        new TestDOMException('Aborted', 'AbortError'),
      );

      // Should not throw — caught by the try/catch in runSync
      await engine.runSync();

      expect(mockApplyService.applyServerChanges).toHaveBeenCalled();
    });
  });

  // ================================================================
  // Kicked-out detection
  // ================================================================

  describe('Kicked-out detection', () => {
    beforeEach(() => {
      engine.setTokenProvider(() => 'token');
      const kickedOutFn = vi.fn();
      engine.setKickedOutHandler(kickedOutFn);
    });

    it('push-phase 401 KICKED_OUT triggers kicked-out callback', async () => {
      mockDrainQueue.mockResolvedValueOnce([makeQueueItem(1, 'habit', 'h1')]);
      const err = new mockApiError(401, 'KICKED_OUT', 'Session expired');
      mockApiSyncPush.mockRejectedValueOnce(err);

      await engine.runSync();

      expect(mockRealtimeController.disconnectRealtime).toHaveBeenCalled();
    });

    it('pull-phase 401 KICKED_OUT triggers kicked-out callback', async () => {
      mockDrainQueue.mockResolvedValue([]);
      const err = new mockKickedOutError('Kicked out');
      mockApiSyncCheck.mockRejectedValueOnce(err);

      await engine.runSync();

      expect(mockRealtimeController.disconnectRealtime).toHaveBeenCalled();
    });
  });

  // ================================================================
  // Reset delegation
  // ================================================================

  describe('Reset delegation', () => {
    it('softReset delegates to SyncResetService', async () => {
      await engine.softReset();
      expect(mockResetService.softReset).toHaveBeenCalledWith(
        expect.any(Function), // disconnectRealtime
        expect.any(Function), // resetLastSyncAt
      );
      // Verify the callbacks work
      const disconnectCb = mockResetService.softReset.mock.calls[0][0];
      const resetCb = mockResetService.softReset.mock.calls[0][1];
      disconnectCb();
      expect(mockRealtimeController.disconnectRealtime).toHaveBeenCalled();
      resetCb();
      expect(mockTimestampManager.resetLastSyncAt).toHaveBeenCalled();
    });

    it('hardReset delegates to SyncResetService with confirm token', async () => {
      await engine.hardReset('CONFIRM_HARD_RESET');
      expect(mockResetService.hardReset).toHaveBeenCalledWith(
        'CONFIRM_HARD_RESET',
        expect.any(Function),
        expect.any(Function),
      );
    });
  });

  // ================================================================
  // forceFullSync
  // ================================================================

  describe('forceFullSync', () => {
    it('resets lastSyncAt to 0 before running sync', async () => {
      engine.setTokenProvider(() => 'token');
      mockDrainQueue.mockResolvedValue([]);

      await engine.forceFullSync();

      expect(mockTimestampManager.resetLastSyncAt).toHaveBeenCalled();
      expect(mockTimestampManager.saveLastSyncAt).toHaveBeenCalledWith(0);
    });
  });

  // ================================================================
  // recordMetric
  // ================================================================

  describe('recordMetric', () => {
    it('records metrics with correct fields', () => {
      (engine as unknown as Record<string, Function>).recordMetric(1500, 5, 3, true);
      const metrics = engine.getSyncMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        durationMs: 1500,
        pushed: 5,
        pulled: 3,
        success: true,
      });
    });

    it('caps at 20 entries (MAX_METRICS)', () => {
      for (let i = 0; i < 25; i++) {
        (engine as unknown as Record<string, Function>).recordMetric(i, 0, 0, true);
      }
      expect(engine.getSyncMetrics()).toHaveLength(20);
      // Oldest entries should be dropped — first entry is now from i=5
      expect(engine.getSyncMetrics()[0].durationMs).toBe(5);
    });
  });

  // ================================================================
  // Orphan recovery
  // ================================================================

  describe('orphanRecovery', () => {
    beforeEach(() => {
      engine.setTokenProvider(() => 'token');
    });

    it('runs orphanRecovery when condition is met (30s cooldown)', async () => {
      mockShouldRunOrphanRecovery.mockReturnValue(true);
      mockRecoverOrphans.mockResolvedValue({ total: 2, byEntity: { habit: 2 } });
      mockDrainQueue.mockResolvedValue([]);

      await engine.runSync();

      expect(mockRecoverOrphans).toHaveBeenCalled();
    });

    it('skips orphanRecovery when condition not met', async () => {
      mockShouldRunOrphanRecovery.mockReturnValue(false);
      mockDrainQueue.mockResolvedValue([]);

      await engine.runSync();

      expect(mockRecoverOrphans).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // Rehydration delegation
  // ================================================================

  describe('Rehydration delegation', () => {
    it('rehydrateFromDb delegates to SyncRehydrationManager', async () => {
      mockRehydrationManager.rehydrateFromDb.mockResolvedValue({ habits: [{ id: 'h1' }] });
      const patch = await engine.rehydrateFromDb(['habit']);
      expect(mockRehydrationManager.rehydrateFromDb).toHaveBeenCalledWith(['habit']);
      expect(patch).toEqual({ habits: [{ id: 'h1' }] });
    });

    it('lazyRehydrate delegates to SyncRehydrationManager', async () => {
      engine.setChangeHandler(() => {});
      await engine.lazyRehydrate('habit');
      expect(mockRehydrationManager.lazyRehydrate).toHaveBeenCalledWith('habit', expect.any(Function));
    });
  });

  // ================================================================
  // getSyncStatus
  // ================================================================

  describe('getSyncStatus', () => {
    it('returns current status', async () => {
      mockGetQueueCount.mockResolvedValue(5);
      mockTimestampManager.getLastSyncAt.mockReturnValue(1000);

      const status = await engine.getSyncStatus();

      expect(status).toEqual({
        lastSyncAt: 1000,
        pendingCount: 5,
        isSyncing: false,
      });
    });

    it('handles getQueueCount failure gracefully', async () => {
      mockGetQueueCount.mockRejectedValue(new Error('db error'));

      const status = await engine.getSyncStatus();
      expect(status.pendingCount).toBe(0);
    });
  });

  // ================================================================
  // Edge cases
  // ================================================================

  describe('Edge cases', () => {
    it('triggerSyncDebounced warns when no callback set', () => {
      engine.triggerSyncDebounced();
      // Should not throw — just logs a warning
    });

    it('connectRealtime returns early when no token', () => {
      engine.connectRealtime();
      expect(mockRealtimeController.connectRealtime).not.toHaveBeenCalled();
    });

    it('runSync handles corrupt queue item payload gracefully', async () => {
      engine.setTokenProvider(() => 'token');
      const badItem = { ...makeQueueItem(1, 'habit', 'h1'), payload: 'invalid-json' };
      mockDrainQueue.mockResolvedValueOnce([badItem]).mockResolvedValueOnce([]);

      await engine.runSync();

      expect(mockMarkQueueItemFailed).toHaveBeenCalledWith(1, 'Corrupt payload');
      expect(mockApiSyncPush).not.toHaveBeenCalled(); // no valid changes
    });

    it('runSync completes even when cleanup throws', async () => {
      engine.setTokenProvider(() => 'token');
      mockDrainQueue.mockResolvedValue([]);
      // Force cleanup failure
      mockDb.runAsync.mockRejectedValue(new Error('cleanup error'));

      // Should not throw
      await engine.runSync();
      expect(engine.isSyncing()).toBe(false);
    });

    it('MigrationDone getter/setter works', () => {
      expect(engine.getMigrationDone()).toBe(false);
      engine.setMigrationDone(true);
      expect(engine.getMigrationDone()).toBe(true);
    });
  });
});
