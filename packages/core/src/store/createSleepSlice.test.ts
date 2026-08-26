import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
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

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    sleepHistory: [],
    sleepGoal: { targetHours: 8 },
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
  transaction: vi.fn().mockResolvedValue(undefined),
};

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
      const slice = createSleepSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateSleepNote('sleep-1', 'new insight');

      const updated = (store.state().sleepHistory as any[]).find(e => e.id === 'sleep-1');
      expect(updated.note).toBe('new insight');
      expect(updated.updatedAt).toBeGreaterThan(1);
      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'sleep',
        'sleep-1',
        expect.objectContaining({ id: 'sleep-1', note: 'new insight' }),
      );
    });

    it('does not persist when the entry does not exist', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = createSleepSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateSleepNote('nonexistent', 'note');

      expect(mockAdapter.persistChange).not.toHaveBeenCalled();
    });
  });

  describe('deleteSleepEntry', () => {
    it('removes the entry from sleepHistory', () => {
      const existing = { id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false };
      const store = makeTestStore({ sleepHistory: [existing] });
      const slice = createSleepSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect((store.state().sleepHistory as any[])).toHaveLength(0);
    });

    it('marks the entry as deleted via the adapter', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = createSleepSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('sleep', 'sleep-1');
    });

    it('calls onSync after deleting', () => {
      const store = makeTestStore({ sleepHistory: [{ id: 'sleep-1', date: '2026-08-01', barrierDone: false, updatedAt: 1, deleted: false }] });
      const slice = createSleepSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteSleepEntry('sleep-1');

      expect(mockSync).toHaveBeenCalled();
    });
  });
});
