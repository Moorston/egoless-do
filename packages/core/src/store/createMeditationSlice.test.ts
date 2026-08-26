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

import { createMeditationSlice } from './createMeditationSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    totalMedMinutes: 0,
    medHistory: [],
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

describe('createMeditationSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateMeditationNote', () => {
    it('updates the note of an existing entry and persists it', () => {
      // meditation id is the date string
      const existing = { date: '2026-08-01', durMin: 20, note: 'old', updatedAt: 1, deleted: false };
      const store = makeTestStore({ medHistory: [existing] });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateMeditationNote('2026-08-01', 'new insight');

      const updated = (store.state().medHistory as any[]).find(e => e.date === '2026-08-01');
      expect(updated.note).toBe('new insight');
      expect(updated.updatedAt).toBeGreaterThan(1);
      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'meditation',
        '2026-08-01',
        expect.objectContaining({ date: '2026-08-01', note: 'new insight' }),
      );
    });

    it('does not persist when the entry does not exist', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateMeditationNote('nonexistent', 'note');

      expect(mockAdapter.persistChange).not.toHaveBeenCalled();
    });
  });

  describe('deleteMeditationEntry', () => {
    it('removes the entry from medHistory', () => {
      const existing = { date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false };
      const store = makeTestStore({ medHistory: [existing], totalMedMinutes: 20 });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect((store.state().medHistory as any[])).toHaveLength(0);
    });

    it('reconciles totalMedMinutes after delete', () => {
      const entries = [
        { date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false },
        { date: '2026-08-02', durMin: 15, updatedAt: 1, deleted: false },
      ];
      const store = makeTestStore({ medHistory: entries, totalMedMinutes: 35 });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(store.state().totalMedMinutes).toBe(15);
    });

    it('marks the entry as deleted via the adapter', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('meditation', '2026-08-01');
    });

    it('calls onSync after deleting', () => {
      const store = makeTestStore({ medHistory: [{ date: '2026-08-01', durMin: 20, updatedAt: 1, deleted: false }] });
      const slice = createMeditationSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteMeditationEntry('2026-08-01');

      expect(mockSync).toHaveBeenCalled();
    });
  });
});
