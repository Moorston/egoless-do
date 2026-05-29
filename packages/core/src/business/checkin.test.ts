import { describe, it, expect } from 'vitest';
import type { CheckinEntry } from '../types';
import { submitCheckinEntry, computeLongestStreak } from './checkin';

describe('submitCheckinEntry', () => {
  it('creates a new checkin record', () => {
    const result = submitCheckinEntry([], true, 'good day', '2026-01-15');
    expect(result.record.date).toBe('2026-01-15');
    expect(result.record.done).toBe(true);
    expect(result.record.note).toBe('good day');
    expect(result.history).toHaveLength(1);
  });
  it('replaces existing record for same date', () => {
    const existing: CheckinEntry = {
      date: '2026-01-15', done: false, note: 'old', streak: 0,
    };
    const result = submitCheckinEntry([existing], true, 'new', '2026-01-15');
    expect(result.history).toHaveLength(1);
    expect(result.history[0].note).toBe('new');
    expect(result.history[0].done).toBe(true);
  });
  it('preserves other dates', () => {
    const existing: CheckinEntry = {
      date: '2026-01-14', done: true, note: 'prev', streak: 1,
    };
    const result = submitCheckinEntry([existing], true, 'today', '2026-01-15');
    expect(result.history).toHaveLength(2);
  });
  it('includes weight when provided', () => {
    const result = submitCheckinEntry([], true, '', '2026-01-15', 65.5);
    expect(result.record.weight).toBe(65.5);
  });
});

describe('computeLongestStreak', () => {
  it('returns 0 for empty', () => {
    expect(computeLongestStreak([])).toBe(0);
  });
  it('returns 1 for single done', () => {
    expect(computeLongestStreak([
      { date: '2026-01-15', done: true, note: '', streak: 1 },
    ])).toBe(1);
  });
  it('counts consecutive days', () => {
    expect(computeLongestStreak([
      { date: '2026-01-15', done: true, note: '', streak: 3 },
      { date: '2026-01-14', done: true, note: '', streak: 2 },
      { date: '2026-01-13', done: true, note: '', streak: 1 },
    ])).toBe(3);
  });
  it('handles gaps correctly', () => {
    expect(computeLongestStreak([
      { date: '2026-01-15', done: true, note: '', streak: 1 },
      { date: '2026-01-14', done: true, note: '', streak: 2 },
      { date: '2026-01-11', done: true, note: '', streak: 1 }, // gap
      { date: '2026-01-10', done: true, note: '', streak: 2 },
      { date: '2026-01-09', done: true, note: '', streak: 3 },
    ])).toBe(3); // longest is Jan 9-11
  });
  it('ignores not-done entries', () => {
    expect(computeLongestStreak([
      { date: '2026-01-15', done: false, note: '', streak: 0 },
      { date: '2026-01-14', done: true, note: '', streak: 1 },
    ])).toBe(1);
  });
});
