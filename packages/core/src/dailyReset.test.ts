import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getDailyResetPatch, msUntilMidnight, getTodayFoodLog, getTodayMedMinutes, DailyResetManager } from './dailyReset';
import type { DailyResetDeps } from './dailyReset';
import type { CheckinEntry } from './types';
import { dateStr, addDays } from './utils';

describe('getDailyResetPatch', () => {
  it('returns null when already reset today', () => {
    const today = dateStr();
    expect(getDailyResetPatch(today)).toBeNull();
  });

  it('returns reset patch when not reset today', () => {
    const yesterday = dateStr(new Date(Date.now() - 86400000));
    const patch = getDailyResetPatch(yesterday);
    expect(patch).toEqual({ waterMl: 0 });
  });

  it('returns reset patch when lastReset is null', () => {
    const patch = getDailyResetPatch(null);
    expect(patch).toEqual({ waterMl: 0 });
  });
});

describe('msUntilMidnight', () => {
  it('returns positive number', () => {
    const ms = msUntilMidnight();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(86400000);
  });
});

describe('getTodayFoodLog', () => {
  it('filters food entries for today', () => {
    const today = dateStr();
    const yesterday = dateStr(new Date(Date.now() - 86400000));
    const foodLog = [
      { timestamp: new Date(today + 'T12:00:00').getTime(), deleted: false },
      { timestamp: new Date(yesterday + 'T12:00:00').getTime(), deleted: false },
      { timestamp: new Date(today + 'T18:00:00').getTime(), deleted: true },
    ];
    const result = getTodayFoodLog(foodLog);
    expect(result).toHaveLength(1);
  });
});

describe('getTodayMedMinutes', () => {
  it('sums meditation minutes for today', () => {
    const today = dateStr();
    const medHistory = [
      { date: today, durMin: 10, deleted: false },
      { date: today, durMin: 20, deleted: false },
      { date: '2020-01-01', durMin: 30, deleted: false },
    ];
    expect(getTodayMedMinutes(medHistory)).toBe(30);
  });
});

describe('DailyResetManager', () => {
  const mockDeps = {
    getLastReset: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    setLastReset: vi.fn<(date: string) => void>(),
    getCheckinHistory: vi.fn<() => CheckinEntry[]>().mockReturnValue([]),
    applyPatch: vi.fn<(patch: Record<string, unknown>) => void>(),
    persistProfile: vi.fn<(data: Record<string, unknown>) => void>(),
    getProfile: vi.fn<() => Record<string, unknown>>().mockReturnValue({}),
    getWaterGoal: vi.fn<() => number>().mockReturnValue(2000),
    onPlanDailyReset: vi.fn<(previousDate: string) => void>(),
    onHabitDailyReset: vi.fn<() => void>(),
    onReviewDailyReset: vi.fn<(period: 'week' | 'month') => void>(),
  } satisfies DailyResetDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps.getLastReset.mockResolvedValue(null);
    mockDeps.getCheckinHistory.mockReturnValue([]);
    mockDeps.getProfile.mockReturnValue({});
    mockDeps.getWaterGoal.mockReturnValue(2000);
  });

  it('performs reset when lastReset is null', async () => {
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.setLastReset).toHaveBeenCalled();
    expect(mockDeps.applyPatch).toHaveBeenCalledWith(expect.objectContaining({ waterMl: 0 }));
  });

  it('skips reset when already reset today', async () => {
    mockDeps.getLastReset.mockResolvedValue(dateStr());
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.setLastReset).not.toHaveBeenCalled();
  });

  it('calls onHabitDailyReset on check', async () => {
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onHabitDailyReset).toHaveBeenCalled();
  });

  // ─── Plan reset trigger — unified semantics (post Phase C) ───
  // Phase C flipped these from the characterization baseline: the Manager now
  // fires ONE onPlanDailyReset(lastReset) on any needsReset day (the store-side
  // dayCount loop covers every missed day), instead of a per-day callback
  // burst (O(N²) business calls) that skipped daysDiff=1 entirely.

  it('daysDiff=1: triggers onPlanDailyReset exactly once with lastReset', async () => {
    const yesterday = addDays(dateStr(), -1);
    mockDeps.getLastReset.mockResolvedValue(yesterday);
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledTimes(1);
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledWith(yesterday);
  });

  it('daysDiff=3: triggers onPlanDailyReset exactly ONCE with lastReset (not per-day)', async () => {
    const today = dateStr();
    const lastReset = addDays(today, -3);
    mockDeps.getLastReset.mockResolvedValue(lastReset);
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    // Single callback carries lastReset — the store-side dayCount loop
    // covers (D0,D1)(D1,D2)(D2,D3), so per-day callbacks would be O(N²).
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledTimes(1);
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledWith(lastReset);
  });

  it('lastReset=null (first run): does NOT trigger onPlanDailyReset', async () => {
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onPlanDailyReset).not.toHaveBeenCalled();
  });

  it('daysDiff=10: still exactly one onPlanDailyReset (uncapped — no per-day burst anymore)', async () => {
    const today = dateStr();
    mockDeps.getLastReset.mockResolvedValue(addDays(today, -10));
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledTimes(1);
  });

  it('review backfill stays per-day: a Sunday inside the backfill window triggers onReviewDailyReset(week)', async () => {
    // Construct lastReset so the backfill range (lastReset..lastReset+6)
    // contains the most recent Sunday
    const now = new Date();
    const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const lastReset = dateStr(new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 6));
    mockDeps.getLastReset.mockResolvedValue(lastReset);
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onPlanDailyReset).toHaveBeenCalledTimes(1);
    expect(mockDeps.onReviewDailyReset).toHaveBeenCalledWith('week');
  });

  it('invalid lastReset (corrupted storage): no backfill, no throw, lastReset still advances', async () => {
    mockDeps.getLastReset.mockResolvedValue('garbage');
    const manager = new DailyResetManager(mockDeps);
    await manager.check();
    expect(mockDeps.onPlanDailyReset).not.toHaveBeenCalled();
    expect(mockDeps.setLastReset).toHaveBeenCalledWith(dateStr());
  });

  it('destroys timer on destroy()', () => {
    const manager = new DailyResetManager(mockDeps);
    manager.destroy();
    // No error thrown
  });
});
