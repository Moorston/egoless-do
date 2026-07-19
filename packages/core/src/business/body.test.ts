import { describe, it, expect } from 'vitest';
import { calcBMI, calcBMR, calcGoalProgress, recommendStrategy, createBodyGoal, getDayOverview } from './body';
import type { BodyTrainingPlan } from '../types';

// ─── calcBMI ──────────────────────────────────────────────────
describe('calcBMI', () => {
  it('calculates BMI correctly', () => {
    // 70kg / (1.75m)^2 = 22.9
    expect(calcBMI(70, 175)).toBe(22.9);
  });

  it('returns 0 for zero weight', () => {
    expect(calcBMI(0, 175)).toBe(0);
  });

  it('returns 0 for zero height', () => {
    expect(calcBMI(70, 0)).toBe(0);
  });

  it('returns 0 for negative inputs', () => {
    expect(calcBMI(-1, 175)).toBe(0);
    expect(calcBMI(70, -1)).toBe(0);
  });
});

// ─── calcBMR ──────────────────────────────────────────────────
describe('calcBMR', () => {
  it('calculates BMR for male', () => {
    // Mifflin-St Jeor: 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75 → 1649
    expect(calcBMR(70, 175, 30, 'male')).toBe(1649);
  });

  it('calculates BMR for female', () => {
    // 10*55 + 6.25*160 - 5*25 - 161 = 550 + 1000 - 125 - 161 = 1264
    expect(calcBMR(55, 160, 25, 'female')).toBe(1264);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calcBMR(0, 175, 30, 'male')).toBe(0);
    expect(calcBMR(70, 0, 30, 'male')).toBe(0);
    expect(calcBMR(70, 175, 0, 'male')).toBe(0);
  });
});

// ─── calcGoalProgress ─────────────────────────────────────────
describe('calcGoalProgress', () => {
  it('returns 100 when goal reached', () => {
    expect(calcGoalProgress(70, 70, 80)).toBe(100);
  });

  it('returns 0 at starting point', () => {
    expect(calcGoalProgress(80, 70, 80)).toBe(0);
  });

  it('returns 50 at halfway', () => {
    expect(calcGoalProgress(75, 70, 80)).toBe(50);
  });

  it('caps at 100', () => {
    expect(calcGoalProgress(65, 70, 80)).toBe(100); // past goal
  });

  it('returns 0 for null inputs', () => {
    expect(calcGoalProgress(undefined, 70, 80)).toBe(0);
    expect(calcGoalProgress(70, undefined, 80)).toBe(0);
    expect(calcGoalProgress(70, 70, undefined)).toBe(0);
  });

  it('returns 100 when initial equals target', () => {
    expect(calcGoalProgress(70, 70, 70)).toBe(100);
  });
});

// ─── recommendStrategy ────────────────────────────────────────
describe('recommendStrategy', () => {
  it('recommends gain_muscle for thin tags', () => {
    expect(recommendStrategy(['偏瘦'])).toBe('gain_muscle');
    expect(recommendStrategy(['上肢弱'])).toBe('gain_muscle');
  });

  it('recommends lose_fat for overweight', () => {
    expect(recommendStrategy(['偏胖'])).toBe('lose_fat');
  });

  it('recommends posture for neck/back issues', () => {
    expect(recommendStrategy(['颈椎'])).toBe('posture');
    expect(recommendStrategy(['腰酸'])).toBe('posture');
  });

  it('recommends recovery for fatigue tags', () => {
    expect(recommendStrategy(['体虚'])).toBe('recovery');
    expect(recommendStrategy(['乏力', '气短'])).toBe('recovery');
  });

  it('returns null for unknown tags', () => {
    expect(recommendStrategy(['健康'])).toBeNull();
    expect(recommendStrategy([])).toBeNull();
  });
});

// ─── createBodyGoal ───────────────────────────────────────────
describe('createBodyGoal', () => {
  it('creates a goal with defaults', () => {
    const goal = createBodyGoal({});
    expect(goal.id).toBeDefined();
    expect(goal.targetDate).toBe('');
    expect(goal.note).toBe('');
    expect(goal.deleted).toBe(false);
  });

  it('creates a goal with provided values', () => {
    const goal = createBodyGoal({ targetWeight: 70, strategy: 'lose_fat', note: 'test' });
    expect(goal.targetWeight).toBe(70);
    expect(goal.strategy).toBe('lose_fat');
    expect(goal.note).toBe('test');
  });
});

// ─── getDayOverview ────────────────────────────────────────────
describe('getDayOverview', () => {
  const basePlan: BodyTrainingPlan = {
    id: 'plan-1',
    name: '测试计划',
    startDate: '2026-07-01',
    endDate: '2026-07-28',
    tasks: [
      { weekday: 1, sportKey: 'chest_triceps', exercises: [
        { id: 'ex1', nameZh: '卧推', nameI18nKey: '', icon: '🏋️', category: 'chest_triceps', type: 'strength', muscleGroups: ['胸'], difficulty: 'beginner', defaultSets: 4, defaultReps: 10 },
        { id: 'ex2', nameZh: '飞鸟', nameI18nKey: '', icon: '🏋️', category: 'chest_triceps', type: 'strength', muscleGroups: ['胸'], difficulty: 'beginner', defaultSets: 3, defaultReps: 12 },
      ]},
      { weekday: 3, sportKey: 'rest', exercises: [] },
      { weekday: 5, sportKey: 'legs_core', exercises: [
        { id: 'ex3', nameZh: '深蹲', nameI18nKey: '', icon: '🦵', category: 'legs_core', type: 'strength', muscleGroups: ['腿'], difficulty: 'intermediate', defaultSets: 4, defaultReps: 10 },
      ]},
    ],
    status: 'active',
    updatedAt: Date.now(),
    deleted: false,
  };

  it('returns 7 days for a Monday reference date', () => {
    // 2026-07-06 is a Monday
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(basePlan, ref);
    expect(days).toHaveLength(7);
    expect(days[0].weekday).toBe(1);
    expect(days[6].weekday).toBe(7);
  });

  it('marks Monday (weekday=1) as planned with exercises', () => {
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(basePlan, ref);
    const mon = days.find(d => d.weekday === 1);
    expect(mon).toBeDefined();
    expect(mon!.status).toBe('planned');
    expect(mon!.exerciseCount).toBe(2);
    expect(mon!.intensity).toBeGreaterThan(0);
    expect(mon!.partIcon).toBe('💪');
  });

  it('marks Wednesday (weekday=3) as rest', () => {
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(basePlan, ref);
    const wed = days.find(d => d.weekday === 3);
    expect(wed).toBeDefined();
    expect(wed!.status).toBe('rest');
    expect(wed!.intensity).toBe(0);
  });

  it('marks days without tasks as empty', () => {
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(basePlan, ref);
    const tue = days.find(d => d.weekday === 2);
    expect(tue).toBeDefined();
    expect(tue!.status).toBe('empty');
    expect(tue!.intensity).toBe(0);
  });

  it('returns empty array for undefined plan', () => {
    const days = getDayOverview(undefined, new Date());
    expect(days).toEqual([]);
  });

  it('handles a plan with no tasks', () => {
    const emptyPlan: BodyTrainingPlan = { ...basePlan, tasks: [] };
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(emptyPlan, ref);
    expect(days).toHaveLength(7);
    expect(days.every(d => d.status === 'empty')).toBe(true);
  });

  it('adjusts week range based on reference date mid-week', () => {
    // 2026-07-09 is a Thursday
    const ref = new Date('2026-07-09T00:00:00');
    const days = getDayOverview(basePlan, ref);
    expect(days).toHaveLength(7);
    // Monday should be 2026-07-06
    expect(days[0].date).toBe('2026-07-06');
    // Sunday should be 2026-07-12
    expect(days[6].date).toBe('2026-07-12');
  });

  it('estimates duration for planned days', () => {
    const ref = new Date('2026-07-06T00:00:00');
    const days = getDayOverview(basePlan, ref);
    const mon = days.find(d => d.weekday === 1);
    expect(mon).toBeDefined();
    expect(mon!.durationMin).toBeGreaterThan(0);
  });
});
