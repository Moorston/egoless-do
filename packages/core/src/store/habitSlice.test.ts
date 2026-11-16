// @deprecated — Superseded by createHabitSlice.test.ts. Remove after verifying coverage.
// ─── Habit slice tests ──────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CreateHabitForm } from '../business/habits';

import { createHabitSlice } from './createHabitSlice';
import { createTestStore, createMockStorageAdapter } from './test-utils/storeHarness';
import type { FullStore } from './types';

// Mock logger
vi.mock('../logger', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

// createHabitSlice reads/writes cross-slice state (planItems, recycleBin via set/get),
// so the isolated store is typed FullStore and the factory is invoked directly — its
// SliceCreator<HabitSlice> already expects FullStore-typed set/get/api.
function createMockStore(initial: Partial<FullStore> = {}) {
  return createTestStore<FullStore>({ habits: [], planItems: [], recycleBin: [], ...initial });
}

describe('createHabitSlice', () => {
  let adapter: ReturnType<typeof createMockStorageAdapter>;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    adapter = createMockStorageAdapter();
    store = createMockStore();
  });

  it('addHabit creates a new habit and persists', () => {
    const slice = createHabitSlice(adapter)(store.set, store.get, store.api);
    const form: CreateHabitForm = { name: 'Exercise', icon: '🏃', color: '#ff0000' };
    slice.addHabit(form);

    const habits = store.state().habits;
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe('Exercise');
    expect(habits[0].deleted).toBe(false);
    expect(adapter.persistChange).toHaveBeenCalledWith('habit', habits[0].id, habits[0]);
  });

  it('updateHabit modifies existing habit', () => {
    store = createMockStore({ habits: [{ id: 'h1', name: 'Old', deleted: false, updatedAt: 100 } as FullStore['habits'][number]] });
    const slice = createHabitSlice(adapter)(store.set, store.get, store.api);
    slice.updateHabit('h1', { name: 'New' });

    const habits = store.state().habits;
    expect(habits[0].name).toBe('New');
    expect(habits[0].updatedAt).toBeGreaterThan(100);
    expect(adapter.persistChange).toHaveBeenCalled();
  });

  it('deleteHabit soft-deletes habit', () => {
    store = createMockStore({
      habits: [{ id: 'h1', name: 'Test', deleted: false, updatedAt: 100 } as FullStore['habits'][number]],
      planItems: [],
    });
    const slice = createHabitSlice(adapter)(store.set, store.get, store.api);
    slice.deleteHabit('h1');

    const habits = store.state().habits;
    expect(habits[0].deleted).toBe(true);
    expect(adapter.markDeleted).toHaveBeenCalledWith('habit', 'h1');
  });

  it('deleteHabit does nothing for non-existent habit', () => {
    store = createMockStore({ habits: [] });
    const slice = createHabitSlice(adapter)(store.set, store.get, store.api);
    slice.deleteHabit('nonexistent');

    expect(adapter.persistChange).not.toHaveBeenCalled();
  });
});
