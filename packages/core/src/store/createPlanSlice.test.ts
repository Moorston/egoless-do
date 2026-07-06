import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import { createPlanSlice } from './createPlanSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    plans: [],
    planItems: [],
    planItemCheckins: [],
    dailyCustomTodos: [],
    dailyTodoHistory: [],
    recycleBin: [],
    reflections: [],
    reflectionLinks: [],
    ...initialState,
  };
  const set = (fn: unknown) => {
    const patch = typeof fn === 'function' ? (fn as (s: typeof state) => typeof state)(state) : fn;
    state = { ...state, ...(patch as Record<string, unknown>) };
  };
  const get = () => state;
  const api = { setState: set, getState: get, getInitialState: () => state, subscribe: () => () => {}, destroy: () => {} } as any;
  return { state: () => state, set, get: get as any, api };
}

const mockAdapter = {
  persistChange: vi.fn().mockResolvedValue(undefined),
  markDeleted: vi.fn().mockResolvedValue(undefined),
  batchDelete: vi.fn().mockResolvedValue(undefined),
};

const makePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'plan-1',
  name: '测试计划',
  description: '测试描述',
  status: 'not_started' as const,
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  priority: 'medium' as const,
  progress: 0,
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

const makePlanItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'item-1',
  planId: 'plan-1',
  name: '测试任务',
  description: '',
  status: 'pending' as const,
  source: 'manual' as const,
  completedCount: 0,
  targetCount: 1,
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

describe('createPlanSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addPlan', () => {
    it('adds a new plan', () => {
      const store = makeTestStore();
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      const planId = slice.addPlan({ name: '新计划', startDate: '2026-07-01', endDate: '2026-07-31', priority: 'medium' });

      expect(planId).toBeTruthy();
      expect(store.state().plans).toHaveLength(1);
      expect(store.state().plans[0].name).toBe('新计划');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('updatePlan', () => {
    it('updates an existing plan', () => {
      const store = makeTestStore({ plans: [makePlan()] });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.updatePlan('plan-1', { name: '更新后的计划' });

      expect(store.state().plans[0].name).toBe('更新后的计划');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('deletePlan', () => {
    it('soft-deletes a plan when status allows', () => {
      const store = makeTestStore({ plans: [makePlan({ status: 'not_started' })] });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.deletePlan('plan-1');

      // Plan should be deleted (moved to recycleBin)
      expect(store.state().plans.find((p: any) => p.id === 'plan-1' && !p.deleted)).toBeUndefined();
    });
  });

  describe('startPlan', () => {
    it('changes plan status to in_progress', () => {
      const store = makeTestStore({ plans: [makePlan()] });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.startPlan('plan-1');

      expect(store.state().plans[0].status).toBe('in_progress');
    });
  });

  describe('addPlanItem', () => {
    it('adds a plan item', () => {
      const store = makeTestStore({ plans: [makePlan({ status: 'in_progress' })] });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.addPlanItem({ planId: 'plan-1', name: '新任务' });

      expect(store.state().planItems).toHaveLength(1);
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('deletePlanItem', () => {
    it('soft-deletes a plan item', () => {
      const store = makeTestStore({
        plans: [makePlan({ status: 'in_progress' })],
        planItems: [makePlanItem()],
      });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.deletePlanItem('item-1');

      expect(store.state().planItems.find((i: any) => i.id === 'item-1' && !i.deleted)).toBeUndefined();
    });
  });

  describe('addDailyCustomTodo', () => {
    it('adds a custom todo', () => {
      const store = makeTestStore({ plans: [makePlan({ status: 'in_progress' })] });
      const slice = createPlanSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.addDailyCustomTodo({ name: '自定义任务', planId: 'plan-1' });

      expect(store.state().dailyCustomTodos).toHaveLength(1);
    });
  });
});
