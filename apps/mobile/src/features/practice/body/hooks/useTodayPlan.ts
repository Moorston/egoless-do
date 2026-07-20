// ─── useTodayPlan ─────────────────────────────────────────
// Shared hook for today's body plan + related derived data.
// Used by BodyScreen, BodyDashboard, BodyFlow and related modals
// to avoid duplicating today-plan lookup logic.
//
// Supports DayOverride: checks active BodyTrainingPlan for today's
// date override (skip/swap/adjust/custom).
import type { BodyPlan, BodyTrainingPlan, DayOverride, ExerciseDef } from '@egoless-do/core';
import { useMemo } from 'react';

import { useShallowStore } from '../../../../store/useAppStore';

export interface TodayPlanData {
  /** today's plan if one exists for current weekday, else undefined */
  todayPlan: BodyPlan | undefined;
  /** 1=Mon..7=Sun */
  weekday: number;
  /** YYYY-MM-DD for today */
  dateStr: string;
  /** active training plan (if any) */
  activeTrainingPlan: BodyTrainingPlan | undefined;
  /** today's override (if any) */
  todayOverride: DayOverride | undefined;
  /** true if today has an active override */
  hasOverride: boolean;
  /** exercises from training plan task for today (with override applied) */
  todayExercises: ExerciseDef[] | undefined;
}

export function useTodayPlan(): TodayPlanData {
  const { bodyPlans, bodyTrainingPlans } = useShallowStore(s => ({
    bodyPlans: s.bodyPlans,
    bodyTrainingPlans: s.bodyTrainingPlans,
  }));

  return useMemo(() => {
    const today = new Date();
    const weekday = today.getDay() === 0 ? 7 : today.getDay();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const ds = `${y}-${m}-${d}`;

    // Old bodyPlans lookup (backward compat)
    const plans = (bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted);
    const oldTodayPlan = plans.find((p: BodyPlan) => p.weekday === weekday);

    // Active training plan + override
    const activeTrainingPlan = (bodyTrainingPlans ?? []).find(
      (p: BodyTrainingPlan) => !p.deleted && p.status === 'active'
    );
    const todayOverride = activeTrainingPlan?.overrides?.[ds];

    // 从训练计划中推导今日方案（当旧 bodyPlan 无数据时）
    const trainingTodayTask = activeTrainingPlan?.tasks.find(t => t.weekday === weekday);
    const todayPlan = oldTodayPlan ?? (trainingTodayTask?.sportKey && trainingTodayTask.sportKey !== 'rest'
      ? { id: `training-${weekday}`, weekday, part: trainingTodayTask.sportKey, note: trainingTodayTask.note } as BodyPlan
      : undefined);

    // Resolve exercises from training plan task (with override applied)
    let todayExercises: ExerciseDef[] | undefined;
    if (todayOverride?.type === 'custom' && todayOverride.exercises) {
      todayExercises = todayOverride.exercises;
    } else if (todayOverride?.type === 'adjust' && todayOverride.exerciseAdjustments) {
      // Merge adjustments into original exercises
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
      weekday,
      dateStr: ds,
      activeTrainingPlan,
      todayOverride,
      hasOverride: !!todayOverride,
      todayExercises,
    };
  }, [bodyPlans, bodyTrainingPlans]);
}
