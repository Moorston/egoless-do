import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addMedMinutesToList } from './meditation';
import type { MedHistoryEntry } from '../types';

// Freeze date so tests are deterministic
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-07T12:00:00')); });
afterEach(() => { vi.useRealTimers(); });

function makeMed(overrides: Partial<MedHistoryEntry> = {}): MedHistoryEntry {
  return { date: '2026-07-06', durMin: 10, updatedAt: Date.now(), deleted: false, ...overrides };
}

describe('addMedMinutesToList', () => {
  it('adds new entry when no existing entry for today', () => {
    const result = addMedMinutesToList([], 0, 15);
    expect(result.total).toBe(15);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].durMin).toBe(15);
    expect(result.history[0].date).toBe('2026-07-07');
  });

  it('merges with existing entry for today', () => {
    const existing = makeMed({ date: '2026-07-07', durMin: 10 });
    const result = addMedMinutesToList([existing], 100, 5);
    expect(result.total).toBe(105);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].durMin).toBe(15); // 10 + 5
  });

  it('ignores deleted entries for today', () => {
    const deleted = makeMed({ date: '2026-07-07', durMin: 10, deleted: true });
    const result = addMedMinutesToList([deleted], 0, 15);
    expect(result.history).toHaveLength(2); // new + old deleted
    expect(result.history[0].durMin).toBe(15);
  });

  it('returns unchanged for zero minutes', () => {
    const result = addMedMinutesToList([makeMed()], 50, 0);
    expect(result.total).toBe(50);
    expect(result.history).toHaveLength(1);
  });

  it('returns unchanged for negative minutes', () => {
    const result = addMedMinutesToList([makeMed()], 50, -5);
    expect(result.total).toBe(50);
  });

  it('preserves other history entries', () => {
    const other = makeMed({ date: '2026-07-05', durMin: 20 });
    const result = addMedMinutesToList([other], 20, 10);
    expect(result.history).toHaveLength(2);
    expect(result.history.find(m => m.date === '2026-07-05')?.durMin).toBe(20);
  });
});
