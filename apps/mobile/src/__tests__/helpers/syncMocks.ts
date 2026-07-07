// ─── Shared sync test mocks ──────────────────────────────────────────
// Provides reusable mock factories for the sync subsystem tests.
// Import and call these in individual test files after vi.mock() setup.

import { vi } from 'vitest';

// ── Mock DB handle ──────────────────────────────────────────────────

export function createMockDb() {
  return {
    getAllAsync: vi.fn().mockResolvedValue([]),
    getFirstAsync: vi.fn().mockResolvedValue(null),
    runAsync: vi.fn().mockResolvedValue({ changes: 1 }),
    execAsync: vi.fn().mockResolvedValue(undefined),
    getAllSync: vi.fn().mockReturnValue([]),
    getFirstSync: vi.fn().mockReturnValue(null),
    runSync: vi.fn().mockReturnValue({ changes: 1 }),
  };
}

export type MockDb = ReturnType<typeof createMockDb>;

// ── Mock row mappers (identity — return row as-is) ──────────────────
// Use vi.mock('../../store/rowMappers') with this object to bypass
// the real buildRowToEntity pipeline. Each mapper is a pass-through.

export function createMockRowMappers() {
  const identity = <T>(row: T) => row;
  return {
    rowToHabit: identity,
    rowToReflection: identity,
    rowToFasting: identity,
    rowToFood: identity,
    rowToCheckin: identity,
    rowToExercise: identity,
    rowToMeditation: identity,
    rowToProfile: identity,
    rowToPlan: identity,
    rowToPlanItem: identity,
    rowToPlanItemCheckin: identity,
    rowToGrace: identity,
    rowToDailyCustomTodo: identity,
    rowToDailyTodoHistory: identity,
    rowToThoughtTrail: identity,
    rowToTrailNote: identity,
    rowToReflectionLink: identity,
    rowToAIConfig: identity,
    rowToCheckinReview: identity,
    rowToBodyGoal: identity,
    rowToBodyPlan: identity,
    rowToWeightRecord: identity,
    rowToBodyCheckin: identity,
    rowToSleep: identity,
    rowToGive: identity,
    rowToMotivationEntry: identity,
    rowToCustomWuxing: identity,
    rowToVision: identity,
    rowToVisionPractice: identity,
    rowToDedication: identity,
    rowToMantraDef: identity,
    rowToMantraSession: identity,
    rowToFearEntry: identity,
    rowToCourageEntry: identity,
    rowToFearAchievement: identity,
    rowToSutraReading: identity,
    rowToBreath: identity,
    rowToZhiguanSession: identity,
  };
}

// ── Mock sync progress store ────────────────────────────────────────

export function createMockSyncProgressStore() {
  const store = new Map<string, Record<string, unknown>>();

  return {
    getSyncProgress: vi.fn(async (entity: string) => store.get(entity) ?? null),
    updateSyncProgress: vi.fn(async (entity: string, updates: Record<string, unknown>) => {
      const existing = store.get(entity) ?? {};
      store.set(entity, { ...existing, ...updates });
    }),
    /** Test helper: set progress directly */
    _setProgress(entity: string, data: Record<string, unknown>) {
      store.set(entity, data);
    },
    /** Test helper: get all progress */
    _getAll() {
      return Object.fromEntries(store);
    },
    /** Test helper: clear all progress */
    _clear() {
      store.clear();
    },
  };
}

// ── Mock state store (getState/setState) ────────────────────────────

export function createMockStateStore() {
  const store = new Map<string, string>();

  return {
    getState: vi.fn(async (_db: unknown, key: string) => store.get(key) ?? null),
    setState: vi.fn(async (_db: unknown, key: string, value: string) => {
      store.set(key, value);
    }),
    /** Test helper */
    _set(key: string, value: string) { store.set(key, value); },
    /** Test helper */
    _get(key: string) { return store.get(key); },
    /** Test helper */
    _clear() { store.clear(); },
  };
}

// ── Mock apiSyncPullEntity ──────────────────────────────────────────

export function createMockApiSyncPullEntity() {
  return vi.fn(async (_token: string, _entity: string, _page: number, _limit: number, _userId?: string) => ({
    data: [] as Record<string, unknown>[],
    hasMore: false,
    total: 0,
  }));
}

// ── Convenience: create all sync mocks at once ──────────────────────

export function createAllSyncMocks() {
  return {
    db: createMockDb(),
    rowMappers: createMockRowMappers(),
    syncProgress: createMockSyncProgressStore(),
    stateStore: createMockStateStore(),
    apiSyncPullEntity: createMockApiSyncPullEntity(),
  };
}
