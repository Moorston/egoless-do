import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

import { createMindSlice } from './createMindSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';
import type { MindSlice } from './types';

// createMindSlice reads only its own fields (fearEntries, courageEntries,
// achievements) via get()/set(), but addFearEntry/addCourageEntry call
// get().checkAchievements() — a same-slice method attached to state per-test.
// So the isolated store is typed MindSlice and bindSlice narrows the factory's
// FullStore binding.
function makeTestStore(overrides: Partial<MindSlice> = {}) {
  return createTestStore<MindSlice>({ fearEntries: [], courageEntries: [], achievements: [], ...overrides });
}

const adapter = createMockStorageAdapter();

const mockSync = vi.fn();

describe('createMindSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addFearEntry', () => {
    it('adds a fear entry', () => {
      const store = makeTestStore();
      const slice = bindSlice(createMindSlice)(adapter, mockSync)(store.set, store.get, store.api);
      // checkAchievements is part of the same slice, attach it so get().checkAchievements() resolves
      store.api.getState().checkAchievements = () => {};

      slice.addFearEntry({
        content: '恐高',
        category: 'natural',
        intensity: 7,
        date: '2026-07-06',
        feeling: '紧张',
      });

      expect(store.state().fearEntries).toHaveLength(1);
      expect(store.state().fearEntries[0].content).toBe('恐高');
      expect(adapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('addCourageEntry', () => {
    it('adds a courage entry', () => {
      const store = makeTestStore();
      const slice = bindSlice(createMindSlice)(adapter, mockSync)(store.set, store.get, store.api);
      store.api.getState().checkAchievements = () => {};

      slice.addCourageEntry({
        content: '挑战高空项目',
        date: '2026-07-06',
        feeling: '勇敢',
      });

      expect(store.state().courageEntries).toHaveLength(1);
      expect(store.state().courageEntries[0].content).toBe('挑战高空项目');
      expect(adapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('unlockAchievement', () => {
    it('adds an achievement', () => {
      const store = makeTestStore();
      const slice = bindSlice(createMindSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.unlockAchievement('first_courage');

      expect(store.state().achievements).toHaveLength(1);
      expect(store.state().achievements[0].type).toBe('first_courage');
      expect(adapter.persistChange).toHaveBeenCalled();
    });

    it('does not duplicate achievements', () => {
      const store = makeTestStore({
        achievements: [{ type: 'first_courage', unlockedAt: Date.now(), updatedAt: Date.now(), deleted: false }],
      });
      const slice = bindSlice(createMindSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.unlockAchievement('first_courage');

      expect(store.state().achievements).toHaveLength(1);
    });
  });
});
