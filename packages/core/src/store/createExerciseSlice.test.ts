import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({ createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) }));

import { createCheckinSlice } from './createCheckinSlice';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    exerciseLog: [],
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
  transaction: vi.fn().mockImplementation(async (fn: () => Promise<void> | void) => { await fn(); }),
};

const mockSync = vi.fn();

const makeExercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'exercise-1',
  sportKey: 'running',
  sportIcon: '🏃',
  durationSec: 1800,
  timestamp: Date.now(),
  calories: 200,
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

const sampleEntry = {
  sportKey: 'running',
  sportIcon: '🏃',
  durationSec: 1800,
  timestamp: Date.now(),
  calories: 200,
};

describe('createCheckinSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addExercise', () => {
    it('adds an exercise entry to exerciseLog', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);

      expect(store.state().exerciseLog).toHaveLength(1);
      expect(store.state().exerciseLog[0].sportKey).toBe('running');
      expect(store.state().exerciseLog[0].durationSec).toBe(1800);
      expect(store.state().exerciseLog[0].calories).toBe(200);
      expect(mockAdapter.persistChange).toHaveBeenCalledWith('exercise', expect.any(String), expect.objectContaining({ sportKey: 'running' }));
      expect(mockSync).toHaveBeenCalled();
    });

    it('generates unique id for each entry', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);
      slice.addExercise({ ...sampleEntry, sportKey: 'cycling' });

      expect(store.state().exerciseLog).toHaveLength(2);
      expect(store.state().exerciseLog[0].id).not.toBe(store.state().exerciseLog[1].id);
    });

    it('sets deleted to false and generates updatedAt', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);

      expect(store.state().exerciseLog[0].deleted).toBe(false);
      expect(store.state().exerciseLog[0].updatedAt).toBeTypeOf('number');
    });

    it('does nothing when sportKey is empty', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addExercise({ ...sampleEntry, sportKey: '' });

      expect(store.state().exerciseLog).toHaveLength(0);
      expect(mockAdapter.persistChange).not.toHaveBeenCalled();
      expect(mockSync).not.toHaveBeenCalled();
    });
  });

  describe('deleteExercise', () => {
    it('soft-deletes an exercise entry', () => {
      const store = makeTestStore({ exerciseLog: [makeExercise()] });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteExercise('exercise-1');

      expect(store.state().exerciseLog[0].deleted).toBe(true);
      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('exercise', 'exercise-1');
      expect(mockSync).toHaveBeenCalled();
    });

    it('adds deleted exercise to recycleBin with entityType exercise', () => {
      const store = makeTestStore({ exerciseLog: [makeExercise()] });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteExercise('exercise-1');

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].entityType).toBe('exercise');
      expect(store.state().recycleBin[0].id).toBe('exercise-1');
    });
  });
});
