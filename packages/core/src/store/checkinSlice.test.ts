// @deprecated — Superseded by createCheckinSlice.test.ts. Remove after verifying coverage.
// ─── Checkin slice tests ──────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckinSlice } from './createCheckinSlice';
import type { StorageAdapter, CheckinSlice } from './types';

vi.mock('../logger', () => ({
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

describe('createCheckinSlice', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('submitCheckin creates a new checkin entry', () => {
    const state: Record<string, unknown> = { checkinHistory: [], streak: 0, graceHistory: [] };
    const set = (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    const get = () => state as CheckinSlice;

    const slice = createCheckinSlice(adapter)(set as any, get as any, {} as any);
    slice.submitCheckin(true, 'Good day');

    const history = state.checkinHistory as any[];
    expect(history).toHaveLength(1);
    expect(history[0].done).toBe(true);
    expect(history[0].note).toContain('Good day');
    expect(adapter.persistChange).toHaveBeenCalledWith('checkin', expect.any(String), expect.any(Object));
  });

  it('calculateStreak updates streak count', () => {
    const today = new Date().toISOString().split('T')[0];
    const state: Record<string, unknown> = {
      checkinHistory: [
        { date: today, done: true, deleted: false, note: '', updatedAt: Date.now() },
      ],
      streak: 0,
      graceHistory: [],
    };
    const set = (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    const get = () => state as CheckinSlice;

    const slice = createCheckinSlice(adapter)(set as any, get as any, {} as any);
    slice.calculateStreak();

    expect(state.streak).toBeGreaterThanOrEqual(1);
  });

  it('addGraceRecord prevents duplicate grace for same date', () => {
    const state: Record<string, unknown> = {
      checkinHistory: [],
      streak: 0,
      graceHistory: [{ date: '2026-01-01', deleted: false, restoredAt: 100, updatedAt: 100 }],
    };
    const set = (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    const get = () => state as CheckinSlice;

    const slice = createCheckinSlice(adapter)(set as any, get as any, {} as any);
    slice.addGraceRecord('2026-01-01');

    expect(state.graceHistory).toHaveLength(1);
    expect(adapter.persistChange).not.toHaveBeenCalled();
  });

  it('addGraceRecord creates new grace entry', () => {
    const state: Record<string, unknown> = { checkinHistory: [], streak: 0, graceHistory: [] };
    const set = (patch: any) => Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    const get = () => state as CheckinSlice;

    const slice = createCheckinSlice(adapter)(set as any, get as any, {} as any);
    slice.addGraceRecord('2026-01-01');

    expect(state.graceHistory).toHaveLength(1);
    expect((state.graceHistory as any[])[0].date).toBe('2026-01-01');
    expect(adapter.persistChange).toHaveBeenCalledWith('grace', '2026-01-01', expect.any(Object));
  });
});
