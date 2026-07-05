import { describe, it, expect } from 'vitest';
import { addPlanItem, updatePlanItem, computeExpectedDays, shouldShowToday, computeItemProgress } from './plan';
import type { Plan, PlanItem, PlanItemPriority, PlanItemCheckin, CheckinFrequency } from '../types';

describe('addPlanItem', () => {
  it('should save priority and targetMetric', () => {
    const items = addPlanItem([], {
      planId: 'p1', name: 'Task 1', description: 'desc',
      startDate: '2026-01-01', endDate: '2026-01-31',
      link: 'fasting', priority: 'high', targetMetric: '16h fasting',
    });

    expect(items).toHaveLength(1);
    expect(items[0].priority).toBe('high');
    expect(items[0].targetMetric).toBe('16h fasting');
    expect(items[0].link).toBe('fasting');
    expect(items[0].name).toBe('Task 1');
    expect(items[0].description).toBe('desc');
  });

  it('should default priority to medium and targetMetric to empty', () => {
    const items = addPlanItem([], {
      planId: 'p1', name: 'Task 2',
      startDate: '2026-01-01', endDate: '2026-01-31',
    });

    expect(items[0].priority).toBe('medium');
    expect(items[0].targetMetric).toBe('');
    expect(items[0].link).toBe('manual');
  });

  it('should preserve all fields when adding multiple items', () => {
    let items = addPlanItem([], {
      planId: 'p1', name: 'Task A', startDate: '2026-01-01', endDate: '2026-01-31',
      priority: 'high', targetMetric: 'target A',
    });
    items = addPlanItem(items, {
      planId: 'p1', name: 'Task B', startDate: '2026-01-01', endDate: '2026-01-31',
      priority: 'low', targetMetric: 'target B', link: 'meditation',
    });

    expect(items).toHaveLength(2);
    expect(items[0].priority).toBe('high');
    expect(items[0].targetMetric).toBe('target A');
    expect(items[1].priority).toBe('low');
    expect(items[1].targetMetric).toBe('target B');
    expect(items[1].link).toBe('meditation');
  });
});

describe('updatePlanItem', () => {
  it('should update priority and targetMetric', () => {
    const items: PlanItem[] = [{
      id: 'item1', planId: 'p1', name: 'Task', description: '',
      startDate: '2026-01-01', endDate: '2026-01-31', contentUrl: '',
      totalCheckinDays: 0, status: 'not_started', progress: 0,
      link: 'manual', priority: 'medium', targetMetric: '',
      order: 0, updatedAt: 0, deleted: false,
    }];

    const updated = updatePlanItem(items, 'item1', {
      priority: 'high', targetMetric: 'new target',
    });

    expect(updated[0].priority).toBe('high');
    expect(updated[0].targetMetric).toBe('new target');
    expect(updated[0].name).toBe('Task'); // other fields preserved
  });

  it('should update link and description', () => {
    const items: PlanItem[] = [{
      id: 'item1', planId: 'p1', name: 'Task', description: 'old',
      startDate: '2026-01-01', endDate: '2026-01-31', contentUrl: '',
      totalCheckinDays: 0, status: 'not_started', progress: 0,
      link: 'manual', priority: 'medium', targetMetric: '',
      order: 0, updatedAt: 0, deleted: false,
    }];

    const updated = updatePlanItem(items, 'item1', {
      link: 'fasting', description: 'new desc', priority: 'low',
    });

    expect(updated[0].link).toBe('fasting');
    expect(updated[0].description).toBe('new desc');
    expect(updated[0].priority).toBe('low');
    expect(updated[0].targetMetric).toBe(''); // unchanged
  });
});

describe('computeExpectedDays', () => {
  it('should return total expected days for the full item period (daily mode)', () => {
    const freq: CheckinFrequency = { mode: 'daily' };
    // today before endDate — still returns total (10 days)
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-10', '2026-01-05')).toBe(10);
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-10', '2026-01-10')).toBe(10);
    // today past endDate — still returns total
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-10', '2026-01-15')).toBe(10);
  });

  it('should return correct count for interval mode', () => {
    const freq: CheckinFrequency = { mode: 'interval', every: 3 };
    // Every 3 days: day 1, 4, 7, 10 = 4 periods in 10 days (regardless of today)
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-10', '2026-01-10')).toBe(4);
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-10', '2026-01-05')).toBe(4);
  });

  it('should return correct count for weekly mode', () => {
    const freq: CheckinFrequency = { mode: 'weekly', target: 3 };
    // Jan 1-14 (Thu→Wed): partial week (4/7*3=ceil1.71=2) + full week (3) + partial week (3/7*3=ceil1.29=2) = 7
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-14', '2026-01-07')).toBe(7);
    // Jan 5-18 (Mon→Sun): full week (3) + full week (3) = 6
    expect(computeExpectedDays(freq, '2026-01-05', '2026-01-18', '2026-01-11')).toBe(6);
  });

  it('should return correct count for weekly_fixed mode', () => {
    const freq: CheckinFrequency = { mode: 'weekly_fixed', days: [1, 3, 5] }; // Mon, Wed, Fri
    // Jan 1-7 has: Fri(2), Mon(5), Wed(7) = 3 days (regardless of today)
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-07', '2026-01-07')).toBe(3);
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-07', '2026-01-03')).toBe(3);
  });

  it('should return correct count for monthly mode', () => {
    const freq: CheckinFrequency = { mode: 'monthly', target: 10 };
    // January has 31 days, 10 days target — total is 10 (regardless of today)
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-31', '2026-01-15')).toBe(10);
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-31', '2026-01-31')).toBe(10);
  });

  it('should return correct count for monthly_fixed mode', () => {
    const freq: CheckinFrequency = { mode: 'monthly_fixed', dates: [1, 15] };
    // Jan 1-31 has day 1 and day 15 = 2 dates (regardless of today)
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-31', '2026-01-31')).toBe(2);
    expect(computeExpectedDays(freq, '2026-01-01', '2026-01-31', '2026-01-10')).toBe(2);
  });

  it('should default to daily mode when frequency is undefined', () => {
    expect(computeExpectedDays(undefined, '2026-01-01', '2026-01-10', '2026-01-05')).toBe(10);
  });

  it('should return total range even when today is before startDate', () => {
    // startDate=Jan 5, endDate=Jan 10 → 6 days total
    expect(computeExpectedDays({ mode: 'daily' }, '2026-01-05', '2026-01-10', '2026-01-01')).toBe(6);
  });

  it('should return 0 when endDate is before startDate', () => {
    expect(computeExpectedDays({ mode: 'daily' }, '2026-01-10', '2026-01-05', '2026-01-01')).toBe(0);
  });
});

describe('shouldShowToday', () => {
  it('should always return true for daily mode', () => {
    expect(shouldShowToday({ mode: 'daily' }, '2026-01-01', '2026-01-05', [])).toBe(true);
  });

  it('should show on interval period start days with carry-over', () => {
    const freq: CheckinFrequency = { mode: 'interval', every: 3 };
    // Day 0 and day 3 are period starts — show
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-01', [])).toBe(true);
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-04', [])).toBe(true);
    // Day 2 (within period 0) — show because carry-over (target not met yet)
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-02', [])).toBe(true);
  });

  it('should stay visible on interval checkin day, hide next period', () => {
    const freq: CheckinFrequency = { mode: 'interval', every: 3 };
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
    ];
    // Checked in today → stays visible
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-01', checkins)).toBe(true);
    // Next day (same period, already done) → hidden
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-02', checkins)).toBe(false);
    // Period 1 (day 3-5) has no checkins → should show
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-04', checkins)).toBe(true);
  });

  it('should show if weekly target not met', () => {
    const freq: CheckinFrequency = { mode: 'weekly', target: 3 };
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-06', done: true, updatedAt: 0, deleted: false }, // Mon
    ];
    // 2026-01-07 is Wednesday, week starts Mon Jan 5
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-07', checkins)).toBe(true);
  });

  it('should stay visible on weekly checkin day, hide later in week when target met', () => {
    const freq: CheckinFrequency = { mode: 'weekly', target: 2 };
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-06', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-07', done: true, updatedAt: 0, deleted: false },
    ];
    // Checked in today (Jan 7) → stays visible
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-07', checkins)).toBe(true);
    // Later in same week, target met → hidden
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-08', checkins)).toBe(false);
  });

  it('should show only on specified weekdays for weekly_fixed', () => {
    const freq: CheckinFrequency = { mode: 'weekly_fixed', days: [1, 3, 5] }; // Mon, Wed, Fri
    // 2026-01-05 is Monday
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-05', [])).toBe(true);
    // 2026-01-06 is Tuesday
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-06', [])).toBe(false);
  });

  it('should show if monthly target not met', () => {
    const freq: CheckinFrequency = { mode: 'monthly', target: 10 };
    const checkins: PlanItemCheckin[] = [];
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-15', checkins)).toBe(true);
  });

  it('should not show if monthly target met', () => {
    const freq: CheckinFrequency = { mode: 'monthly', target: 2 };
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-02', done: true, updatedAt: 0, deleted: false },
    ];
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-15', checkins)).toBe(false);
  });

  it('should show only on specified dates for monthly_fixed', () => {
    const freq: CheckinFrequency = { mode: 'monthly_fixed', dates: [1, 15] };
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-01', [])).toBe(true);
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-15', [])).toBe(true);
    expect(shouldShowToday(freq, '2026-01-01', '2026-01-10', [])).toBe(false);
  });

  it('should default to daily mode when frequency is undefined', () => {
    expect(shouldShowToday(undefined, '2026-01-01', '2026-01-05', [])).toBe(true);
  });
});

describe('computeItemProgress', () => {
  const baseItem: PlanItem = {
    id: 'item1', planId: 'p1', name: 'Task', description: '',
    startDate: '2026-01-01', endDate: '2026-01-10', contentUrl: '',
    totalCheckinDays: 0, status: 'in_progress', progress: 0,
    link: 'manual', priority: 'medium', targetMetric: '',
    order: 0, updatedAt: 0, deleted: false,
  };

  it('should return 0 when no checkins', () => {
    expect(computeItemProgress(baseItem, [], '2026-01-05')).toBe(0);
  });

  it('should calculate progress for daily mode', () => {
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-02', done: true, updatedAt: 0, deleted: false },
    ];
    // 2 done / 10 total expected = 20%
    expect(computeItemProgress(baseItem, checkins, '2026-01-05')).toBe(20);
  });

  it('should calculate progress for interval mode', () => {
    const item = { ...baseItem, frequency: { mode: 'interval' as const, every: 3 } };
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-04', done: true, updatedAt: 0, deleted: false },
    ];
    // 2 done / 4 expected (day 1,4,7,10) = 50%
    expect(computeItemProgress(item, checkins, '2026-01-10')).toBe(50);
  });

  it('should cap progress at 100%', () => {
    const checkins: PlanItemCheckin[] = Array.from({ length: 15 }, (_, i) => ({
      id: `c${i}`, planItemId: 'item1', date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      done: true, updatedAt: 0, deleted: false,
    }));
    expect(computeItemProgress(baseItem, checkins, '2026-01-10')).toBe(100);
  });

  it('should ignore checkins for other items', () => {
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'other', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-02', done: true, updatedAt: 0, deleted: false },
    ];
    // 1 done / 10 total expected = 10%
    expect(computeItemProgress(baseItem, checkins, '2026-01-05')).toBe(10);
  });

  it('should ignore undone checkins', () => {
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-02', done: false, updatedAt: 0, deleted: false },
    ];
    // 1 done / 10 total expected = 10%
    expect(computeItemProgress(baseItem, checkins, '2026-01-05')).toBe(10);
  });

  it('should clamp today to endDate', () => {
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
    ];
    // Today is past endDate, but progress should still work
    // 1 done / 10 expected = 10%
    expect(computeItemProgress(baseItem, checkins, '2026-01-20')).toBe(10);
  });

  it('should deduplicate checkins by date', () => {
    const checkins: PlanItemCheckin[] = [
      { id: 'c1', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c2', planItemId: 'item1', date: '2026-01-01', done: true, updatedAt: 0, deleted: false },
      { id: 'c3', planItemId: 'item1', date: '2026-01-02', done: true, updatedAt: 0, deleted: false },
      { id: 'c4', planItemId: 'item1', date: '2026-01-02', done: true, updatedAt: 0, deleted: false },
    ];
    // 2 unique dates done / 10 total expected = 20%
    expect(computeItemProgress(baseItem, checkins, '2026-01-05')).toBe(20);
  });
});
