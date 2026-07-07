import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import { createMantraSlice } from './createMantraSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    mantraDefs: [],
    mantraSessions: [],
    readingSessions: [],
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

describe('createMantraSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addMantraDef', () => {
    it('adds a mantra definition', () => {
      const store = makeTestStore();
      const slice = createMantraSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      const result = slice.addMantraDef({ name: '六字大明咒', targetCount: 108 });

      expect(store.state().mantraDefs).toHaveLength(1);
      expect(store.state().mantraDefs[0].name).toBe('六字大明咒');
      expect(result.name).toBe('六字大明咒');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('updateMantraDef', () => {
    it('updates an existing mantra', () => {
      const store = makeTestStore({
        mantraDefs: [{ id: 'm1', name: '旧名称', targetCount: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = createMantraSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateMantraDef('m1', { name: '新名称' });

      expect(store.state().mantraDefs[0].name).toBe('新名称');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('removeMantraDef', () => {
    it('soft-deletes a mantra', () => {
      const store = makeTestStore({
        mantraDefs: [{ id: 'm1', name: '六字大明咒', targetCount: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = createMantraSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.removeMantraDef('m1');

      expect(store.state().mantraDefs[0].deleted).toBe(true);
      expect(mockAdapter.markDeleted).toHaveBeenCalled();
    });
  });

  describe('addMantraSession', () => {
    it('adds a mantra session', () => {
      const store = makeTestStore();
      const slice = createMantraSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      const result = slice.addMantraSession({
        mantraId: 'm1',
        count: 108,
        durationSec: 600,
        date: '2026-07-06',
      } as any);

      expect(store.state().mantraSessions).toHaveLength(1);
      expect(result.mantraId).toBe('m1');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('removeMantraSession', () => {
    it('soft-deletes a session', () => {
      const store = makeTestStore({
        mantraSessions: [{ id: 's1', mantraId: 'm1', count: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = createMantraSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.removeMantraSession('s1');

      expect(store.state().mantraSessions[0].deleted).toBe(true);
      expect(mockAdapter.markDeleted).toHaveBeenCalled();
    });
  });
});
