import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckinSlice } from './createCheckinSlice';
import { calculateStreakFromCheckins } from './selectors';
import { dateStr } from '../utils';
import type { CheckinEntry } from '../types';

function makeTestStore(initialState: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    checkinHistory: [],
    streak: 0,
    graceHistory: [],
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

const makeCheckin = (overrides: Partial<CheckinEntry> = {}): CheckinEntry => ({
  date: '2026-06-25',
  done: true,
  note: '',
  streak: 1,
  updatedAt: Date.now(),
  deleted: false,
  ...overrides,
});

describe('createCheckinSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitCheckin', () => {
    it('adds a new checkin entry', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, 'test note', '2026-06-25');

      const history = store.state().checkinHistory as CheckinEntry[];
      expect(history).toHaveLength(1);
      expect(history[0].date).toBe('2026-06-25');
      expect(history[0].done).toBe(true);
      expect(history[0].note).toBe('test note');
    });

    it('calls adapter.persistChange', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, '', '2026-06-25');

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'checkin',
        '2026-06-25',
        expect.objectContaining({ date: '2026-06-25', done: true }),
      );
    });

    it('triggers sync callback', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, '', '2026-06-25');

      expect(mockSync).toHaveBeenCalled();
    });

    it('updates streak', () => {
      const today = dateStr();
      const store = makeTestStore({
        checkinHistory: [makeCheckin({ date: today, done: true })],
      });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.submitCheckin(true, '', today);

      // streak 已改为派生状态，通过 selector 计算
      
      const streak = calculateStreakFromCheckins(slice.checkinHistory);
      expect(streak).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateStreak', () => {
    it('calculates streak from history', () => {
      const today = dateStr();
      const yesterday = dateStr(new Date(Date.now() - 86400000));
      const store = makeTestStore({
        checkinHistory: [
          makeCheckin({ date: today, done: true }),
          makeCheckin({ date: yesterday, done: true }),
        ],
      });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      // streak 已改为派生状态
      
      const streak = calculateStreakFromCheckins(slice.checkinHistory);
      expect(streak).toBe(2);
    });

    it('ignores deleted entries', () => {
      const store = makeTestStore({
        checkinHistory: [
          makeCheckin({ date: '2026-06-25', done: true, deleted: true }),
        ],
      });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      
      const streak = calculateStreakFromCheckins(slice.checkinHistory);
      expect(streak).toBe(0);
    });
  });

  describe('addGraceRecord', () => {
    it('adds a grace record', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addGraceRecord('2026-06-25');

      const grace = store.state().graceHistory as Array<{ date: string; deleted: boolean }>;
      expect(grace).toHaveLength(1);
      expect(grace[0].date).toBe('2026-06-25');
      expect(grace[0].deleted).toBe(false);
    });

    it('does not add duplicate grace record', () => {
      const store = makeTestStore({
        graceHistory: [{ date: '2026-06-25', restoredAt: 1000, updatedAt: 1000, deleted: false }],
      });
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addGraceRecord('2026-06-25');

      const grace = store.state().graceHistory as Array<{ date: string }>;
      expect(grace).toHaveLength(1);
    });

    it('calls adapter.persistChange for grace', () => {
      const store = makeTestStore();
      const slice = createCheckinSlice(mockAdapter as any, mockSync)(store.set, store.get, store.api);

      slice.addGraceRecord('2026-06-25');

      expect(mockAdapter.persistChange).toHaveBeenCalledWith(
        'grace',
        '2026-06-25',
        expect.objectContaining({ date: '2026-06-25' }),
      );
    });
  });
});
