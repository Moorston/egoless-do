import { describe, it, expect, vi } from 'vitest';
import {
  fmt, fmtMS, dateStr, yesterday, tomorrow, daysInMonth,
  uid, computeStreak, estimateFastKcal, estimateFastingKcal,
  calculateCheckinStreak, buildHeatmapGrid, normalizeEntity,
} from './utils';

describe('fmt', () => {
  it('formats seconds to HH:MM:SS', () => {
    expect(fmt(0)).toBe('00:00:00');
    expect(fmt(61)).toBe('00:01:01');
    expect(fmt(3661)).toBe('01:01:01');
  });
  it('clamps negative to 0', () => {
    expect(fmt(-5)).toBe('00:00:00');
  });
});

describe('fmtMS', () => {
  it('formats seconds to MM:SS', () => {
    expect(fmtMS(0)).toBe('00:00');
    expect(fmtMS(90)).toBe('01:30');
  });
});

describe('dateStr', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = dateStr(new Date(2026, 0, 15));
    expect(result).toBe('2026-01-15');
  });
  it('pads single digits', () => {
    const result = dateStr(new Date(2026, 2, 5));
    expect(result).toBe('2026-03-05');
  });
});

describe('daysInMonth', () => {
  it('returns correct days', () => {
    expect(daysInMonth(2026, 0)).toBe(31);  // Jan
    expect(daysInMonth(2026, 1)).toBe(28);  // Feb (not leap)
    expect(daysInMonth(2024, 1)).toBe(29);  // Feb (leap)
    expect(daysInMonth(2026, 11)).toBe(31); // Dec
  });
});

describe('computeStreak', () => {
  it('returns 0 for empty', () => {
    expect(computeStreak([])).toBe(0);
  });
  it('returns 0 when most recent is too old', () => {
    expect(computeStreak(['2020-01-01'])).toBe(0);
  });
  it('returns 1 for today only', () => {
    const today = dateStr();
    expect(computeStreak([today])).toBe(1);
  });
  it('returns 1 for yesterday only', () => {
    expect(computeStreak([yesterday()])).toBe(1);
  });
  it('counts consecutive days', () => {
    const today = dateStr();
    const y = yesterday();
    expect(computeStreak([today, y])).toBe(2);
  });
  it('breaks on gap', () => {
    const today = dateStr();
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const threeDaysAgo = dateStr(d);
    expect(computeStreak([today, threeDaysAgo])).toBe(1);
  });
  it('deduplicates', () => {
    const today = dateStr();
    expect(computeStreak([today, today])).toBe(1);
  });
});

describe('estimateFastKcal', () => {
  it('calculates 35 kcal/hour', () => {
    expect(estimateFastKcal(3600)).toBe(35);
    expect(estimateFastKcal(7200)).toBe(70);
    expect(estimateFastKcal(0)).toBe(0);
  });
});

describe('estimateFastingKcal', () => {
  it('uses BMR formula for male', () => {
    // BMR = 10*70 + 6.25*170 - 5*30 + 5 = 700 + 1062.5 - 150 + 5 = 1617.5
    // hourly = 1617.5 / 24 = 67.396
    // 16h = 67.396 * 16 = 1078.33 → 1078
    expect(estimateFastingKcal(16, 70, 'male', 30, 170)).toBe(1078);
  });
  it('uses BMR formula for female', () => {
    // BMR = 10*60 + 6.25*160 - 5*25 - 161 = 600 + 1000 - 125 - 161 = 1314
    // hourly = 1314 / 24 = 54.75
    // 16h = 54.75 * 16 = 876
    expect(estimateFastingKcal(16, 60, 'female', 25, 160)).toBe(876);
  });
});

describe('calculateCheckinStreak', () => {
  it('returns 0 for empty history', () => {
    expect(calculateCheckinStreak([])).toBe(0);
  });
  it('counts streak from refDate', () => {
    const history = [
      { date: '2026-01-15', done: true },
      { date: '2026-01-14', done: true },
      { date: '2026-01-13', done: true },
      { date: '2026-01-11', done: true }, // gap
    ];
    expect(calculateCheckinStreak(history, '2026-01-15')).toBe(3);
  });
  it('allows starting from day before refDate', () => {
    const history = [
      { date: '2026-01-14', done: true },
      { date: '2026-01-13', done: true },
    ];
    expect(calculateCheckinStreak(history, '2026-01-15')).toBe(2);
  });
  it('counts from day before when refDate is not done', () => {
    const history = [
      { date: '2026-01-15', done: false },
      { date: '2026-01-14', done: true },
      { date: '2026-01-13', done: true },
    ];
    expect(calculateCheckinStreak(history, '2026-01-15')).toBe(2);
  });
  it('returns 0 when no done entries near refDate', () => {
    const history = [
      { date: '2026-01-15', done: false },
      { date: '2026-01-10', done: true },
    ];
    expect(calculateCheckinStreak(history, '2026-01-15')).toBe(0);
  });
});

describe('buildHeatmapGrid', () => {
  it('returns correct number of weeks', () => {
    const grid = buildHeatmapGrid([], 4);
    expect(grid).toHaveLength(4);
    grid.forEach(row => expect(row).toHaveLength(7));
  });
  it('marks done dates', () => {
    const today = dateStr();
    const grid = buildHeatmapGrid([{ date: today, done: true }], 2);
    const todayCell = grid.flat().find(c => c.date === today);
    expect(todayCell?.done).toBe(true);
    expect(todayCell?.isToday).toBe(true);
  });
});

describe('normalizeEntity', () => {
  it('maps snake_case to camelCase', () => {
    const result = normalizeEntity({
      id: '1', target_hours: 16, started_at: 1000, ended_at: 2000,
      estimated_kcal: 500, created_at: 3000, is_pinned: true,
    });
    expect(result).toEqual({
      id: '1', targetHours: 16, startedAt: 1000, endedAt: 2000,
      estimatedKcal: 500, timestamp: 3000, isPinned: true,
    });
  });
  it('passes through unmapped fields', () => {
    const result = normalizeEntity({ id: '1', name: 'test' });
    expect(result).toEqual({ id: '1', name: 'test' });
  });
});

describe('uid', () => {
  it('returns unique strings', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });
});
