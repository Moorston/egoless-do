// ─── SyncRehydrationManager tests ────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// ── Hoisted mocks ──────────────────────────────────────────────────
const {
  mockDb,
  mockRowMappers,
  mockStateStore,
  mockSyncProgress,
  mockApiSyncPullEntity,
  mockDbGetAllFoodEntries,
  mockComputePlanProgress,
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

  const createMockRowMappers = () => {
    const identity = <T>(row: T) => row;
    return {
      rowToHabit: identity, rowToReflection: identity, rowToFasting: identity,
      rowToFood: identity, rowToCheckin: identity, rowToExercise: identity,
      rowToMeditation: identity, rowToProfile: identity, rowToPlan: identity,
      rowToPlanItem: identity, rowToPlanItemCheckin: identity, rowToGrace: identity,
      rowToDailyCustomTodo: identity, rowToDailyTodoHistory: identity,
      rowToThoughtTrail: identity, rowToTrailNote: identity, rowToReflectionLink: identity,
      rowToAIConfig: identity, rowToCheckinReview: identity, rowToBodyGoal: identity,
      rowToBodyPlan: identity, rowToWeightRecord: identity, rowToBodyCheckin: identity,
      rowToSleep: identity, rowToGive: identity, rowToMotivationEntry: identity,
      rowToCustomWuxing: identity, rowToVision: identity, rowToVisionPractice: identity,
      rowToDedication: identity, rowToMantraDef: identity, rowToMantraSession: identity,
      rowToFearEntry: identity, rowToCourageEntry: identity, rowToFearAchievement: identity,
      rowToSutraReading: identity, rowToBreath: identity, rowToZhiguanSession: identity,
    };
  };

  const createMockStateStore = () => {
    const store = new Map<string, string>();
    return {
      _store: store,
      getState: vi.fn(async (_db: unknown, key: string) => store.get(key) ?? null),
      setState: vi.fn(async (_db: unknown, key: string, value: string) => { store.set(key, value); }),
      _set: (key: string, value: string) => { store.set(key, value); },
      _get: (key: string) => store.get(key),
      _clear: () => { store.clear(); },
    };
  };

  const createMockSyncProgressStore = () => {
    const store = new Map<string, Record<string, unknown>>();
    return {
      _store: store,
      getSyncProgress: vi.fn(async (entity: string) => store.get(entity) ?? null),
      updateSyncProgress: vi.fn(async (entity: string, updates: Record<string, unknown>) => {
        const existing = store.get(entity) ?? {};
        store.set(entity, { ...existing, ...updates });
      }),
      _setProgress: (entity: string, data: Record<string, unknown>) => { store.set(entity, data); },
      _getAll: () => Object.fromEntries(store),
      _clear: () => { store.clear(); },
    };
  };

  const createMockApiSyncPullEntity = () =>
    vi.fn(async (_token: string, _entity: string, _page: number, _limit: number, _userId?: string) => ({
      data: [] as Record<string, unknown>[],
      hasMore: false,
      total: 0,
    }));

  return {
    mockDb: createMockDb(),
    mockRowMappers: createMockRowMappers(),
    mockStateStore: createMockStateStore(),
    mockSyncProgress: createMockSyncProgressStore(),
    mockApiSyncPullEntity: createMockApiSyncPullEntity(),
    mockDbGetAllFoodEntries: vi.fn().mockResolvedValue([]),
    mockComputePlanProgress: vi.fn().mockReturnValue(0.5),
  };
});

// ── Module mocks ───────────────────────────────────────────────────

vi.mock('../../db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue(mockDb),
  getState: mockStateStore.getState,
  setState: mockStateStore.setState,
}));

vi.mock('../../db/syncQueue', () => ({
  getSyncProgress: mockSyncProgress.getSyncProgress,
  updateSyncProgress: mockSyncProgress.updateSyncProgress,
}));

vi.mock('../../db/queries', () => ({
  dbGetAllFoodEntries: mockDbGetAllFoodEntries,
}));

vi.mock('../../store/rowMappers', () => mockRowMappers);

// Single async vi.mock for @egoless-do/core to include computePlanProgress
vi.mock('@egoless-do/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@egoless-do/core');
  return {
    ...actual,
    apiSyncPullEntity: mockApiSyncPullEntity,
    createLogger: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
    computePlanProgress: mockComputePlanProgress,
  };
});

import { SyncRehydrationManager } from './SyncRehydrationManager';

// ── Helpers ────────────────────────────────────────────────────────

/** Create a mock SyncEntity result from apiSyncPullEntity */
function pullResult(data: Record<string, unknown>[], hasMore = false, total?: number) {
  return { data, hasMore, total: total ?? data.length };
}

describe('SyncRehydrationManager', () => {
  let mgr: SyncRehydrationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore store-backed implementations after clearAllMocks
    mockSyncProgress.updateSyncProgress.mockImplementation(async (entity: string, updates: Record<string, unknown>) => {
      const store = (mockSyncProgress as unknown as { _store: Map<string, Record<string, unknown>> })._store;
      const existing = store.get(entity) ?? {};
      store.set(entity, { ...existing, ...updates });
    });
    mockSyncProgress.getSyncProgress.mockImplementation(async (entity: string) => {
      const store = (mockSyncProgress as unknown as { _store: Map<string, Record<string, unknown>> })._store;
      return store.get(entity) ?? null;
    });
    mockStateStore.getState.mockImplementation(async (_db: unknown, key: string) => {
      const store = (mockStateStore as unknown as { _store: Map<string, string> })._store;
      return store.get(key) ?? null;
    });
    mockStateStore.setState.mockImplementation(async (_db: unknown, key: string, value: string) => {
      const store = (mockStateStore as unknown as { _store: Map<string, string> })._store;
      store.set(key, value);
    });
    mockStateStore._clear();
    mockSyncProgress._clear();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDbGetAllFoodEntries.mockResolvedValue([]);
    mockApiSyncPullEntity.mockResolvedValue(pullResult([]));
    mgr = new SyncRehydrationManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────
  // isDeviceSyncedBefore (3 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('isDeviceSyncedBefore', () => {
    it('returns true when state is "1"', async () => {
      mockStateStore._set('device_initial_synced', '1');
      await expect(mgr.isDeviceSyncedBefore()).resolves.toBe(true);
    });

    it('returns false when state is not "1"', async () => {
      mockStateStore._set('device_initial_synced', '0');
      await expect(mgr.isDeviceSyncedBefore()).resolves.toBe(false);
    });

    it('returns false when openDatabase throws', async () => {
      const { openDatabase } = await import('../../db/schema');
      vi.mocked(openDatabase).mockRejectedValueOnce(new Error('db init failed'));
      await expect(mgr.isDeviceSyncedBefore()).resolves.toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // rehydrateFromDb (10 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('rehydrateFromDb', () => {
    it('populates empty arrays for all entities when database is empty', async () => {
      const patch = await mgr.rehydrateFromDb();
      // Each entity gets an empty array even with no rows
      expect(patch.habits).toEqual([]);
      expect(patch.reflections).toEqual([]);
      expect(patch.foodLog).toEqual([]);
      // Food uses dbGetAllFoodEntries which returns []
      expect(Array.isArray(patch.foodLog)).toBe(true);
    });

    it('only queries requested entities subset', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 'h1', name: 'test' }]);
      await mgr.rehydrateFromDb(['habit']);
      expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('habits'),
      );
    });

    it('food entities are sorted by timestamp descending', async () => {
      mockDbGetAllFoodEntries.mockResolvedValue([
        { id: 'f1', timestamp: 100 },
        { id: 'f2', timestamp: 300 },
        { id: 'f3', timestamp: 200 },
      ]);

      const patch = await mgr.rehydrateFromDb(['food']);
      const foodLog = patch.foodLog as Record<string, unknown>[];
      expect(foodLog).toHaveLength(3);
      expect(foodLog[0].id).toBe('f2');
      expect(foodLog[1].id).toBe('f3');
      expect(foodLog[2].id).toBe('f1');
    });

    it('aiConfig maps to aiMode and aiModels top-level keys', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        { config_id: 'self', mode: 'smart', models: ['gpt-4'] },
      ]);

      const patch = await mgr.rehydrateFromDb(['aiConfig']);
      expect(patch.aiMode).toBe('smart');
      expect(patch.aiModels).toEqual(['gpt-4']);
    });

    it('userProfile maps as single object (not array)', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 'u1', name: 'Alice' }]);

      const patch = await mgr.rehydrateFromDb(['profile']);
      expect(patch.userProfile).toEqual({ id: 'u1', name: 'Alice' });
      expect(Array.isArray(patch.userProfile)).toBe(false);
    });

    it('silently handles computePlanProgress dynamic import failure', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([{ id: 'p1', deleted: 0 }]);

      // Temporarily break computePlanProgress to simulate import failure
      const originalImpl = mockComputePlanProgress.getMockImplementation();
      mockComputePlanProgress.mockImplementation(() => { throw new Error('module not found'); });

      const patch = await mgr.rehydrateFromDb(['plan']);
      expect(patch.plans).toEqual([{ id: 'p1', deleted: 0 }]);

      if (originalImpl) mockComputePlanProgress.mockImplementation(originalImpl);
    });

    it('calls computePlanProgress for non-deleted plans', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        { id: 'p1', deleted: 0, name: 'Plan A' },
        { id: 'p2', deleted: 1, name: 'Deleted Plan' },
      ]);

      const patch = await mgr.rehydrateFromDb(['plan']);
      const plans = patch.plans as Record<string, unknown>[];
      // Non-deleted plan should have progress
      expect(plans[0].progress).toBe(0.5);
      // computePlanProgress called only for p1 (non-deleted)
      expect(mockComputePlanProgress).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
      );
    });

    it('failed entity query does not interrupt other entities', async () => {
      mockDb.getAllAsync
        .mockRejectedValueOnce(new Error('table missing'))
        .mockResolvedValueOnce([{ id: 'r1' }]);

      const patch = await mgr.rehydrateFromDb(['habit', 'reflection']);
      expect(patch.habits).toBeUndefined();
      expect(patch.reflections).toEqual([{ id: 'r1' }]);
    });

    it('all entity types have correct storeKey mapping', async () => {
      const testCases: [string, string][] = [
        ['habit', 'habits'],
        ['fasting', 'fastingHistory'],
        ['checkin', 'checkinHistory'],
        ['exercise', 'exerciseLog'],
        ['meditation', 'medHistory'],
        ['plan', 'plans'],
        ['planItem', 'planItems'],
        ['planItemCheckin', 'planItemCheckins'],
        ['grace', 'graceHistory'],
        ['dailyCustomTodo', 'dailyCustomTodos'],
        ['dailyTodoHistory', 'dailyTodoHistory'],
        ['thoughtTrail', 'thoughtTrails'],
        ['trailNote', 'trailNotes'],
        ['reflectionLink', 'reflectionLinks'],
        ['checkinReview', 'checkinReviews'],
        ['bodyGoal', 'bodyGoals'],
        ['bodyPlan', 'bodyPlans'],
        ['weightRecord', 'weightRecords'],
        ['bodyCheckin', 'bodyCheckins'],
        ['sleep', 'sleepHistory'],
        ['give', 'giveHistory'],
        ['motivationEntry', 'motivationLog'],
        ['customWuxing', 'customWuxingMaps'],
        ['vision', 'visions'],
        ['visionPractice', 'visionPractices'],
        ['dedication', 'dedications'],
        ['mantraDef', 'mantraDefs'],
        ['mantraSession', 'mantraSessions'],
        ['fearEntry', 'fearEntries'],
        ['courageEntry', 'courageEntries'],
        ['fearAchievement', 'achievements'],
        ['sutraReading', 'readingSessions'],
        ['breath', 'breathHistory'],
        ['zhiguanSession', 'sessions'],
      ];

      for (const [entity, storeKey] of testCases) {
        mockDb.getAllAsync.mockResolvedValueOnce([{ id: 'x1' }]);
        const patch = await mgr.rehydrateFromDb([entity]);
        const value = patch[storeKey] as Record<string, unknown>[];
        expect(value).toHaveLength(1);
        expect(value[0].id).toBe('x1');
      }
    });

    it('rehydrates all entities when no entities argument passed', async () => {
      mockDb.getAllAsync.mockImplementation(async () => [{ id: 'x' }]);
      mockDbGetAllFoodEntries.mockResolvedValue([{ id: 'f1', timestamp: 1 }]);

      const patch = await mgr.rehydrateFromDb();
      expect(Object.keys(patch).length).toBeGreaterThan(10);
      expect(patch.foodLog).toBeDefined();
      expect(patch.userProfile).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // lazyRehydrate (3 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('lazyRehydrate', () => {
    it('returns immediately when onChanges is null', async () => {
      await mgr.lazyRehydrate('habit', null);
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('calls onChanges when patch is non-empty', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 'h1' }]);
      const onChanges = vi.fn();
      await mgr.lazyRehydrate('habit', onChanges);
      expect(onChanges).toHaveBeenCalledWith(
        expect.objectContaining({ habits: [{ id: 'h1' }] }),
      );
    });

    it('does not call onChanges when patch is empty (unknown entity)', async () => {
      // Unknown entity (not in REHYDRATE_MAP) produces null → no patch keys → onChanges not called
      const onChanges = vi.fn();
      await mgr.lazyRehydrate('nonexistent_entity', onChanges);
      expect(onChanges).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // initialSync (5 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('initialSync', () => {
    const token = 'test-token';
    const userId = 'user-1';
    const applyServerChanges = vi.fn().mockResolvedValue({});
    const isKickedOut = vi.fn().mockReturnValue(false);
    const onSyncingChange = vi.fn();

    beforeEach(() => {
      applyServerChanges.mockReset().mockResolvedValue({});
      isKickedOut.mockReset().mockReturnValue(false);
      onSyncingChange.mockReset();
    });

    it('returns "done" immediately when already synced', async () => {
      mockStateStore._set('initialSyncDone', 'true');
      const result = await mgr.initialSync(token, userId, applyServerChanges, isKickedOut, onSyncingChange);
      expect(result).toBe('done');
      expect(mockApiSyncPullEntity).not.toHaveBeenCalled();
    });

    it('pulls in two phases (priority entities first, then all)', async () => {
      const pulledEntities: string[] = [];
      mockApiSyncPullEntity.mockImplementation(async (_token, entity) => {
        pulledEntities.push(entity);
        return pullResult([]);
      });

      await mgr.initialSync(token, userId, applyServerChanges, isKickedOut);

      // Phase 1 entities appear before phase 2 entities
      const phase1 = ['profile', 'checkin', 'habit', 'grace'];
      const phase1Indices = phase1.map(e => pulledEntities.indexOf(e));
      const lastPhase1 = Math.max(...phase1Indices);

      for (const e of phase1) {
        expect(pulledEntities.indexOf(e)).toBeGreaterThanOrEqual(0);
      }

      // Phase 2 entities come after phase 1
      for (const e of ['reflection', 'fasting', 'food']) {
        const idx = pulledEntities.indexOf(e);
        if (idx >= 0) expect(idx).toBeGreaterThan(lastPhase1);
      }
    });

    it('sets correct state flags for each phase', async () => {
      await mgr.initialSync(token, userId, applyServerChanges, isKickedOut);

      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'initialSyncPhase', '2');
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'device_initial_synced', '1');
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'initialSyncDone', 'true');
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'initialSyncPhase', 'done');
    });

    it('calls onInitialSyncingChange in try/finally block', async () => {
      await mgr.initialSync(token, userId, applyServerChanges, isKickedOut, onSyncingChange);
      expect(onSyncingChange).toHaveBeenCalledWith(true);
      expect(onSyncingChange).toHaveBeenCalledWith(false);
    });

    it('re-throws when isKickedOut returns true', async () => {
      mockApiSyncPullEntity.mockRejectedValue(new Error('kicked'));
      isKickedOut.mockReturnValue(true);

      await expect(
        mgr.initialSync(token, userId, applyServerChanges, isKickedOut),
      ).rejects.toThrow('kicked');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // resumeInitialSync (4 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('resumeInitialSync', () => {
    const token = 'test-token';
    const userId = 'user-1';
    const applyServerChanges = vi.fn().mockResolvedValue({});
    const isKickedOut = vi.fn().mockReturnValue(false);

    it('returns immediately when initialSyncDone is "true"', async () => {
      mockStateStore._set('initialSyncDone', 'true');
      await mgr.resumeInitialSync(token, userId, applyServerChanges, isKickedOut);
      expect(mockApiSyncPullEntity).not.toHaveBeenCalled();
    });

    it('skips entities with status "done"', async () => {
      mockSyncProgress._setProgress('habit', { status: 'done' });
      mockSyncProgress._setProgress('profile', { status: 'done' });

      await mgr.resumeInitialSync(token, userId, applyServerChanges, isKickedOut);

      const pulledEntities = mockApiSyncPullEntity.mock.calls.map(c => c[1]);
      expect(pulledEntities).not.toContain('habit');
      expect(pulledEntities).not.toContain('profile');
    });

    it('infers correct phase for entities with no progress record', async () => {
      const phases: { entity: string; phase: number }[] = [];

      mockSyncProgress.updateSyncProgress.mockImplementation(async (entity: string, updates: Record<string, unknown>) => {
        if (updates.phase != null) {
          phases.push({ entity, phase: updates.phase as number });
        }
      });
      mockApiSyncPullEntity.mockResolvedValue(pullResult([]));

      await mgr.resumeInitialSync(token, userId, applyServerChanges, isKickedOut);

      const profile = phases.find(e => e.entity === 'profile');
      expect(profile?.phase).toBe(1);

      const reflection = phases.find(e => e.entity === 'reflection');
      expect(reflection?.phase).toBe(2);

      const plan = phases.find(e => e.entity === 'plan');
      expect(plan?.phase).toBe(3);
    });

    it('sets final state after all entities complete', async () => {
      await mgr.resumeInitialSync(token, userId, applyServerChanges, isKickedOut);
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'initialSyncDone', 'true');
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'initialSyncPhase', 'done');
      expect(mockStateStore.setState).toHaveBeenCalledWith(mockDb, 'device_initial_synced', '1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // pullEntityWithRetry — private, accessed via bracket notation (6 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('pullEntityWithRetry', () => {
    const token = 'test-token';
    const userId = 'user-1';
    const applyServerChanges = vi.fn().mockResolvedValue({});
    const isKickedOut = vi.fn().mockReturnValue(false);

    function pull(entity: string, phase: number) {
      return (mgr as unknown as Record<string, (...args: unknown[]) => Promise<void>>)
        .pullEntityWithRetry(entity, phase, token, userId, applyServerChanges, isKickedOut);
    }

    beforeEach(() => {
      vi.useFakeTimers();
      applyServerChanges.mockReset().mockResolvedValue({});
      isKickedOut.mockReset().mockReturnValue(false);
    });

    it('paginates until hasMore=false', async () => {
      mockApiSyncPullEntity
        .mockResolvedValueOnce(pullResult([{ id: '1' }], true, 3))
        .mockResolvedValueOnce(pullResult([{ id: '2' }], true, 3))
        .mockResolvedValueOnce(pullResult([{ id: '3' }], false, 3));

      const p = pull('habit', 2);
      await vi.advanceTimersByTimeAsync(0);
      await p;

      expect(mockApiSyncPullEntity).toHaveBeenCalledTimes(3);
      expect(mockApiSyncPullEntity).toHaveBeenNthCalledWith(1, token, 'habit', 1, 200, userId);
      expect(mockApiSyncPullEntity).toHaveBeenNthCalledWith(2, token, 'habit', 2, 200, userId);
      expect(mockApiSyncPullEntity).toHaveBeenNthCalledWith(3, token, 'habit', 3, 200, userId);
    });

    it('marks status=done and returns on empty data', async () => {
      mockApiSyncPullEntity.mockResolvedValueOnce(pullResult([]));

      const p = pull('habit', 2);
      await vi.advanceTimersByTimeAsync(0);
      await p;

      const progress = await mockSyncProgress.getSyncProgress('habit');
      expect(progress).toMatchObject({ status: 'done' });
    });

    it('respects MAX_PAGES=50 safety limit', async () => {
      mockApiSyncPullEntity.mockResolvedValue(pullResult([{ id: 'x' }], true, 10000));

      const p = pull('reflection', 2);
      for (let i = 0; i < 50; i++) {
        await vi.advanceTimersByTimeAsync(0);
      }
      await p;

      expect(mockApiSyncPullEntity).toHaveBeenCalledTimes(50);
    });

    it('phase-1: retries up to 2 times with linear backoff', async () => {
      mockApiSyncPullEntity
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockResolvedValueOnce(pullResult([{ id: 'ok' }]));

      const p = pull('profile', 1);

      // attempt 1 → fail
      await vi.advanceTimersByTimeAsync(0);
      // linear backoff: 1000 * 1 = 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      // attempt 2 → fail
      await vi.advanceTimersByTimeAsync(0);
      // linear backoff: 1000 * 2 = 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      // attempt 3 → success
      await vi.advanceTimersByTimeAsync(0);

      await p;
      expect(mockApiSyncPullEntity).toHaveBeenCalledTimes(3);
    });

    it('phase-2+: retries up to 4 times with exponential backoff', async () => {
      mockApiSyncPullEntity
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockRejectedValueOnce(new Error('fail-3'))
        .mockRejectedValueOnce(new Error('fail-4'))
        .mockResolvedValueOnce(pullResult([{ id: 'ok' }]));

      const p = pull('reflection', 2);

      // Exponential backoff: attempt=1→2s, attempt=2→4s, attempt=3→8s, attempt=4→16s
      for (let i = 1; i <= 4; i++) {
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000);
      }
      await vi.advanceTimersByTimeAsync(0);

      await p;
      expect(mockApiSyncPullEntity).toHaveBeenCalledTimes(5);
    });

    it('isKickedOut error propagates immediately', async () => {
      const kickErr = new Error('kicked');
      mockApiSyncPullEntity.mockRejectedValue(kickErr);
      isKickedOut.mockReturnValue(true);

      // Start the pull — kickErr will be thrown on first attempt
      const p = pull('habit', 2).catch((e: Error) => e);
      await vi.advanceTimersByTimeAsync(0);

      const result = await p;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('kicked');
      // Only 1 call — no retry after kicked out
      expect(mockApiSyncPullEntity).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // pullEntitiesParallel — private, accessed via bracket notation (4 tests)
  // ─────────────────────────────────────────────────────────────────

  describe('pullEntitiesParallel', () => {
    const token = 'test-token';
    const userId = 'user-1';
    const applyServerChanges = vi.fn().mockResolvedValue({});
    const isKickedOut = vi.fn().mockReturnValue(false);

    function pullParallel(entities: string[], concurrency: number, phase: number) {
      return (mgr as unknown as Record<string, (...args: unknown[]) => Promise<void>>)
        .pullEntitiesParallel(entities, concurrency, phase, token, userId, applyServerChanges, isKickedOut);
    }

    beforeEach(() => {
      vi.useFakeTimers();
      applyServerChanges.mockReset().mockResolvedValue({});
      isKickedOut.mockReset().mockReturnValue(false);
    });

    it('skips entities with status "done"', async () => {
      mockSyncProgress._setProgress('habit', { status: 'done' });

      const p = pullParallel(['habit', 'reflection'], 1, 1);
      await vi.advanceTimersByTimeAsync(0);
      await p;

      const pulledEntities = mockApiSyncPullEntity.mock.calls.map(c => c[1]);
      expect(pulledEntities).not.toContain('habit');
    });

    it('respects concurrency limit', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      mockApiSyncPullEntity.mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise<void>(resolve => { setTimeout(resolve, 100); });
        currentConcurrent--;
        return pullResult([]);
      });

      const p = pullParallel(['profile', 'checkin', 'habit', 'grace'], 2, 1);
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }
      await p;

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('completes after all workers finish', async () => {
      const entities = ['profile', 'checkin', 'habit', 'grace'];
      const p = pullParallel(entities, 1, 1);
      await vi.advanceTimersByTimeAsync(0);
      await p;

      const pulledEntities = mockApiSyncPullEntity.mock.calls.map(c => c[1]);
      for (const e of entities) {
        expect(pulledEntities).toContain(e);
      }
    });

    it('consumes entities from the queue correctly', async () => {
      const consumed: string[] = [];
      mockApiSyncPullEntity.mockImplementation(async (_token, entity) => {
        consumed.push(entity);
        return pullResult([]);
      });

      const entities = ['profile', 'checkin', 'habit', 'grace'];
      const p = pullParallel(entities, 2, 1);
      await vi.advanceTimersByTimeAsync(0);
      await p;

      expect(consumed.sort()).toEqual(['checkin', 'grace', 'habit', 'profile']);
    });
  });
});
