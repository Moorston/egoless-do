import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { createSleepSlice } from './createSleepSlice';
import { createTestStore, createMockStorageAdapter, bindSlice } from './test-utils/storeHarness';
import type { SleepSlice } from './types';

// createSleepSlice reads only its own fields (sleepHistory, sleepGoal) via
// get()/set() — no cross-slice state. So the isolated store is typed SleepSlice
// and bindSlice narrows the factory's FullStore binding.
function makeTestStore(overrides: Partial<SleepSlice> = {}) {
  return createTestStore<SleepSlice>({ sleepHistory: [], sleepGoal: { targetHours: 8 }, ...overrides });
}

const adapter = createMockStorageAdapter();

const mockSync = vi.fn();

describe('createSleepSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateSleepNote', () => {
    it('updates the note of an existing entry and persists it', () => {
      // sleep id is a uuid
      const existing = { id: 'sleep-1', date: '2026-08-01', bedtimeAt: 1000, wakeAt: 5000, barrierDone: false, note: 'old', updatedAt: 1, deleted: false };
      const store = makeTestStore({ sleepHistory: [existing] });
      const slice = bindSlice(createSleepSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateSleepNote('sleep-1', 'new insight');

      const updated = store.state().sleepHistory.find(e => e.id === 'sleep-1');
      expect(updated?.note).toBe('new insight');
      expect(updated?.updatedAt).toBeGreaterThan(1);
      expect(adapter.persistChange).toHaveBeenCalledWith(
        'sleep',
        'sleep-1',
        expect.objectContaining({ id: 'sleep-1', note: 'new insight' }),
      );
    });

    it('does not persist when the entry does not exist', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createSleepSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.updateSleepNote('nonexistent', 'note');

      expect(adapter.persistChange).not.toHaveBeenCalled();
    });
  });

  describe('deleteSleepEntry', () => {
    it('removes the entry from sleepHistory', () => {
      const existing = { id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false };
      const store = makeTestStore({ sleepHistory: [existing] });
      const slice = bindSlice(createSleepSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect(store.state().sleepHistory).toHaveLength(0);
    });

    it('marks the entry as deleted via the adapter', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createSleepSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect(adapter.markDeleted).toHaveBeenCalledWith('sleep', 'sleep-1');
    });

    it('calls onSync after deleting', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = bindSlice(createSleepSlice)(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect(mockSync).toHaveBeenCalled();
    });
  });
});
