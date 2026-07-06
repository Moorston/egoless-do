import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import { createMindSlice } from './createMindSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    fearEntries: [],
    courageEntries: [],
    achievements: [],
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

describe('createMindSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addFearEntry', () => {
    it('adds a fear entry', () => {
      const store = makeTestStore();
      const slice = createMindSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
      // checkAchievements is part of the same slice, attach it
      store.api.getState().checkAchievements = () => {};

      slice.addFearEntry({
        content: '恐高',
        category: 'natural',
        intensity: 7,
        date: '2026-07-06',
        feeling: '紧张',
      } as any);

      expect(store.state().fearEntries).toHaveLength(1);
      expect(store.state().fearEntries[0].content).toBe('恐高');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('addCourageEntry', () => {
    it('adds a courage entry', () => {
      const store = makeTestStore();
      const slice = createMindSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);
      store.api.getState().checkAchievements = () => {};

      slice.addCourageEntry({
        content: '挑战高空项目',
        date: '2026-07-06',
        feeling: '勇敢',
      } as any);

      expect(store.state().courageEntries).toHaveLength(1);
      expect(store.state().courageEntries[0].content).toBe('挑战高空项目');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('unlockAchievement', () => {
    it('adds an achievement', () => {
      const store = makeTestStore();
      const slice = createMindSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.unlockAchievement('first_courage');

      expect(store.state().achievements).toHaveLength(1);
      expect(store.state().achievements[0].type).toBe('first_courage');
      expect(mockAdapter.persistChange).toHaveBeenCalled();
    });

    it('does not duplicate achievements', () => {
      const store = makeTestStore({
        achievements: [{ type: 'first_courage', unlockedAt: Date.now(), updatedAt: Date.now(), deleted: false }],
      });
      const slice = createMindSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.unlockAchievement('first_courage');

      expect(store.state().achievements).toHaveLength(1);
    });
  });
});
