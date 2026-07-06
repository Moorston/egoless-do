import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { createFoodSlice } from './createFoodSlice';

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
  persistSettings: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue(null),
  transaction: vi.fn().mockImplementation(async (cb: () => Promise<void>) => { await cb(); }),
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

describe('createFoodSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addFood', () => {
    it('adds a food entry to foodLog', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });

      expect(store.state().foodLog).toHaveLength(1);
      expect(store.state().foodLog[0].name).toBe('米饭');
      expect(store.state().foodLog[0].cal).toBe(200);
      expect(store.state().foodLog[0].id).toBeDefined();
      expect(store.state().foodLog[0].deleted).toBe(false);
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('food', expect.any(String), expect.objectContaining({ name: '米饭' }));
      expect(mockSync).toHaveBeenCalled();
    });

    it('prepends new entries (newest first)', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });
      slice.addFood({ name: '面条', cal: 250, unit: '碗', date: '2026-07-06', time: '18:00', category: 'staple' });

      expect(store.state().foodLog).toHaveLength(2);
      expect(store.state().foodLog[0].name).toBe('面条');
      expect(store.state().foodLog[1].name).toBe('米饭');
    });

    it('generates unique id for each entry', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });
      slice.addFood({ name: '面条', cal: 250, unit: '碗', date: '2026-07-06', time: '18:00', category: 'staple' });

      expect(store.state().foodLog[0].id).not.toBe(store.state().foodLog[1].id);
    });
  });

  describe('deleteFood', () => {
    it('soft-deletes a food entry', () => {
      const store = makeTestStore({ foodLog: [makeFood()] });
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.deleteFood('food-1');

      expect(store.state().foodLog[0].deleted).toBe(true);
      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('food', 'food-1');
      expect(mockSync).toHaveBeenCalled();
    });

    it('adds deleted food to recycleBin', () => {
      const store = makeTestStore({ foodLog: [makeFood()] });
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.deleteFood('food-1');

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].entityType).toBe('food');
      expect(store.state().recycleBin[0].id).toBe('food-1');
    });

    it('is a no-op for non-existent id', () => {
      const store = makeTestStore({ foodLog: [makeFood()] });
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.deleteFood('non-existent');

      expect(store.state().foodLog[0].deleted).toBe(false);
      expect(store.state().recycleBin).toHaveLength(0);
    });
  });

  describe('setCalGoal', () => {
    it('sets calorie goal', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.setCalGoal(2500);

      expect(store.state().calGoal).toBe(2500);
    });

    it('enforces minimum of 100', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.setCalGoal(50);

      expect(store.state().calGoal).toBe(100);
    });
  });

  describe('addCustomFoodPreset', () => {
    it('adds a preset to customFoodPresets', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200, '午餐');

      expect(store.state().customFoodPresets).toHaveLength(1);
      expect(store.state().customFoodPresets[0].name).toBe('米饭');
      expect(store.state().customFoodPresets[0].calories).toBe(200);
      expect(store.state().customFoodPresets[0].note).toBe('午餐');
      expect(store.state().customFoodPresets[0].id).toBeDefined();
    });

    it('prepends new presets (newest first)', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200, '午餐');
      slice.addCustomFoodPreset('面条', 250, '晚餐');

      expect(store.state().customFoodPresets).toHaveLength(2);
      expect(store.state().customFoodPresets[0].name).toBe('面条');
      expect(store.state().customFoodPresets[1].name).toBe('米饭');
    });

    it('generates unique ids for presets', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200);
      slice.addCustomFoodPreset('面条', 250);

      expect(store.state().customFoodPresets[0].id).not.toBe(store.state().customFoodPresets[1].id);
    });

    it('works without optional note', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200);

      expect(store.state().customFoodPresets).toHaveLength(1);
      expect(store.state().customFoodPresets[0].note).toBeUndefined();
    });
  });

  describe('removeCustomFoodPreset', () => {
    it('removes a preset by id', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200, '午餐');
      slice.addCustomFoodPreset('面条', 250, '晚餐');
      const targetId = store.state().customFoodPresets[0].id;

      slice.removeCustomFoodPreset(targetId);

      expect(store.state().customFoodPresets).toHaveLength(1);
      expect(store.state().customFoodPresets[0].name).toBe('米饭');
    });

    it('does nothing when id does not match', () => {
      const store = makeTestStore();
      const slice = createFoodSlice(mockAdapter as any, undefined, mockSync)(store.set, store.get, store.api);

      slice.addCustomFoodPreset('米饭', 200, '午餐');

      slice.removeCustomFoodPreset('non-existent');

      expect(store.state().customFoodPresets).toHaveLength(1);
    });
  });

  describe('delegation to createDietSlice', () => {
    it('discards the onSettingsPersist argument', () => {
      const store = makeTestStore();
      const onSettingsPersist = vi.fn();
      // Should not throw even though onSettingsPersist is ignored
      const slice = createFoodSlice(mockAdapter as any, onSettingsPersist, mockSync)(store.set, store.get, store.api);
      expect(slice.addFood).toBeDefined();
      expect(slice.deleteFood).toBeDefined();
    });

    it('forwards onSync correctly', () => {
      const store = makeTestStore();
      const customSync = vi.fn();
      const slice = createFoodSlice(mockAdapter as any, undefined, customSync)(store.set, store.get, store.api);

      slice.addFood({ name: '米饭', cal: 200, unit: '碗', date: '2026-07-06', time: '12:00', category: 'staple' });

      expect(customSync).toHaveBeenCalled();
    });
  });
});
