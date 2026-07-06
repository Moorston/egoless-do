import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDailyResetPatch, msUntilMidnight, getTodayFoodLog, getTodayMedMinutes, DailyResetManager } from './dailyReset';
import { dateStr } from './utils';

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
  let mockDeps: any;

  beforeEach(() => {
    mockDeps = {
      getLastReset: vi.fn().mockResolvedValue(null),
      setLastReset: vi.fn(),
      getCheckinHistory: vi.fn().mockReturnValue([]),
      applyPatch: vi.fn(),
      persistProfile: vi.fn(),
      getProfile: vi.fn().mockReturnValue({}),
      getWaterGoal: vi.fn().mockReturnValue(2000),
      onPlanDailyReset: vi.fn(),
      onHabitDailyReset: vi.fn(),
    };
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

  it('destroys timer on destroy()', () => {
    const manager = new DailyResetManager(mockDeps);
    manager.destroy();
    // No error thrown
  });
});
