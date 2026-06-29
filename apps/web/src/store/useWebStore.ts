// ─── Zustand store for web (IndexedDB backed) ────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager, createResetDataPatch } from '@egoless-do/core';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice, TrailNoteSlice, ReflectionLinkSlice, AISlice, ReviewSlice,
} from '@egoless-do/core';
import {
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice,
  createTrailNoteSlice, createReflectionLinkSlice, createAISlice, createReviewSlice,
} from '@egoless-do/core';

// Configure API base (empty = same origin)
setApiBase('');

// Minimal in-memory adapter (web frontend is deprecated, no sync needed)
const noopAdapter = {
  persistChange: async () => {},
  markDeleted: async () => {},
  batchDelete: async () => {},
};

export type WebStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & TrailNoteSlice & ReflectionLinkSlice & AISlice & ReviewSlice
  & { resetData: () => void };

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
      ...createFoodSlice(noopAdapter, undefined, triggerAutoSync)(...a),
      ...createExerciseSlice(noopAdapter, triggerAutoSync)(...a),
      ...createCheckinSlice(noopAdapter, triggerAutoSync)(...a),
      ...createProfileSlice(noopAdapter)(...a),
      ...createSettingsSlice()(...a),
      ...createTagMoodSlice()(...a),
      ...createPlanSlice(noopAdapter)(...a),
      ...createRecycleBinSlice(noopAdapter)(...a),
      ...createThoughtTrailSlice()(...a),
      ...createTrailNoteSlice(noopAdapter)(...a),
      ...createReflectionLinkSlice(noopAdapter)(...a),
      ...createAISlice()( ...a),
      ...createReviewSlice(noopAdapter, triggerAutoSync)(...a),
      resetData() {
        const [set, get] = a;
        const { auth, theme, language } = get();
        set(createResetDataPatch(auth, theme, language) as any);
      },
    }),
    {
      name: 'egoless-do-web',
      storage: typeof window !== 'undefined'
        ? createJSONStorage(() => localStorage)
        : undefined,
      partialize: s => ({
        auth: s.auth,
        theme: s.theme,
        language: s.language,
        remindEnabled: s.remindEnabled,
        remindTime: s.remindTime,
        weightUnit: s.weightUnit,
        calGoal: s.calGoal,
        userProfile: s.userProfile,
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
