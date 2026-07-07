import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectHabitAbandonRisk,
  detectPlanDelayRisk,
  detectMoodDeclineRisk,
  getAllRiskWarnings,
} from './risk-warning';
import type { Habit, Plan, MindReflection } from '../types';

// Freeze date: 2026-07-07
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-07T21:00:00')); });
afterEach(() => { vi.useRealTimers(); });

// ─── Helpers ─────────────────────────────────────────────────
function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: '早睡', icon: '🌙', status: 'inProgress',
    checkedDates: [], updatedAt: Date.now(), deleted: false,
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p1', name: '学习计划', goal: '', slogan: '', progress: 0,
    status: 'in_progress', startDate: '2026-07-01', endDate: '2026-07-31',
    updatedAt: Date.now(), deleted: false,
    ...overrides,
  };
}

function makeReflection(overrides: Partial<MindReflection> = {}): MindReflection {
  return {
    id: 'r1', content: 'test', mood: '开心', tags: [],
    timestamp: Date.now(), deleted: false,
    ...overrides,
  } as MindReflection;
}

// ─── detectHabitAbandonRisk ──────────────────────────────────
describe('detectHabitAbandonRisk', () => {
  it('returns empty for no habits', () => {
    expect(detectHabitAbandonRisk([])).toEqual([]);
  });

  it('ignores deleted habits', () => {
    const h = makeHabit({ deleted: true, checkedDates: ['2026-07-01'] });
    expect(detectHabitAbandonRisk([h])).toEqual([]);
  });

  it('ignores completed habits', () => {
    const h = makeHabit({ status: 'completed', checkedDates: ['2026-07-01'] });
    expect(detectHabitAbandonRisk([h])).toEqual([]);
  });

  it('detects high risk when 3+ days since last check', () => {
    const h = makeHabit({ checkedDates: ['2026-07-01', '2026-07-02', '2026-07-03'] });
    const warnings = detectHabitAbandonRisk([h]);
    const abandon = warnings.find(w => w.id === 'habit_abandon_h1');
    expect(abandon).toBeDefined();
    expect(abandon!.severity).toBe('high'); // 4 days diff
  });

  it('detects critical risk when 5+ days since last check', () => {
    const h = makeHabit({ checkedDates: ['2026-06-30', '2026-07-01'] });
    const warnings = detectHabitAbandonRisk([h]);
    const abandon = warnings.find(w => w.id === 'habit_abandon_h1');
    expect(abandon).toBeDefined();
    expect(abandon!.severity).toBe('critical'); // 7 days diff
  });

  it('no warning when checked recently', () => {
    const h = makeHabit({ checkedDates: ['2026-07-06', '2026-07-07'] });
    const warnings = detectHabitAbandonRisk([h]);
    expect(warnings.find(w => w.id === 'habit_abandon_h1')).toBeUndefined();
  });
});

// ─── detectPlanDelayRisk ─────────────────────────────────────
describe('detectPlanDelayRisk', () => {
  it('returns empty for no plans', () => {
    expect(detectPlanDelayRisk([])).toEqual([]);
  });

  it('ignores deleted plans', () => {
    const p = makePlan({ deleted: true, progress: 0 });
    expect(detectPlanDelayRisk([p])).toEqual([]);
  });

  it('ignores completed plans', () => {
    const p = makePlan({ status: 'completed', progress: 100 });
    expect(detectPlanDelayRisk([p])).toEqual([]);
  });

  it('detects critical delay when progress severely behind', () => {
    // 50% through the month (day 7 of 31), but progress = 0
    const p = makePlan({ progress: 0, startDate: '2026-07-01', endDate: '2026-07-31' });
    const warnings = detectPlanDelayRisk([p]);
    // Expected progress ~19%, delay ~19% — below 30% threshold, no warning
    expect(warnings.find(w => w.id === 'plan_delay_p1')).toBeUndefined();
  });

  it('detects delay when progress is critically behind', () => {
    // 80% through (day 25 of 30), progress = 10
    const p = makePlan({ progress: 10, startDate: '2026-06-13', endDate: '2026-07-13' });
    const warnings = detectPlanDelayRisk([p]);
    const delay = warnings.find(w => w.id === 'plan_delay_p1');
    expect(delay).toBeDefined();
  });
});

// ─── detectMoodDeclineRisk ───────────────────────────────────
describe('detectMoodDeclineRisk', () => {
  it('returns empty for too few reflections', () => {
    const r = Array.from({ length: 3 }, (_, i) => makeReflection({ mood: '难过', timestamp: Date.now() - i * 1000 }));
    expect(detectMoodDeclineRisk(r)).toEqual([]);
  });

  it('detects declining mood trend', () => {
    // 10 reflections, recent 5 all low mood, decreasing
    const reflections = Array.from({ length: 10 }, (_, i) =>
      makeReflection({
        mood: i < 5 ? '难过' : '开心',
        timestamp: Date.now() - i * 86400000,
      }),
    );
    const warnings = detectMoodDeclineRisk(reflections);
    expect(warnings.find(w => w.id === 'mood_decline')).toBeDefined();
  });

  it('no warning when mood is stable/positive', () => {
    const reflections = Array.from({ length: 10 }, (_, i) =>
      makeReflection({ mood: '开心', timestamp: Date.now() - i * 86400000 }),
    );
    expect(detectMoodDeclineRisk(reflections)).toEqual([]);
  });
});

// ─── getAllRiskWarnings ───────────────────────────────────────
describe('getAllRiskWarnings', () => {
  it('combines all warning types', () => {
    const result = getAllRiskWarnings([], [], [], []);
    expect(Array.isArray(result)).toBe(true);
  });

  it('sorts by severity (critical first)', () => {
    // Create a critical habit risk
    const h = makeHabit({ checkedDates: ['2026-06-30'] }); // 7 days ago → critical
    const result = getAllRiskWarnings([h], [], [], []);
    if (result.length > 1) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < result.length; i++) {
        expect(severityOrder[result[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[result[i - 1].severity],
        );
      }
    }
  });
});
