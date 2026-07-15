import { describe, it, expect } from 'vitest';

// ─── useTodayPlan override logic tests ──────────────────────
// These test the pure logic of applying DayOverride to today's plan.
// The actual hook uses Zustand store, so we test the derivation logic directly.

import type { BodyPlan, BodyTrainingPlan, DayOverride, ExerciseDef } from '@egoless-do/core';

// Helper: simulate the override resolution logic from useTodayPlan
function resolveTodayWithOverride(
  bodyPlans: BodyPlan[],
  bodyTrainingPlans: BodyTrainingPlan[],
  weekday: number,
  dateStr: string,
): {
  todayPlan: BodyPlan | undefined;
  todayOverride: DayOverride | undefined;
  hasOverride: boolean;
  todayExercises: ExerciseDef[] | undefined;
} {
  const plans = bodyPlans.filter(p => !p.deleted);
  const todayPlan = plans.find(p => p.weekday === weekday);

  const activeTrainingPlan = bodyTrainingPlans.find(
    p => !p.deleted && p.status === 'active'
  );
  const todayOverride = activeTrainingPlan?.overrides?.[dateStr];

  let todayExercises: ExerciseDef[] | undefined;
  if (todayOverride?.type === 'custom' && todayOverride.exercises) {
    todayExercises = todayOverride.exercises;
  } else if (todayOverride?.type === 'adjust' && todayOverride.exerciseAdjustments) {
    const task = activeTrainingPlan?.tasks.find(t => t.weekday === weekday);
    if (task?.exercises) {
      todayExercises = task.exercises.map(ex => {
        const adj = todayOverride.exerciseAdjustments?.find(a => a.exerciseId === ex.id);
        return adj ? { ...ex, defaultSets: adj.sets ?? ex.defaultSets, defaultReps: adj.reps ?? ex.defaultReps } : ex;
      });
    }
  } else {
    const task = activeTrainingPlan?.tasks.find(t => t.weekday === weekday);
    todayExercises = task?.exercises;
  }

  return {
    todayPlan,
    todayOverride,
    hasOverride: !!todayOverride,
    todayExercises,
  };
}

const mockExercise: ExerciseDef = {
  id: 'ex1',
  nameZh: '深蹲',
  nameI18nKey: 'exerciseSquat',
  icon: '🏋️',
  category: 'lower_body',
  type: 'strength',
  muscleGroups: ['quads', 'glutes'],
  difficulty: 'beginner',
  defaultSets: 3,
  defaultReps: 12,
};

const mockPlan: BodyPlan = {
  id: 'plan1',
  weekday: 2,
  part: 'chest',
  sportKey: 'upper_body',
  updatedAt: Date.now(),
  deleted: false,
};

const mockTrainingPlan: BodyTrainingPlan = {
  id: 'tp1',
  name: '增肌计划',
  startDate: '2026-07-01',
  endDate: '2026-07-28',
  tasks: [
    { weekday: 1, sportKey: 'lower_body', exercises: [mockExercise] },
    { weekday: 2, sportKey: 'upper_body', exercises: [mockExercise] },
    { weekday: 3, sportKey: 'rest' },
  ],
  status: 'active',
  updatedAt: Date.now(),
  deleted: false,
};

describe('useTodayPlan override logic', () => {
  it('returns no override when none exists', () => {
    const result = resolveTodayWithOverride(
      [mockPlan],
      [mockTrainingPlan],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(false);
    expect(result.todayOverride).toBeUndefined();
    expect(result.todayPlan).toEqual(mockPlan);
  });

  it('applies skip override', () => {
    const planWithOverride = {
      ...mockTrainingPlan,
      overrides: {
        '2026-07-15': { type: 'skip' as const, createdAt: Date.now() },
      },
    };
    const result = resolveTodayWithOverride(
      [mockPlan],
      [planWithOverride],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(true);
    expect(result.todayOverride?.type).toBe('skip');
  });

  it('applies swap override', () => {
    const planWithOverride = {
      ...mockTrainingPlan,
      overrides: {
        '2026-07-15': { type: 'swap' as const, swapSportKey: 'cardio', createdAt: Date.now() },
      },
    };
    const result = resolveTodayWithOverride(
      [mockPlan],
      [planWithOverride],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(true);
    expect(result.todayOverride?.type).toBe('swap');
    expect(result.todayOverride?.swapSportKey).toBe('cardio');
  });

  it('applies adjust override with exercise modifications', () => {
    const planWithOverride = {
      ...mockTrainingPlan,
      overrides: {
        '2026-07-15': {
          type: 'adjust' as const,
          exerciseAdjustments: [
            { exerciseId: 'ex1', sets: 4, reps: 10 },
          ],
          createdAt: Date.now(),
        },
      },
    };
    const result = resolveTodayWithOverride(
      [mockPlan],
      [planWithOverride],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(true);
    expect(result.todayExercises?.[0].defaultSets).toBe(4);
    expect(result.todayExercises?.[0].defaultReps).toBe(10);
  });

  it('applies custom override with full exercise list', () => {
    const customEx: ExerciseDef = {
      ...mockExercise,
      id: 'custom1',
      nameZh: '自定义动作',
    };
    const planWithOverride = {
      ...mockTrainingPlan,
      overrides: {
        '2026-07-15': {
          type: 'custom' as const,
          exercises: [customEx],
          createdAt: Date.now(),
        },
      },
    };
    const result = resolveTodayWithOverride(
      [mockPlan],
      [planWithOverride],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(true);
    expect(result.todayExercises?.[0].nameZh).toBe('自定义动作');
  });

  it('ignores overrides for other dates', () => {
    const planWithOverride = {
      ...mockTrainingPlan,
      overrides: {
        '2026-07-16': { type: 'skip' as const, createdAt: Date.now() },
      },
    };
    const result = resolveTodayWithOverride(
      [mockPlan],
      [planWithOverride],
      2,
      '2026-07-15'
    );
    expect(result.hasOverride).toBe(false);
  });

  it('returns exercises from training plan task when no override', () => {
    const result = resolveTodayWithOverride(
      [mockPlan],
      [mockTrainingPlan],
      1,
      '2026-07-15'
    );
    expect(result.todayExercises).toHaveLength(1);
    expect(result.todayExercises?.[0].nameZh).toBe('深蹲');
  });
});
