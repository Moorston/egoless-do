import {
  type BodyStrategy,
  type BodyTrainingPlan,
  type DayOverride,
  type ExerciseDef,
} from '@egoless-do/core';
import { useCallback } from 'react';

import { useShallowStore } from '../../../../store/useAppStore';

export interface UseBodyOverridesParams {
  todayDateStr: string;
  activeTrainingPlan: BodyTrainingPlan | undefined;
  selectedDay: number | null;
  selectedDayDate: string;
  setShowDaySwapPicker: (v: boolean) => void;
  setShowDayAction: (v: boolean) => void;
}

/**
 * Aggregate override-related handlers for BodyDashboard.
 *
 * Extracted from BodyDashboard to shed complexity — these useCallback blocks
 * lived in the component body and their internal branches counted toward the
 * parent function's cyclomatic complexity.
 *
 * Reads store actions via useShallowStore (architecture constraint).
 * Receives only *derived* values (not raw store data) as params.
 */
export function useBodyOverrides({
  todayDateStr,
  activeTrainingPlan,
  selectedDay,
  selectedDayDate,
  setShowDaySwapPicker,
  setShowDayAction,
}: UseBodyOverridesParams) {
  const { updateBodyTrainingPlan } = useShallowStore(s => ({
    updateBodyTrainingPlan: s.updateBodyTrainingPlan,
  }));

  const setOverride = useCallback((date: string, override: DayOverride) => {
    if (!activeTrainingPlan) return;
    const newOverrides = { ...(activeTrainingPlan.overrides ?? {}), [date]: override };
    updateBodyTrainingPlan(activeTrainingPlan.id, { overrides: newOverrides });
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  const clearOverride = useCallback((date: string) => {
    if (!activeTrainingPlan) return;
    const newOverrides = { ...(activeTrainingPlan.overrides ?? {}) };
    delete newOverrides[date];
    updateBodyTrainingPlan(activeTrainingPlan.id, { overrides: newOverrides });
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  const handleUndoOverride = useCallback(() => {
    clearOverride(todayDateStr);
  }, [clearOverride, todayDateStr]);

  const handleSwapConfirm = useCallback((sportKey: string, exercises?: ExerciseDef[]) => {
    setOverride(todayDateStr, {
      type: exercises ? 'custom' : 'swap',
      swapSportKey: exercises ? undefined : sportKey,
      exercises,
      createdAt: Date.now(),
    });
  }, [setOverride, todayDateStr]);

  const handleAdjustConfirm = useCallback((adjustments: { exerciseId: string; sets: number; reps: number; durationSec?: number }[]) => {
    setOverride(todayDateStr, {
      type: 'adjust',
      exerciseAdjustments: adjustments,
      createdAt: Date.now(),
    });
  }, [setOverride, todayDateStr]);

  const handleDaySkip = useCallback(() => {
    if (!selectedDay) return;
    setOverride(selectedDayDate, { type: 'skip', createdAt: Date.now() });
  }, [selectedDay, selectedDayDate, setOverride]);

  const handleDaySwapConfirm = useCallback((targetDay: number) => {
    if (!selectedDay || !activeTrainingPlan || targetDay === selectedDay) return;
    const tasks = [...activeTrainingPlan.tasks];
    const srcIdx = tasks.findIndex(t => t.weekday === selectedDay);
    const dstIdx = tasks.findIndex(t => t.weekday === targetDay);
    if (srcIdx === -1 && dstIdx === -1) return;
    // Swap the two tasks (or move if one day has no task)
    const newTasks = tasks.map(t => ({ ...t }));
    const srcTask = newTasks.find(t => t.weekday === selectedDay);
    const dstTask = newTasks.find(t => t.weekday === targetDay);
    if (srcTask) srcTask.weekday = targetDay;
    if (dstTask) dstTask.weekday = selectedDay;
    updateBodyTrainingPlan(activeTrainingPlan.id, { tasks: newTasks, updatedAt: Date.now() });
    setShowDaySwapPicker(false);
    setShowDayAction(false);
  }, [selectedDay, activeTrainingPlan, updateBodyTrainingPlan, setShowDaySwapPicker, setShowDayAction]);

  const handleSaveGoalLight = useCallback((data: { strategy?: BodyStrategy; targetWeight?: number; targetBodyFat?: number; goalNote?: string }) => {
    if (activeTrainingPlan) {
      updateBodyTrainingPlan(activeTrainingPlan.id, data);
    }
  }, [activeTrainingPlan, updateBodyTrainingPlan]);

  return {
    setOverride,
    clearOverride,
    handleUndoOverride,
    handleSwapConfirm,
    handleAdjustConfirm,
    handleDaySkip,
    handleDaySwapConfirm,
    handleSaveGoalLight,
  };
}
