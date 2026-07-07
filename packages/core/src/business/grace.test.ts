import { describe, it, expect } from 'vitest';
import { getMonthGraceCount, getRemainingGrace, isGraceAvailable } from './grace';
import type { GraceHistoryEntry } from '../types';

function makeGrace(overrides: Partial<GraceHistoryEntry> = {}): GraceHistoryEntry {
  return { id: 'g1', date: '2026-07-01', updatedAt: Date.now(), deleted: false, ...overrides };
}

// ─── getMonthGraceCount ──────────────────────────────────────
describe('getMonthGraceCount', () => {
  it('counts grace records for the given month', () => {
    const history = [
      makeGrace({ date: '2026-07-01' }),
      makeGrace({ date: '2026-07-15' }),
      makeGrace({ date: '2026-06-30' }),
    ];
    expect(getMonthGraceCount(history, '2026-07')).toBe(2);
  });

  it('excludes deleted records', () => {
    const history = [
      makeGrace({ date: '2026-07-01', deleted: true }),
      makeGrace({ date: '2026-07-15' }),
    ];
    expect(getMonthGraceCount(history, '2026-07')).toBe(1);
  });

  it('returns 0 for empty history', () => {
    expect(getMonthGraceCount([], '2026-07')).toBe(0);
  });

  it('handles null/undefined history', () => {
    expect(getMonthGraceCount(null as any, '2026-07')).toBe(0);
  });
});

// ─── getRemainingGrace ───────────────────────────────────────
describe('getRemainingGrace', () => {
  it('returns quota minus used count', () => {
    const history = [makeGrace({ date: '2026-07-01' })];
    expect(getRemainingGrace(history, 3, '2026-07')).toBe(2);
  });

  it('returns 0 when quota exhausted', () => {
    const history = [
      makeGrace({ date: '2026-07-01' }),
      makeGrace({ date: '2026-07-02' }),
      makeGrace({ date: '2026-07-03' }),
    ];
    expect(getRemainingGrace(history, 3, '2026-07')).toBe(0);
  });

  it('never returns negative', () => {
    const history = Array.from({ length: 5 }, (_, i) => makeGrace({ date: `2026-07-0${i + 1}` }));
    expect(getRemainingGrace(history, 3, '2026-07')).toBe(0);
  });
});

// ─── isGraceAvailable ────────────────────────────────────────
describe('isGraceAvailable', () => {
  it('returns true when quota available and yesterday not used', () => {
    expect(isGraceAvailable([], 3, '2026-07', '2026-07-14')).toBe(true);
  });

  it('returns false when quota is 0', () => {
    expect(isGraceAvailable([], 0, '2026-07', '2026-07-14')).toBe(false);
  });

  it('returns false when yesterday already has grace', () => {
    const history = [makeGrace({ date: '2026-07-14' })];
    expect(isGraceAvailable(history, 3, '2026-07', '2026-07-14')).toBe(false);
  });

  it('returns false when quota exhausted', () => {
    const history = [
      makeGrace({ date: '2026-07-01' }),
      makeGrace({ date: '2026-07-02' }),
      makeGrace({ date: '2026-07-03' }),
    ];
    expect(isGraceAvailable(history, 3, '2026-07', '2026-07-14')).toBe(false);
  });

  it('ignores deleted yesterday record', () => {
    const history = [makeGrace({ date: '2026-07-14', deleted: true })];
    expect(isGraceAvailable(history, 3, '2026-07', '2026-07-14')).toBe(true);
  });
});
