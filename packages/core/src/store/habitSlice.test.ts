// ─── Habit slice tests ──────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHabitSlice } from '../../packages/core/src/store/createHabitSlice';
import type { StorageAdapter, HabitSlice } from '../../packages/core/src/store/types';
import type { CreateHabitForm } from '../../packages/core/src/business/habits';

// Mock logger
vi.mock('../../packages/core/src/logger', () => ({
  createLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

function createMockAdapter(): StorageAdapter {
  return {
    persistChange: vi.fn().mockResolvedValue(undefined),
    markDeleted: vi.fn().mockResolvedValue(undefined),
    batchDelete: vi.fn().mockResolvedValue(undefined),
    persistSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue(null),
    transaction: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
  };
}

function createMockStore(initial: Partial<HabitSlice> = {}) {
  const state: Record<string, unknown> = { habits: [], ...initial };
  return {
    set: (patch: Record<string, unknown> | ((s: Record<string, unknown>) => Record<string, unknown>)) => {
      if (typeof patch === 'function') Object.assign(state, patch(state));
      else Object.assign(state, patch);
    },
    get: () => state as HabitSlice,
    state,
  };
}

describe('createHabitSlice', () => {
  let adapter: StorageAdapter;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    adapter = createMockAdapter();
    store = createMockStore();
  });

  it('addHabit creates a new habit and persists', () => {
    const slice = createHabitSlice(adapter)(store.set as any, store.get as any, {} as any);
    const form: CreateHabitForm = { name: 'Exercise', icon: '🏃', color: '#ff0000' };
    slice.addHabit(form);

    const habits = store.state.habits as any[];
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe('Exercise');
    expect(habits[0].deleted).toBe(false);
    expect(adapter.persistChange).toHaveBeenCalledWith('habit', habits[0].id, habits[0]);
  });

  it('updateHabit modifies existing habit', () => {
    const habit = { id: 'h1', name: 'Old', deleted: false, updatedAt: 100 };
    store.state.habits = [habit];
    const slice = createHabitSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.updateHabit('h1', { name: 'New' });

    const habits = store.state.habits as any[];
    expect(habits[0].name).toBe('New');
    expect(habits[0].updatedAt).toBeGreaterThan(100);
    expect(adapter.persistChange).toHaveBeenCalled();
  });

  it('deleteHabit soft-deletes habit', () => {
    const habit = { id: 'h1', name: 'Test', deleted: false, updatedAt: 100 };
    store.state.habits = [habit];
    store.state.planItems = [];
    const slice = createHabitSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.deleteHabit('h1');

    const habits = store.state.habits as any[];
    expect(habits[0].deleted).toBe(true);
    expect(adapter.markDeleted).toHaveBeenCalledWith('habit', 'h1');
  });

  it('deleteHabit does nothing for non-existent habit', () => {
    store.state.habits = [];
    const slice = createHabitSlice(adapter)(store.set as any, store.get as any, {} as any);
    slice.deleteHabit('nonexistent');

    expect(adapter.persistChange).not.toHaveBeenCalled();
  });
});
