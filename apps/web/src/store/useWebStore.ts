// ─── Zustand store for web (IndexedDB backed) ────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager, createResetDataPatch } from '@egoless-do/core';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice,
} from '@egoless-do/core';
import {
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice,
} from '@egoless-do/core';

// Configure API base (empty = same origin)
setApiBase('');

// Minimal in-memory adapter (web frontend is deprecated, no sync needed)
const noopAdapter = {
  persistChange: async () => {},
  markDeleted: async () => {},
};

export type WebStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & { resetData: () => void };

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

export const useWebStore = create<WebStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(noopAdapter, () => {})(...a),
      ...createHabitSlice(noopAdapter, triggerAutoSync)(...a),
      ...createReflectionSlice(noopAdapter)(...a),
      ...createFastingSlice(noopAdapter, triggerAutoSync)(...a),
      ...createMeditationSlice(noopAdapter, triggerAutoSync)(...a),
      ...createFoodSlice(noopAdapter)(...a),
      ...createExerciseSlice(noopAdapter, triggerAutoSync)(...a),
      ...createCheckinSlice(noopAdapter, triggerAutoSync)(...a),
      ...createProfileSlice(noopAdapter)(...a),
      ...createSettingsSlice()(...a),
      ...createTagMoodSlice()(...a),
      ...createPlanSlice(noopAdapter)(...a),
      ...createRecycleBinSlice(noopAdapter)(...a),
      ...createThoughtTrailSlice()(...a),
      resetData() {
        const [set, get] = a;
        const { auth, theme, language } = get();
        set(createResetDataPatch(auth, theme, language) as any);
      },
    }),
    {
      name: 'egoless-do-web',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: s => ({
        auth: s.auth, theme: s.theme, language: s.language, streak: s.streak,
        waterMl: s.waterMl, waterGoal: s.waterGoal, calGoal: s.calGoal,
        foodLog: s.foodLog, habits: s.habits, reflections: s.reflections,
        activeFasting: s.activeFasting,
        fastingHistory: s.fastingHistory, totalMedMinutes: s.totalMedMinutes,
        medHistory: s.medHistory, checkinHistory: s.checkinHistory,
        userProfile: s.userProfile, remindEnabled: s.remindEnabled, remindTime: s.remindTime,
        weightUnit: s.weightUnit, customTags: s.customTags, customMoods: s.customMoods,
        allTagsOrder: s.allTagsOrder, allMoodsOrder: s.allMoodsOrder,
        customFoodPresets: s.customFoodPresets,
        exerciseLog: s.exerciseLog,
        plans: s.plans, planItems: s.planItems, planItemCheckins: s.planItemCheckins,
        dailyCustomTodos: s.dailyCustomTodos, dailyTodoHistory: s.dailyTodoHistory,
        graceHistory: s.graceHistory, thoughtTrails: s.thoughtTrails,
        recycleBin: s.recycleBin,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Set the auto sync callback after store is created
        _autoSyncCallback = () => {
          useWebStore.getState().autoSyncPlanItems?.();
        };

        // Check habit auto status after rehydration
        setTimeout(() => {
          useWebStore.getState().checkAutoStatus?.();
        }, 0);

        const dailyReset = new DailyResetManager({
          getLastReset: () => localStorage.getItem(DAILY_RESET_KEY),
          setLastReset: (date) => localStorage.setItem(DAILY_RESET_KEY, date),
          getCheckinHistory: () => useWebStore.getState().checkinHistory ?? [],
          applyPatch: (patch) => useWebStore.setState(patch as any),
          getProfile: () => (useWebStore.getState().userProfile ?? {}) as Record<string, unknown>,
          getWaterGoal: () => useWebStore.getState().waterGoal ?? 2000,
          persistProfile: () => {},
          onPlanDailyReset: (previousDate) => {
            useWebStore.getState().performDailyReset?.(previousDate);
          },
          onHabitDailyReset: () => {
            useWebStore.getState().checkHabitAutoStatus?.();
          },
        });
        dailyReset.start();
      },
    }
  )
);
