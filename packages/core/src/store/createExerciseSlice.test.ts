import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

vi.mock('../logger', () => ({ createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) }));

import { createExerciseSlice } from './createExerciseSlice';
import { createTestStore, createMockStorageAdapter } from './test-utils/storeHarness';
import type { FullStore } from './types';

// createExerciseSlice writes cross-slice state (recycleBin on delete) via
// set(), so the isolated store is typed FullStore and the factory is invoked
// directly — its SliceCreator<ExerciseSlice> expects FullStore-typed set/get/api.
function makeTestStore(initialState: Partial<FullStore> = {}) {
  return createTestStore<FullStore>({ exerciseLog: [], recycleBin: [], ...initialState });
}

const adapter = createMockStorageAdapter();

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

describe('createExerciseSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addExercise', () => {
    it('adds an exercise entry to exerciseLog', () => {
      const store = makeTestStore();
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);

      expect(store.state().exerciseLog).toHaveLength(1);
      expect(store.state().exerciseLog[0].sportKey).toBe('running');
      expect(store.state().exerciseLog[0].durationSec).toBe(1800);
      expect(store.state().exerciseLog[0].calories).toBe(200);
      expect(adapter.persistChange).toHaveBeenCalledWith('exercise', expect.any(String), expect.objectContaining({ sportKey: 'running' }));
      expect(mockSync).toHaveBeenCalled();
    });

    it('generates unique id for each entry', () => {
      const store = makeTestStore();
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);
      slice.addExercise({ ...sampleEntry, sportKey: 'cycling' });

      expect(store.state().exerciseLog).toHaveLength(2);
      expect(store.state().exerciseLog[0].id).not.toBe(store.state().exerciseLog[1].id);
    });

    it('sets deleted to false and generates updatedAt', () => {
      const store = makeTestStore();
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.addExercise(sampleEntry);

      expect(store.state().exerciseLog[0].deleted).toBe(false);
      expect(store.state().exerciseLog[0].updatedAt).toBeTypeOf('number');
    });

    it('does nothing when sportKey is empty', () => {
      const store = makeTestStore();
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.addExercise({ ...sampleEntry, sportKey: '' });

      expect(store.state().exerciseLog).toHaveLength(0);
      expect(adapter.persistChange).not.toHaveBeenCalled();
      expect(mockSync).not.toHaveBeenCalled();
    });
  });

  describe('deleteExercise', () => {
    it('soft-deletes an exercise entry', () => {
      const store = makeTestStore({ exerciseLog: [makeExercise()] });
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteExercise('exercise-1');

      expect(store.state().exerciseLog[0].deleted).toBe(true);
      expect(adapter.markDeleted).toHaveBeenCalledWith('exercise', 'exercise-1');
      expect(mockSync).toHaveBeenCalled();
    });

    it('adds deleted exercise to recycleBin with entityType exercise', () => {
      const store = makeTestStore({ exerciseLog: [makeExercise()] });
      const slice = createExerciseSlice(adapter, mockSync)(store.set, store.get, store.api);

      slice.deleteExercise('exercise-1');

      expect(store.state().recycleBin).toHaveLength(1);
      expect(store.state().recycleBin[0].entityType).toBe('exercise');
      expect(store.state().recycleBin[0].id).toBe('exercise-1');
    });
  });
});
