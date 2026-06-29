import { describe, it, expect, vi } from 'vitest';
import { createHabitSlice } from './createHabitSlice';
import type { Habit } from '../types';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    habits: [],
    planItems: [],
    recycleBin: [],
    fastingHistory: [],
    activeFasting: null,
    medHistory: [],
    exerciseLog: [],
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

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Test Habit',
  startDate: '2026-06-01',
  targetDays: 30,
  goal: 'Test goal',
  insight: '',
  createTag: false,
  doneDays: 0,
  streak: 0,
  interrupted: 0,
  status: 'notStarted',
  checkedDates: [],
  pauseReason: '',
  abandonReason: '',
  alarmEnabled: false,
  alarmHour: 8,
  alarmMinute: 0,
  link: 'none',
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

describe('createHabitSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addHabit', () => {
    it('adds a new habit to the list', () => {
      const store = makeTestStore();
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addHabit({ name: 'Exercise', goal: 'Stay fit', targetDays: 30, link: 'none' });

      const habits = store.state().habits as Habit[];
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('Exercise');
      expect(habits[0].deleted).toBe(false);
    });

    it('calls adapter.persistChange', () => {
      const store = makeTestStore();
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addHabit({ name: 'Exercise', goal: '', targetDays: 30, link: 'none' });

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'habit',
        expect.any(String),
        expect.objectContaining({ name: 'Exercise' }),
      );
    });
  });

  describe('updateHabit', () => {
    it('updates habit fields', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateHabit('h1', { name: 'Updated Name', goal: 'New goal' });

      const habits = store.state().habits as Habit[];
      expect(habits[0].name).toBe('Updated Name');
      expect(habits[0].goal).toBe('New goal');
    });

    it('persists the updated habit', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.updateHabit('h1', { name: 'Updated' });

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'habit',
        'h1',
        expect.objectContaining({ name: 'Updated' }),
      );
    });
  });

  describe('deleteHabit', () => {
    it('soft-deletes the habit', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteHabit('h1');

      const habits = store.state().habits as Habit[];
      expect(habits[0].deleted).toBe(true);
    });

    it('adds to recycle bin', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteHabit('h1');

      const recycleBin = store.state().recycleBin as Array<{ id: string; entityType: string }>;
      expect(recycleBin).toHaveLength(1);
      expect(recycleBin[0].id).toBe('h1');
      expect(recycleBin[0].entityType).toBe('habit');
    });

    it('calls adapter.markDeleted', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteHabit('h1');

      expect(mockAdapter.markDeleted).toHaveBeenCalledWith('habit', 'h1');
    });

    it('triggers sync callback', () => {
      const store = makeTestStore({ habits: [makeHabit()] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteHabit('h1');

      expect(mockSync).toHaveBeenCalled();
    });

    it('does nothing for non-existent habit', () => {
      const store = makeTestStore({ habits: [] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.deleteHabit('nonexistent');

      expect(mockAdapter.markDeleted).not.toHaveBeenCalled();
    });
  });

  describe('checkinHabit', () => {
    it('marks the habit as checked for the date', () => {
      const store = makeTestStore({ habits: [makeHabit({ status: 'inProgress' })] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.checkinHabit('h1', '2026-06-25');

      const habits = store.state().habits as Habit[];
      expect(habits[0].checkedDates).toContain('2026-06-25');
    });

    it('persists the updated habit', () => {
      const store = makeTestStore({ habits: [makeHabit({ status: 'inProgress' })] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.checkinHabit('h1', '2026-06-25');

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'habit',
        'h1',
        expect.objectContaining({ checkedDates: expect.arrayContaining(['2026-06-25']) }),
      );
    });
  });

  describe('changeHabitStatus', () => {
    it('changes habit status', () => {
      const store = makeTestStore({ habits: [makeHabit({ status: 'notStarted' })] });
      const slice = createHabitSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.changeHabitStatus('h1', 'paused', 'Taking a break');

      const habits = store.state().habits as Habit[];
      expect(habits[0].status).toBe('paused');
      expect(habits[0].pauseReason).toBe('Taking a break');
    });
  });
});
