import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { createRecycleBinSlice } from './createRecycleBinSlice';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    recycleBin: [],
    habits: [],
    reflections: [],
    foodLog: [],
    exerciseLog: [],
    plans: [],
    breathHistory: [],
    planItems: [],
    planItemCheckins: [],
    dailyCustomTodos: [],
    dailyTodoHistory: [],
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
  hardDelete: vi.fn().mockResolvedValue(undefined),
  persistSettings: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue(undefined),
  transaction: vi.fn().mockResolvedValue(undefined),
};

const sampleHabit = {
  id: 'h1',
  entityType: 'habit' as const,
  data: { id: 'h1', name: 'test', deleted: true },
};

const samplePlan = {
  id: 'p1',
  entityType: 'plan' as const,
  data: { id: 'p1', title: 'my plan', deleted: true },
};

describe('createRecycleBinSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToRecycleBin', () => {
    it('adds an item with deletedAt timestamp', () => {
      const store = makeTestStore();
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.addToRecycleBin(sampleHabit);

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].id).toBe('h1');
      expect(store.state().recycleBin[0].entityType).toBe('habit');
      expect(store.state().recycleBin[0].data).toEqual({ id: 'h1', name: 'test', deleted: true });
      expect(store.state().recycleBin[0].deletedAt).toBeTypeOf('number');
    });

    it('persists recycleBin via adapter', () => {
      const store = makeTestStore();
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.addToRecycleBin(sampleHabit);

      expect(mockAdapter.persistSettings).toHaveBeenCalledWith('recycleBin', expect.arrayContaining([expect.objectContaining({ id: 'h1' })]));
    });

    it('prepends new items to the recycleBin', () => {
      const store = makeTestStore({ recycleBin: [{ id: 'old', entityType: 'food', data: { id: 'old' }, deletedAt: 100 }] });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.addToRecycleBin(sampleHabit);

      expect(store.state().recycleBin).toHaveLength(2);
      expect(store.state().recycleBin[0].id).toBe('h1');
      expect(store.state().recycleBin[1].id).toBe('old');
    });
  });

  describe('restoreFromRecycleBin', () => {
    it('restores a habit from recycleBin to habits array', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1', name: 'test', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('h1');

      expect(store.state().recycleBin).toHaveLength(0);
      expect(store.state().habits).toHaveLength(1);
      expect(store.state().habits[0].id).toBe('h1');
      expect(store.state().habits[0].deleted).toBe(false);
    });

    it('restores a reflection from recycleBin to reflections array', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'r1', entityType: 'reflection', data: { id: 'r1', content: 'test', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('r1');

      expect(store.state().reflections).toHaveLength(1);
      expect(store.state().reflections[0].deleted).toBe(false);
    });

    it('restores a food item from recycleBin to foodLog array', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'f1', entityType: 'food', data: { id: 'f1', name: 'rice', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('f1');

      expect(store.state().foodLog).toHaveLength(1);
      expect(store.state().foodLog[0].deleted).toBe(false);
    });

    it('restores an exercise item from recycleBin to exerciseLog array', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'e1', entityType: 'exercise', data: { id: 'e1', name: 'run', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('e1');

      expect(store.state().exerciseLog).toHaveLength(1);
      expect(store.state().exerciseLog[0].deleted).toBe(false);
    });

    it('restores a breath item from recycleBin to breathHistory array', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'b1', entityType: 'breath', data: { id: 'b1', type: 'box', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('b1');

      expect(store.state().breathHistory).toHaveLength(1);
      expect(store.state().breathHistory[0].deleted).toBe(false);
    });

    it('does nothing if the id is not found', () => {
      const store = makeTestStore();
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('nonexistent');

      expect(store.state().recycleBin).toHaveLength(0);
      expect(store.state().habits).toHaveLength(0);
    });

    it('persists restored entity via adapter.persistChange', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1', name: 'test', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('h1');

      expect(mockAdapter.persistChange).toHaveBeenCalledWith('habit', 'h1', expect.objectContaining({ deleted: false }));
    });

    it('persists updated recycleBin after restore', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1', name: 'test', deleted: true }, deletedAt: Date.now() }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('h1');

      expect(mockAdapter.persistSettings).toHaveBeenCalledWith('recycleBin', expect.any(Array));
    });

    it('restores plan child items (planItems, planItemCheckins, dailyCustomTodos, dailyTodoHistory)', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'p1', entityType: 'plan', data: { id: 'p1', title: 'my plan', deleted: true }, deletedAt: Date.now() }],
        plans: [],
        planItems: [
          { id: 'pi1', planId: 'p1', title: 'step 1', deleted: true, updatedAt: 100 },
          { id: 'pi2', planId: 'other', title: 'step 2', deleted: true, updatedAt: 100 },
        ],
        planItemCheckins: [
          { id: 'pic1', planItemId: 'pi1', deleted: true, updatedAt: 100 },
          { id: 'pic2', planItemId: 'pi2', deleted: true, updatedAt: 100 },
        ],
        dailyCustomTodos: [
          { id: 'dt1', planId: 'p1', title: 'todo 1', deleted: true, updatedAt: 100 },
          { id: 'dt2', planId: 'other', title: 'todo 2', deleted: true, updatedAt: 100 },
        ],
        dailyTodoHistory: [
          { id: 'dth1', planId: 'p1', deleted: true, updatedAt: 100 },
          { id: 'dth2', planId: 'other', deleted: true, updatedAt: 100 },
        ],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('p1');

      expect(store.state().plans).toHaveLength(1);
      expect(store.state().plans[0].deleted).toBe(false);

      expect(store.state().planItems[0].deleted).toBe(false);
      expect(store.state().planItems[1].deleted).toBe(true);

      expect(store.state().planItemCheckins[0].deleted).toBe(false);
      expect(store.state().planItemCheckins[1].deleted).toBe(true);

      expect(store.state().dailyCustomTodos[0].deleted).toBe(false);
      expect(store.state().dailyCustomTodos[1].deleted).toBe(true);

      expect(store.state().dailyTodoHistory[0].deleted).toBe(false);
      expect(store.state().dailyTodoHistory[1].deleted).toBe(true);
    });

    it('persists plan child items via adapter.persistChange', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'p1', entityType: 'plan', data: { id: 'p1', title: 'my plan', deleted: true }, deletedAt: Date.now() }],
        planItems: [{ id: 'pi1', planId: 'p1', title: 'step 1', deleted: true, updatedAt: 100 }],
        planItemCheckins: [{ id: 'pic1', planItemId: 'pi1', deleted: true, updatedAt: 100 }],
        dailyCustomTodos: [{ id: 'dt1', planId: 'p1', title: 'todo 1', deleted: true, updatedAt: 100 }],
        dailyTodoHistory: [{ id: 'dth1', planId: 'p1', deleted: true, updatedAt: 100 }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.restoreFromRecycleBin('p1');

      expect(mockAdapter.persistChange).toHaveBeenCalledWith('planItem', 'pi1', expect.objectContaining({ deleted: false }));
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('planItemCheckin', 'pic1', expect.objectContaining({ deleted: false }));
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('dailyCustomTodo', 'dt1', expect.objectContaining({ deleted: false }));
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('dailyTodoHistory', 'dth1', expect.objectContaining({ deleted: false }));
    });
  });

  describe('removeFromRecycleBin', () => {
    it('removes an item by id from recycleBin', () => {
      const store = makeTestStore({
        recycleBin: [
          { id: 'h1', entityType: 'habit', data: { id: 'h1' }, deletedAt: 100 },
          { id: 'f1', entityType: 'food', data: { id: 'f1' }, deletedAt: 200 },
        ],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.removeFromRecycleBin('h1');

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].id).toBe('f1');
    });

    it('persists updated recycleBin via adapter', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1' }, deletedAt: 100 }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.removeFromRecycleBin('h1');

      expect(mockAdapter.persistSettings).toHaveBeenCalledWith('recycleBin', []);
    });

    it('does nothing if id not found', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1' }, deletedAt: 100 }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.removeFromRecycleBin('nonexistent');

      expect(store.state().recycleBin).toHaveLength(1);
    });
  });

  describe('emptyRecycleBin', () => {
    it('clears all items from recycleBin', () => {
      const store = makeTestStore({
        recycleBin: [
          { id: 'h1', entityType: 'habit', data: { id: 'h1' }, deletedAt: 100 },
          { id: 'f1', entityType: 'food', data: { id: 'f1' }, deletedAt: 200 },
        ],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.emptyRecycleBin();

      expect(store.state().recycleBin).toEqual([]);
    });

    it('persists empty array via adapter', () => {
      const store = makeTestStore({
        recycleBin: [{ id: 'h1', entityType: 'habit', data: { id: 'h1' }, deletedAt: 100 }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.emptyRecycleBin();

      expect(mockAdapter.persistSettings).toHaveBeenCalledWith('recycleBin', []);
    });

    it('works on already empty recycleBin', () => {
      const store = makeTestStore();
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.emptyRecycleBin();

      expect(store.state().recycleBin).toEqual([]);
    });
  });

  describe('cleanupRecycleBin', () => {
    it('removes items older than 1 week', () => {
      const twoWeeksAgo = Date.now() - MS_PER_WEEK - 1000;
      const store = makeTestStore({
        recycleBin: [
          { id: 'old', entityType: 'habit', data: { id: 'old' }, deletedAt: twoWeeksAgo },
          { id: 'recent', entityType: 'food', data: { id: 'recent' }, deletedAt: Date.now() },
        ],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.cleanupRecycleBin();

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].id).toBe('recent');
    });

    it('persists filtered recycleBin via adapter', () => {
      const twoWeeksAgo = Date.now() - MS_PER_WEEK - 1000;
      const store = makeTestStore({
        recycleBin: [{ id: 'old', entityType: 'habit', data: { id: 'old' }, deletedAt: twoWeeksAgo }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.cleanupRecycleBin();

      expect(mockAdapter.persistSettings).toHaveBeenCalledWith('recycleBin', []);
    });

    it('keeps items within the week window', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const store = makeTestStore({
        recycleBin: [{ id: 'ok', entityType: 'habit', data: { id: 'ok' }, deletedAt: threeDaysAgo }],
      });
      const slice = createRecycleBinSlice(mockAdapter as any)(store.set, store.get, store.api);

      slice.cleanupRecycleBin();

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].id).toBe('ok');
    });
  });
});
