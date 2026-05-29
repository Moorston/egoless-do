// ─── Zustand store for web (localStorage backed) ─────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setApiBase, dateStr, DAILY_RESET_KEY, getDailyResetPatch, msUntilMidnight } from '@egoless-do/core';
import type { AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, UiSlice, PlanSlice } from '@egoless-do/core';
import { createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createUiSlice, createPlanSlice } from '@egoless-do/core';
import { webStorageAdapter } from './storageAdapter';
import { triggerSync } from '../db/syncService';

// Configure API base (empty = same origin)
setApiBase('');

const adapter = webStorageAdapter;

export type WebStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & UiSlice & PlanSlice;

export const useWebStore = create<WebStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice<WebStore>(adapter, () => { triggerSync().catch(() => {}); })(...a),
      ...createHabitSlice<WebStore>(adapter)(...a),
      ...createReflectionSlice<WebStore>(adapter)(...a),
      ...createFastingSlice<WebStore>(adapter)(...a),
      ...createUiSlice<WebStore>(adapter)(...a),
      ...createPlanSlice<WebStore>(adapter)(...a),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const checkAndReset = () => {
          const lastReset = localStorage.getItem(DAILY_RESET_KEY);
          const patch = getDailyResetPatch(lastReset);
          if (patch) {
            // Check if today's checkin has water amount
            const today = dateStr();
            const { checkinHistory } = useWebStore.getState();
            const todayCheckin = (checkinHistory ?? []).find((c: any) => c.date === today);
            let todayWater = 0;
            if (todayCheckin?.note) {
              try {
                const noteData = JSON.parse(todayCheckin.note);
                if (typeof noteData.water === 'number') todayWater = noteData.water;
              } catch {}
            }
            // Use checkin water amount if available, otherwise reset to 0
            const resetPatch = { ...patch, waterMl: todayWater };
            useWebStore.setState(resetPatch);
            localStorage.setItem(DAILY_RESET_KEY, dateStr());
            const { userProfile, waterGoal } = useWebStore.getState();
            import('../db/syncQueue').then(({ enqueueChange }) => {
              enqueueChange('profile', 'self', 'upsert', {
                ...userProfile, waterMl: todayWater, waterGoal, updatedAt: Date.now(),
              }).catch(() => {});
            });
          }
        };
        checkAndReset();
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkAndReset();
          });
        }
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
