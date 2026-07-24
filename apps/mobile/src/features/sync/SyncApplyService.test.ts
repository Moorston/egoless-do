// ─── SyncApplyService tests ──────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';

// DOMException polyfill for test environment
class TestDOMException extends Error {
  constructor(message?: string, name?: string) {
    super(message);
    this.name = name ?? 'DOMException';
  }
}

// ── Known entity keys (mirrors entities in SyncApplyService) ─────────
const { MOCK_SCHEMAS } = vi.hoisted(() => {
  const keys = [
    'habit', 'reflection', 'fasting', 'food', 'checkin', 'exercise',
    'meditation', 'profile', 'plan', 'planItem', 'planItemCheckin',
    'grace', 'dailyCustomTodo', 'dailyTodoHistory', 'thoughtTrail',
    'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview',
    'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep',
    'give', 'motivationEntry', 'customWuxing', 'vision', 'visionPractice',
    'dedication', 'mantraDef', 'mantraSession', 'sutraReading',
    'fearEntry', 'courageEntry', 'fearAchievement', 'breath', 'zhiguanSession',
    'foodPreset',
  ];
  const schemas: Record<string, { sqlite: { table: string; pk: string } }> = Object.fromEntries(
    keys.map(k => [k, { sqlite: { table: `${k}_table`, pk: 'id' } }]),
  );
  return { MOCK_SCHEMAS: schemas };
});

// ── Mock DB (hoisted so vi.mock can reference it) ────────────────────
const { mockDb } = vi.hoisted(() => {
  const db = {
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    runAsync: vi.fn().mockResolvedValue({ changes: 1 }),
    execAsync: vi.fn().mockResolvedValue(undefined),
    getAllSync: vi.fn().mockReturnValue([]),
    getFirstSync: vi.fn().mockReturnValue(null),
    runSync: vi.fn().mockReturnValue({ changes: 1 }),
  };
  return { mockDb: db };
});

vi.mock('../../db/schema', () => ({
  openDatabase: vi.fn().mockResolvedValue(mockDb),
  withDbLock: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('../../store/rowMappers', () => {
  const identity = <T>(row: T) => row;
  return {
    rowToHabit: identity, rowToReflection: identity, rowToFasting: identity,
    rowToFood: identity, rowToCheckin: identity, rowToExercise: identity,
    rowToMeditation: identity, rowToProfile: identity, rowToPlan: identity,
    rowToPlanItem: identity, rowToPlanItemCheckin: identity,
    rowToGrace: identity, rowToDailyCustomTodo: identity,
    rowToDailyTodoHistory: identity, rowToThoughtTrail: identity,
    rowToTrailNote: identity, rowToReflectionLink: identity,
    rowToAIConfig: identity, rowToCheckinReview: identity,
    rowToBodyGoal: identity, rowToBodyPlan: identity,
    rowToWeightRecord: identity, rowToBodyCheckin: identity,
    rowToSleep: identity, rowToGive: identity,
    rowToMotivationEntry: identity, rowToCustomWuxing: identity,
    rowToVision: identity, rowToVisionPractice: identity,
    rowToDedication: identity, rowToMantraDef: identity,
    rowToMantraSession: identity, rowToFearEntry: identity,
    rowToCourageEntry: identity, rowToFearAchievement: identity,
    rowToSutraReading: identity, rowToBreath: identity,
    rowToZhiguanSession: identity,
    rowToFoodPreset: identity,
  };
});

vi.mock('@egoless-do/core', () => ({
  SCHEMAS: MOCK_SCHEMAS,
  buildServerPayloadToRow: () => (row: Record<string, unknown>) => {
    const { collection: _c, ...rest } = row as Record<string, unknown> & { collection?: unknown };
    return rest;
  },
  pbField: (r: Record<string, unknown>, key: string) => {
    const val = r[key];
    if (val !== undefined && val !== null) return val;
    const nested = r.data;
    if (nested && typeof nested === 'object') return (nested as Record<string, unknown>)[key];
    return undefined;
  },
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

// ── Import after mocks ───────────────────────────────────────────────
import {
  SyncApplyService,
  ENTITY_CONFIG,
  ENTITY_STORE_KEY,
  ENTITY_COLL_MAP,
} from './SyncApplyService';

// ── Helpers ──────────────────────────────────────────────────────────
function resetMockDb() {
  mockDb.getAllAsync.mockReset().mockResolvedValue([]);
  mockDb.runAsync.mockReset().mockResolvedValue({ changes: 1 });
}

// ── Tests ────────────────────────────────────────────────────────────
describe('SyncApplyService', () => {
  let svc: SyncApplyService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb();
    svc = new SyncApplyService();
  });

  // ── Pure method tests (4) ──────────────────────────────────────────
  describe('serverPayloadToRow', () => {
    it('returns transformed row for a known entity', () => {
      const payload = { id: 'abc', title: 'Test', collection: 'habits' };
      const row = svc.serverPayloadToRow('habit', payload);
      expect(row).not.toBeNull();
      expect(row!.id).toBe('abc');
      expect(row!.title).toBe('Test');
      // collection field is stripped by the mock converter
      expect((row as Record<string, unknown>).collection).toBeUndefined();
    });

    it('returns null for an unknown entity', () => {
      const row = svc.serverPayloadToRow('__nonexistent__', { id: 'x' });
      expect(row).toBeNull();
    });
  });

  describe('resolveEntityId', () => {
    it('resolves from pk field first', () => {
      const result = svc.resolveEntityId({ id: 'id-1', uuid: 'uuid-1', date: '2026-01-01' }, 'uuid');
      expect(result).toBe('uuid-1');
    });

    it('falls back to id when pk is missing', () => {
      const result = svc.resolveEntityId({ id: 'id-1', date: '2026-01-01' }, 'uuid');
      expect(result).toBe('id-1');
    });

    it('falls back to date when pk and id are missing', () => {
      const result = svc.resolveEntityId({ date: '2026-01-01' }, 'uuid');
      expect(result).toBe('2026-01-01');
    });

    it('uses explicit fallback when all fields are missing', () => {
      const result = svc.resolveEntityId({}, 'uuid', 'fallback-id');
      expect(result).toBe('fallback-id');
    });
  });

  describe('getRowMapper', () => {
    it('returns a mapper function for a known entity', () => {
      const mapper = svc.getRowMapper('habit');
      expect(mapper).toBeDefined();
      expect(typeof mapper).toBe('function');
    });

    it('returns undefined for an unknown entity', () => {
      const mapper = svc.getRowMapper('unknownEntity');
      expect(mapper).toBeUndefined();
    });
  });

  // ── Constants validation (3) ───────────────────────────────────────
  describe('ENTITY_CONFIG', () => {
    it('is derived from SCHEMAS and has table/pk for each key', () => {
      expect(ENTITY_CONFIG).toBeDefined();
      // Should contain all known entity keys
      expect(ENTITY_CONFIG.habit).toEqual({ table: 'habit_table', pk: 'id' });
      expect(ENTITY_CONFIG.plan).toEqual({ table: 'plan_table', pk: 'id' });
      expect(ENTITY_CONFIG.meditation).toEqual({ table: 'meditation_table', pk: 'id' });
      for (const [, cfg] of Object.entries(ENTITY_CONFIG)) {
        expect(cfg).toHaveProperty('table');
        expect(cfg).toHaveProperty('pk');
        expect(typeof cfg.table).toBe('string');
        expect(typeof cfg.pk).toBe('string');
      }
    });
  });

  describe('ENTITY_STORE_KEY', () => {
    it('has a store key mapping for non-special entities and excludes aiConfig', () => {
      expect(Object.keys(ENTITY_STORE_KEY).length).toBeGreaterThan(0);
      expect(ENTITY_STORE_KEY.habit).toBe('habits');
      expect(ENTITY_STORE_KEY.reflection).toBe('reflections');
      expect(ENTITY_STORE_KEY.plan).toBe('plans');
      expect(ENTITY_STORE_KEY.meditation).toBe('medHistory');
      expect(ENTITY_STORE_KEY.aiConfig).toBeUndefined();
    });
  });

  describe('ENTITY_COLL_MAP', () => {
    it('has a collection mapping for every table with non-empty values', () => {
      const entries = Object.entries(ENTITY_COLL_MAP);
      expect(entries.length).toBeGreaterThan(0);
      expect(ENTITY_COLL_MAP.habit_table).toBe('habit');
      expect(ENTITY_COLL_MAP.reflection_table).toBe('reflection');
      expect(ENTITY_COLL_MAP.fasting_table).toBe('fasting');
      expect(ENTITY_COLL_MAP.plan_table).toBe('plan');
      expect(ENTITY_COLL_MAP.aiConfig_table).toBe('aiConfig'); // aiConfig has PB override too
      // Verify PB_COLLECTION_OVERRIDES: ai_configs -> aiConfig
      expect(ENTITY_COLL_MAP.ai_configs).toBe('aiConfig');
      for (const [table, entity] of entries) {
        expect(typeof table).toBe('string');
        expect(typeof entity).toBe('string');
        expect(entity.length).toBeGreaterThan(0);
      }
    });
  });

  // ── applyServerChanges (10) ────────────────────────────────────────
  describe('applyServerChanges', () => {
    it('returns empty patch for null data', async () => {
      const result = await svc.applyServerChanges(null as unknown as Record<string, unknown[]>);
      expect(result).toEqual({});
    });

    it('returns empty patch for empty object', async () => {
      const result = await svc.applyServerChanges({});
      expect(result).toEqual({});
    });

    it('correctly splits alive and dead records', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [
          { id: 'h1', title: 'Morning Run' },
          { id: 'h2', title: 'Deleted Habit', deleted: true },
        ],
      };

      const result = await svc.applyServerChanges(data);

      // Only alive records are mapped to the store
      expect(result.habits).toBeDefined();
      expect((result.habits as unknown[]).length).toBe(1);
    });

    it('skips server record when local has newer updated_at (conflict resolution)', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        { id: 'h1', updated_at: 9999, deleted: 0 },
      ]);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [{ id: 'h1', title: 'Updated Title', updated_at: 100 }],
      };

      const result = await svc.applyServerChanges(data);

      // Server record skipped — nothing added to store patch
      expect(result.habits).toBeUndefined();
    });

    it('respects clockOffset sign when comparing local vs server updated_at', async () => {
      // clockOffset = serverTime - Date.now(). Device clock is behind server by 100ms.
      // local.updated_at (1000, device frame) == 1100 in server frame.
      // server updated_at = 1050. Local edit (1100) is NEWER than server (1050)
      // → server record must be skipped (local wins).
      // Regression guard for the sign-flip bug where `local - clockOffset` was used.
      mockDb.getAllAsync.mockResolvedValueOnce([
        { id: 'h1', updated_at: 1000, deleted: 0 },
      ]);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [{ id: 'h1', title: 'Server Title', updated_at: 1050 }],
      };

      const result = await svc.applyServerChanges(data, undefined, undefined, 100);

      // Local is newer in the server frame → server record skipped
      expect(result.habits).toBeUndefined();
    });

    it('applies server record when local is genuinely older under clock skew', async () => {
      // clockOffset = 100. local.updated_at = 900 (device) → 1000 (server frame).
      // server updated_at = 1050. Server is newer → apply server record.
      mockDb.getAllAsync.mockResolvedValueOnce([
        { id: 'h1', updated_at: 900, deleted: 0 },
      ]);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [{ id: 'h1', title: 'Server Title', updated_at: 1050 }],
      };

      const result = await svc.applyServerChanges(data, undefined, undefined, 100);

      expect(result.habits).toBeDefined();
      expect((result.habits as unknown[]).length).toBe(1);
    });

    it('applies server record when payload omits updated_at (server authoritative on missing timestamp)', async () => {
      // Local row exists and is "newer" by wall-clock, but the server payload has
      // no updated_at. We must NOT silently keep the stale local row — apply the
      // server data instead (M-2). Previously the missing timestamp defaulted to 0,
      // so adjustedLocalUpdated (9999) > 0 always held and the server record was
      // discarded.
      mockDb.getAllAsync.mockResolvedValueOnce([
        { id: 'h1', updated_at: 9999, deleted: 0 },
      ]);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [{ id: 'h1', title: 'Server Title (no timestamp)' }],
      };

      const result = await svc.applyServerChanges(data);

      expect(result.habits).toBeDefined();
      expect((result.habits as unknown[]).length).toBe(1);
    });

    it('skips records present in deletedIds (recycle bin)', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        habit: [{ id: 'h1', title: 'Recycled Habit' }],
      };
      const deletedIds = new Set(['h1']);

      const result = await svc.applyServerChanges(data, deletedIds);

      expect(result.habits).toBeUndefined();
    });

    it('falls back to INSERT when UPDATE returns 0 changes', async () => {
      mockDb.runAsync
        .mockResolvedValueOnce({ changes: 0 })  // UPDATE
        .mockResolvedValueOnce({ changes: 1 });  // INSERT

      const data = {
        habit: [{ id: 'h1', title: 'New Habit' }],
      };

      await svc.applyServerChanges(data);

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
      expect(mockDb.runAsync.mock.calls[0][0]).toContain('UPDATE');
      expect(mockDb.runAsync.mock.calls[1][0]).toContain('INSERT INTO');
    });

    it('calculates totalMedMinutes for meditation entity', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([])  // localMeta lookup
        .mockResolvedValueOnce([    // SELECT dur_min FROM meditation_history
          { dur_min: 10 },
          { dur_min: 20 },
          { dur_min: 30 },
        ]);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        meditation: [{ id: 'm1', dur_min: 15 }],
      };

      const result = await svc.applyServerChanges(data);

      expect(result.totalMedMinutes).toBe(60);
    });

    it('extracts aiMode and aiModels from the last aiConfig record', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        aiConfig: [
          { id: 'cfg1', mode: 'standard', models: { chat: 'gpt-4' } },
          { id: 'cfg2', mode: 'advanced', models: { chat: 'gpt-4o', vision: 'gpt-4v' } },
        ],
      };

      const result = await svc.applyServerChanges(data);

      expect(result.aiMode).toBe('advanced');
      expect(result.aiModels).toEqual({ chat: 'gpt-4o', vision: 'gpt-4v' });
    });

    it('throws on aborted signal at entity loop checkpoint', async () => {
      const controller = new AbortController();
      controller.abort();

      const data = {
        habit: [{ id: 'h1', title: 'Test' }],
      };

      await expect(
        svc.applyServerChanges(data, undefined, controller.signal),
      ).rejects.toThrow();
    });

    it('accumulates failed entities in _failedEntities and continues other entities', async () => {
      // The entity-level abort check (line 154) is OUTSIDE the try/catch block.
      // Only the per-record abort checks (lines 225, 272) are inside try/catch,
      // so they trigger _failedEntities accumulation instead of rejecting.
      // We use odd/even call counting: odd calls (entity-level) return false,
      // even calls (record-level) return true.
      let checks = 0;
      const fakeSignal = {
        get aborted() {
          checks++;
          return checks % 2 === 0; // even = true (record-level), odd = false (entity-level)
        },
        throwIfAborted(this: { aborted: boolean }) { if (this.aborted) throw new TestDOMException('Aborted', 'AbortError'); },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return true; },
        onabort: null,
        reason: undefined,
      } as unknown as AbortSignal;

      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data: Record<string, unknown[]> = {
        habit: [{ id: 'h1', title: 'Habit' }],
        plan: [{ id: 'p1', title: 'Plan' }],
      };

      const result = await svc.applyServerChanges(data, undefined, fakeSignal);

      // Both entities hit the per-record abort check (inside try/catch), which
      // throws DOMException inside applyEntityToTable. The throw propagates to
      // the entity-level catch in applyServerChanges, accumulating failures.
      expect(result._failedEntities).toBeDefined();
      expect(result._failedEntities).toContain('habit');
      expect(result._failedEntities).toContain('plan');
    });

    it('triggers 6 cascade UPDATE queries for plan entity delete', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const data = {
        plan: [{ id: 'p1', deleted: true }],
      };

      await svc.applyServerChanges(data);

      const allSql = mockDb.runAsync.mock.calls.map((c: unknown[]) => c[0] as string);

      const cascadeSqls = allSql.filter((s: string) =>
        s.includes('plan_items') ||
        s.includes('plan_item_checkins') ||
        s.includes('daily_custom_todos') ||
        s.includes('daily_todo_history') ||
        s.includes('mind_reflections') ||
        s.includes('thought_trails'),
      );
      expect(cascadeSqls.length).toBe(6);
    });
  });

  // ── markSyncedAndRemove (5) ────────────────────────────────────────
  describe('markSyncedAndRemove', () => {
    it('marks upserted and deleted records as synced=1', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await svc.markSyncedAndRemove(
        { habit: ['h1', 'h2'] },
        { plan: ['p1'] },
        [10, 11],
      );

      const allSql = mockDb.runAsync.mock.calls.map((c: unknown[]) => c[0] as string);

      const habitUpdate = allSql.find((s: string) => s.includes('habit_table') && s.includes('synced=1'));
      expect(habitUpdate).toBeDefined();

      const planUpdate = allSql.find((s: string) => s.includes('plan_table') && s.includes('deleted=1'));
      expect(planUpdate).toBeDefined();

      const queueDelete = allSql.find((s: string) => s.includes('DELETE FROM sync_queue'));
      expect(queueDelete).toBeDefined();
    });

    it('handles empty input gracefully (no-op)', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await svc.markSyncedAndRemove({}, {}, []);

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('calls onHasSyncedDeletes when deleted has entries', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });
      const callback = vi.fn();

      await svc.markSyncedAndRemove(
        {},
        { habit: ['h1'] },
        [],
        callback,
      );

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call onHasSyncedDeletes when deleted is empty', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });
      const callback = vi.fn();

      await svc.markSyncedAndRemove(
        { habit: ['h1'] },
        {},
        [1],
        callback,
      );

      expect(callback).not.toHaveBeenCalled();
    });

    it('catches and re-throws errors', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(
        svc.markSyncedAndRemove({ habit: ['h1'] }, {}, []),
      ).rejects.toThrow('DB write failed');
    });
  });
});
