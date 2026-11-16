import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

import { createMantraSlice } from './createMantraSlice';
import type { MantraSlice } from './createMantraSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';

// createMantraSlice reads only its own fields (mantraDefs, mantraSessions,
// readingSessions) via get()/set() — no cross-slice state. So the isolated
// store is typed MantraSlice and bindSlice narrows the factory's FullStore
// binding.
function makeTestStore(overrides: Partial<MantraSlice> = {}) {
  return createTestStore<MantraSlice>({ mantraDefs: [], mantraSessions: [], readingSessions: [], ...overrides });
}

const adapter = createMockStorageAdapter();

const mockSync = vi.fn();

describe('createMantraSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addMantraDef', () => {
    it('adds a mantra definition', () => {
      const store = makeTestStore();
      const slice = bindSlice(createMantraSlice)(adapter, mockSync)(store.set, store.get, store.api);

      const result = slice.addMantraDef({ name: '六字大明咒', targetCount: 108 });

      expect(store.state().mantraDefs).toHaveLength(1);
      expect(store.state().mantraDefs[0].name).toBe('六字大明咒');
      expect(result.name).toBe('六字大明咒');
      expect(adapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('updateMantraDef', () => {
    it('updates an existing mantra', () => {
      const store = makeTestStore({
        mantraDefs: [{ id: 'm1', name: '旧名称', targetCount: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = bindSlice(createMantraSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateMantraDef('m1', { name: '新名称' });

      expect(store.state().mantraDefs[0].name).toBe('新名称');
      expect(adapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('removeMantraDef', () => {
    it('soft-deletes a mantra', () => {
      const store = makeTestStore({
        mantraDefs: [{ id: 'm1', name: '六字大明咒', targetCount: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = bindSlice(createMantraSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.removeMantraDef('m1');

      expect(store.state().mantraDefs[0].deleted).toBe(true);
      expect(adapter.markDeleted).toHaveBeenCalled();
    });
  });

  describe('addMantraSession', () => {
    it('adds a mantra session', () => {
      const store = makeTestStore();
      const slice = bindSlice(createMantraSlice)(adapter, mockSync)(store.set, store.get, store.api);

      const result = slice.addMantraSession({
        mantraId: 'm1',
        count: 108,
        durationSec: 600,
        date: '2026-07-06',
      });

      expect(store.state().mantraSessions).toHaveLength(1);
      expect(result.mantraId).toBe('m1');
      expect(adapter.persistChange).toHaveBeenCalled();
    });
  });

  describe('removeMantraSession', () => {
    it('soft-deletes a session', () => {
      const store = makeTestStore({
        mantraSessions: [{ id: 's1', mantraId: 'm1', count: 108, updatedAt: Date.now(), deleted: false }],
      });
      const slice = bindSlice(createMantraSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.removeMantraSession('s1');

      expect(store.state().mantraSessions[0].deleted).toBe(true);
      expect(adapter.markDeleted).toHaveBeenCalled();
    });
  });
});
