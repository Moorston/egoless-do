// ─── Zustand store for web (localStorage backed) ─────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setApiBase, dateStr, DAILY_RESET_KEY, getDailyResetPatch, msUntilMidnight } from '@egoless-do/core';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createHabitSlice, type HabitSlice } from './slices/habitSlice';
import { createReflectionSlice, type ReflectionSlice } from './slices/reflectionSlice';
import { createFastingSlice, type FastingSlice } from './slices/fastingSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

// Configure API base (empty = same origin)
setApiBase('');

export type WebStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & UiSlice;

export const useWebStore = create<WebStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createHabitSlice(...a),
      ...createReflectionSlice(...a),
      ...createFastingSlice(...a),
      ...createUiSlice(...a),
    }),
    {
      name: 'egoless-do-web',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage)
      ),
      partialize: s => ({
        auth: s.auth, theme: s.theme, language: s.language, streak: s.streak,
        waterGoal: s.waterGoal, calGoal: s.calGoal, waterMl: s.waterMl,
        habits: s.habits, reflections: s.reflections,
        activeFasting: s.activeFasting,
        fastingHistory: s.fastingHistory, totalMedMinutes: s.totalMedMinutes,
        medHistory: s.medHistory, foodLog: s.foodLog, checkinHistory: s.checkinHistory,
        userProfile: s.userProfile, remindEnabled: s.remindEnabled, remindTime: s.remindTime,
        weightUnit: s.weightUnit, customTags: s.customTags, customMoods: s.customMoods,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Extracted reset check function
        const checkAndReset = () => {
          const lastReset = localStorage.getItem(DAILY_RESET_KEY);
          const patch = getDailyResetPatch(lastReset);
          if (patch) {
            const store = useWebStore.getState();
            if (patch.waterMl !== undefined) store.resetWater();
            if (patch.foodLog !== undefined) useWebStore.setState({ foodLog: [] });
            localStorage.setItem(DAILY_RESET_KEY, dateStr());
          }
        };
        // Check on load
        checkAndReset();
        // Check when user returns to the page (handles background tab / sleep)
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkAndReset();
          });
        }
        // Schedule midnight reset for when the page stays open across days
        const scheduleNext = () => {
          setTimeout(() => {
            checkAndReset();
            scheduleNext();
          }, msUntilMidnight() + 1000);
        };
        scheduleNext();
      },
    }
  )
);
