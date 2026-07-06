import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import { createDietSlice } from './createDietSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    foodLog: [],
    calGoal: 2000,
    customFoodPresets: [],
    recycleBin: [],
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

const mockSync = vi.fn();

const makeFood = (overrides: Record<string, unknown> = {}) => ({
  id: 'food-1',
  name: '米饭',
  cal: 200,
  unit: '碗',
  date: '2026-07-06',
  time: '12:00',
  category: 'staple',
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

describe('createDietSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addFood', () => {
    it('adds a food entry to foodLog', () => {
      const store = makeTestStore();
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });

      expect(store.state().foodLog).toHaveLength(1);
      expect(store.state().foodLog[0].name).toBe('米饭');
      expect(store.state().foodLog[0].cal).toBe(200);
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('food', expect.any(String), expect.objectContaining({ name: '米饭' }));
      expect(mockSync).toHaveBeenCalled();
    });

    it('generates unique id for each entry', () => {
      const store = makeTestStore();
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });
      slice.addFood({ name: '面条', cal: 250, unit: '碗', date: '2026-07-06', time: '18:00', category: 'staple' });

      expect(store.state().foodLog).toHaveLength(2);
      expect(store.state().foodLog[0].id).not.toBe(store.state().foodLog[1].id);
    });
  });

  describe('deleteFood', () => {
    it('soft-deletes a food entry', () => {
      const store = makeTestStore({ foodLog: [makeFood()] });
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteFood('food-1');

      expect(store.state().foodLog[0].deleted).toBe(true);
      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('food', 'food-1');
      expect(mockSync).toHaveBeenCalled();
    });

    it('adds deleted food to recycleBin', () => {
      const store = makeTestStore({ foodLog: [makeFood()] });
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteFood('food-1');

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].entityType).toBe('food');
    });
  });

  describe('setCalGoal', () => {
    it('sets calorie goal', () => {
      const store = makeTestStore();
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.setCalGoal(2500);

      expect(store.state().calGoal).toBe(2500);
    });

    it('enforces minimum of 100', () => {
      const store = makeTestStore();
      const slice = createDietSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.setCalGoal(50);

      expect(store.state().calGoal).toBe(100);
    });
  });
});
