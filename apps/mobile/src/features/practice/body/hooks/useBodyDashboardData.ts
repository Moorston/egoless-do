import {
  dateStr,
  EXERCISE_CATEGORIES,
  PART_STRING_TO_KEY,
  type BodyGoal,
  type BodyTrainingPlan,
  type ExerciseEntry,
} from '@egoless-do/core';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useT } from '../../../../components/UI';
import { useShallowStore } from '../../../../store/useAppStore';
import { useTodayPlan } from './useTodayPlan';

/**
 * Aggregate all derived data for BodyDashboard.
 *
 * Extracted from BodyDashboard to shed complexity — these useMemo/useEffect
 * blocks lived in the component body and their internal branches counted toward
 * the parent function's cyclomatic complexity. At module/hook scope they have
 * their own complexity budget.
 *
 * Reads store via useShallowStore (architecture constraint: hooks consume
 * store via useShallow selectors). Does NOT receive store data as params.
 */
export function useBodyDashboardData() {
  const T = useT();
  const {
    userProfile,
    bodyGoals,
    bodyCheckins,
    exerciseLog,
    checkinHistory,
    bodyTrainingPlans,
    updateBodyTrainingPlan,
  } = useShallowStore(s => ({
    userProfile: s.userProfile,
    bodyGoals: s.bodyGoals,
    bodyCheckins: s.bodyCheckins,
    exerciseLog: s.exerciseLog,
    checkinHistory: s.checkinHistory,
    bodyTrainingPlans: s.bodyTrainingPlans,
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
  }));
  const profile = (userProfile ?? {}) as Record<string, unknown>;
  const { todayPlan, todayOverride, hasOverride, todayExercises, dateStr: todayDateStr } = useTodayPlan();

  const activeGoal = useMemo(() => (bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [bodyGoals]);
  const activeTrainingPlan = useMemo(() => (bodyTrainingPlans ?? []).find((p: BodyTrainingPlan) => !p.deleted && p.status === 'active'), [bodyTrainingPlans]);

  // Auto-mark expired plans as completed
  const expiredPlanIds = useMemo(() => {
    const today = dateStr();
    const ids: string[] = [];
    for (const plan of bodyTrainingPlans ?? []) {
      if (plan.status === 'active' && plan.endDate < today && !plan.deleted) {
        ids.push(plan.id);
      }
    }
    return ids;
  }, [bodyTrainingPlans]);

  useEffect(() => {
    if (expiredPlanIds.length === 0) return;
    for (const id of expiredPlanIds) {
      updateBodyTrainingPlan(id, { status: 'completed' });
    }
  }, [expiredPlanIds, updateBodyTrainingPlan]);

  // ── Celebration overlay ──
  const sevenDaysAgo = useMemo(() => dateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), []);

  // Detect newly completed plans
  const recentlyCompletedPlans = useMemo(() =>
    (bodyTrainingPlans ?? []).filter((p: BodyTrainingPlan) =>
      !p.deleted && p.status === 'completed' && p.endDate >= sevenDaysAgo
    ),
  [bodyTrainingPlans, sevenDaysAgo]);

  // Compute celebration data
  const celebrationData = useMemo(() => {
    const plan = recentlyCompletedPlans[0];
    if (!plan) return null;
    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) =>
      !e.deleted && e.planId === plan.id
    );
    const totalMin = Math.round(planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60);
    const totalCal = planExercises.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0);
    const completedDays = new Set(planExercises.map((e: ExerciseEntry) => dateStr(new Date(e.timestamp)))).size;
    const weeks = Math.max(1, Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 604800000));
    const totalDays = weeks * 7;

    return {
      planName: plan.name ?? '',
      totalDays,
      completedDays,
      totalDurationMin: totalMin,
      totalCalories: totalCal,
    };
  }, [recentlyCompletedPlans, exerciseLog]);

  // Calculate plan progress
  const planProgress = useMemo(() => {
    if (!activeTrainingPlan || !exerciseLog) return null;
    const today = new Date().getDay() || 7;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = dateStr(weekStart);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = dateStr(weekEnd);

    const planExercises = (exerciseLog ?? []).filter((e: ExerciseEntry) => !e.deleted && e.planId === activeTrainingPlan.id);
    const weekLogs = planExercises.filter((e: ExerciseEntry) => {
      const d = dateStr(new Date(e.timestamp));
      return d >= weekStartStr && d <= weekEndStr;
    });

    const activeTasks = activeTrainingPlan.tasks.filter(t => t.sportKey && t.sportKey !== 'rest');
    const weekDoneTasks = activeTasks.filter(t => weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === t.weekday));
    const todayDone = weekLogs.some((l: ExerciseEntry) => l.planTaskWeekday === today);

    return {
      weekComplete: weekDoneTasks.length,
      weekTotal: activeTasks.length,
      todayDone,
      totalDuration: Math.round(weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.durationSec ?? 0), 0) / 60),
      totalCal: weekLogs.reduce((s: number, e: ExerciseEntry) => s + (e.calories ?? 0), 0),
    };
  }, [activeTrainingPlan, exerciseLog]);

  // Recent exercises (last 3)
  const recentExercises = useMemo(() => {
    return (exerciseLog ?? [])
      .filter((e: ExerciseEntry) => !e.deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [exerciseLog]);

  // Latest body checkin for banner
  const latestCheckin = useMemo(() => {
    return (bodyCheckins ?? [])
      .filter(c => !c.deleted)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [bodyCheckins]);

  // Weight trend data for banner
  const weightTrend = useMemo(() => {
    const records = (checkinHistory ?? [])
      .filter(r => !r.deleted && r.weight != null && r.weight > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (records.length < 2) return null;
    const last = records[records.length - 1];
    const prev = records[records.length - 2];
    return {
      current: last.weight!,
      diff: last.weight! - prev.weight!,
      date: last.date,
    };
  }, [checkinHistory]);

  // Resolve today's plan display
  const todayPlanDisplay = useMemo(() => {
    if (!todayPlan || !todayPlan.part || todayPlan.part === 'rest') return null;
    const mappedKey = PART_STRING_TO_KEY[todayPlan.part] ?? todayPlan.part;
    const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
    return {
      icon: cat?.icon ?? '🏋️',
      label: cat ? T(cat.i18nKey) : todayPlan.part,
      note: todayPlan.note,
    };
  }, [todayPlan, T]);

  // ── Selected day derived state (for DayActionSheet) ──
  const [selectedDay] = useState<number | null>(null);

  const selectedDayTask = selectedDay ? activeTrainingPlan?.tasks.find(t => t.weekday === selectedDay) : undefined;
  const selectedDayIsRest = selectedDayTask?.sportKey === 'rest' || !selectedDayTask?.sportKey;
  const getSelectedDayDate = useCallback(() => {
    if (!selectedDay) return todayDateStr;
    const today = new Date();
    const todayDow = today.getDay() === 0 ? 7 : today.getDay();
    const diff = selectedDay - todayDow;
    const target = new Date(today);
    target.setDate(today.getDate() + diff);
    return dateStr(target);
  }, [selectedDay, todayDateStr]);
  const selectedDayDate = getSelectedDayDate();
  const selectedDayOverride = selectedDay ? activeTrainingPlan?.overrides?.[selectedDayDate] : undefined;

  // Id of the most recently completed plan — used by the celebration useEffect
  // that stays in the parent component (it toggles local showCelebration state).
  const recentPlanId = recentlyCompletedPlans[0]?.id ?? null;

  return {
    profile,
    activeGoal,
    activeTrainingPlan,
    expiredPlanIds,
    celebrationData,
    recentPlanId,
    planProgress,
    recentExercises,
    latestCheckin,
    weightTrend,
    checkinHistory,
    todayPlanDisplay,
    selectedDay,
    selectedDayTask,
    selectedDayIsRest,
    selectedDayDate,
    selectedDayOverride,
    todayPlan,
    todayOverride,
    hasOverride,
    todayExercises,
    todayDateStr,
  };
}
