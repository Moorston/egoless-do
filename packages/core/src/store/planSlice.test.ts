// @deprecated — Superseded by createPlanSlice.test.ts. Remove after verifying coverage.
// ─── Plan slice tests ──────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlanSlice } from './createPlanSlice';
import type { StorageAdapter, PlanSlice } from './types';

vi.mock('../logger', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

function createMockAdapter(): StorageAdapter {
  return {
    persistChange: vi.fn().mockResolvedValue(undefined),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  };
}

function createStore(initial: Partial<PlanSlice> = {}) {
  const state: Record<string, unknown> = {
    plans: [], planItems: [], planItemCheckins: [],
    dailyCustomTodos: [], dailyTodoHistory: [], reflections: [], thoughtTrails: [],
    ...initial,
  };
  return {
    set: (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch),
    get: () => state as any,
    state,
  };
}

describe('createPlanSlice', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('addPlan creates a new not_started plan when start date is future', () => {
    const store = createStore();
    const slice = createPlanSlice(adapter)(store.set as any, store.get as any, {} as any);
    const id = slice.addPlan({ name: 'Test Plan', goal: 'Learn', startDate: '2026-12-01', endDate: '2026-12-31' });

    expect(id).toBeTruthy();
    const plans = store.state.plans as any[];
    expect(plans).toHaveLength(1);
    expect(plans[0].name).toBe('Test Plan');
    expect(plans[0].status).toBe('not_started');
    expect(adapter.persistChange).toHaveBeenCalledWith('plan', id, expect.any(Object));
  });

  it('addPlan returns empty string if active plan exists', () => {
    const store = createStore({ plans: [{ id: 'p1', name: 'Active', status: 'in_progress', deleted: false }] });
    const slice = createPlanSlice(adapter)(store.set as any, store.get as any, {} as any);
    const id = slice.addPlan({ name: 'New', goal: 'Goal', startDate: '2026-01-01', endDate: '2026-01-31' });

    expect(id).toBe('');
    expect(store.state.plans).toHaveLength(1);
  });

  it('updatePlan modifies existing plan', () => {
    const store = createStore({ plans: [{ id: 'p1', name: 'Old', status: 'draft', deleted: false, updatedAt: 100 }] });
    const slice = createPlanSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.updatePlan('p1', { name: 'New' });

    const plans = store.state.plans as any[];
    expect(plans[0].name).toBe('New');
    expect(adapter.persistChange).toHaveBeenCalled();
  });

  it('deletePlan soft-deletes not_started plan', () => {
    const store = createStore({
      plans: [{ id: 'p1', name: 'Test', status: 'not_started', deleted: false, updatedAt: 100 }],
      planItems: [], planItemCheckins: [],
    });
    const slice = createPlanSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.deletePlan('p1');

    const plans = store.state.plans as any[];
    expect(plans[0].deleted).toBe(true);
    expect(store.state.recycleBin).toBeDefined();
  });

  it('deletePlan does nothing for in_progress plan', () => {
    const store = createStore({
      plans: [{ id: 'p1', name: 'Active', status: 'in_progress', deleted: false, updatedAt: 100 }],
      planItems: [], planItemCheckins: [],
    });
    const slice = createPlanSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.deletePlan('p1');

    const plans = store.state.plans as any[];
    expect(plans[0].deleted).toBe(false);
  });
});
