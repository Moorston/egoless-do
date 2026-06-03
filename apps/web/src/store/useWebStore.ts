// ─── Zustand store for web (IndexedDB backed) ────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager, createResetDataPatch } from '@egoless-do/core';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice,
} from '@egoless-do/core';
import {
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice,
} from '@egoless-do/core';
import { webStorageAdapter } from './storageAdapter';
import { triggerSync } from '../db/syncService';
import { db } from '../db/webDb';

// Configure API base (empty = same origin)
setApiBase('');

const adapter = webStorageAdapter;

/** Load all entity data from IndexedDB and merge into Zustand store */
async function loadFromIndexedDB(): Promise<void> {
  try {
    // Ensure database is ready before accessing tables
    await db.open();

    const [habits, reflections, fastingSessions, foodEntries, checkins, exerciseEntries, meditationEntries, profiles, plans, planItems, planItemCheckins, graceEntries] = await Promise.all([
      db.habits?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.reflections?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.fastingSessions?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.foodEntries?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.checkins?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.exerciseEntries?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.meditationEntries?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.profiles?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.plans?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.planItems?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.planItemCheckins?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
      db.graceHistory?.where('deleted').notEqual(1).toArray().catch(() => []) ?? [],
    ]);

    const patch: Record<string, unknown> = {};

    if (habits.length) patch.habits = habits;
    if (reflections.length) patch.reflections = reflections;
    if (foodEntries.length) patch.foodLog = foodEntries;
    if (checkins.length) patch.checkinHistory = checkins;
    if (exerciseEntries.length) patch.exerciseLog = exerciseEntries;
    if (meditationEntries.length) {
      patch.medHistory = meditationEntries;
      patch.totalMedMinutes = meditationEntries.reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
    }
    if (fastingSessions.length) {
      const active = fastingSessions.find(f => !f.endedAt);
      const completed = fastingSessions.filter(f => f.endedAt);
      if (active) patch.activeFasting = active;
      patch.fastingHistory = completed;
    }
    if (plans.length) patch.plans = plans;
    if (planItems.length) patch.planItems = planItems;
    if (planItemCheckins.length) patch.planItemCheckins = planItemCheckins;
    if (graceEntries.length) patch.graceHistory = graceEntries;

    // Load profile (single record with profileId='self')
    if (profiles.length) {
      const latest = profiles.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (latest?.data) {
        try {
          const profileData = typeof latest.data === 'string' ? JSON.parse(latest.data) : latest.data;
          patch.userProfile = profileData;
          if (profileData.waterMl !== undefined) patch.waterMl = profileData.waterMl;
          if (profileData.waterGoal !== undefined) patch.waterGoal = profileData.waterGoal;
        } catch (e) { console.warn('[store] Failed to parse profile data:', e); }
      }
    }

    if (Object.keys(patch).length) {
      useWebStore.setState(patch);
    }
  } catch (err) {
    console.error('[loadFromIndexedDB] Error:', err);
  }
}

export type WebStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & PlanSlice & RecycleBinSlice & { resetData: () => void };

export const useWebStore = create<WebStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(adapter, () => { triggerSync().catch(console.error); })(...a),
      ...createHabitSlice(adapter)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter)(...a),
      ...createMeditationSlice(adapter)(...a),
      ...createFoodSlice(adapter)(...a),
      ...createExerciseSlice(adapter)(...a),
      ...createCheckinSlice(adapter)(...a),
      ...createProfileSlice(adapter)(...a),
      ...createSettingsSlice()(...a),
      ...createTagMoodSlice()(...a),
      ...createPlanSlice(adapter)(...a),
      ...createRecycleBinSlice()(...a),
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
        graceHistory: s.graceHistory, recycleBin: s.recycleBin,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const loadPromise = loadFromIndexedDB().then(() => {
          triggerSync().catch(console.error);
        }).catch(console.error);

        const dailyReset = new DailyResetManager({
          getLastReset: () => localStorage.getItem(DAILY_RESET_KEY),
          setLastReset: (date) => localStorage.setItem(DAILY_RESET_KEY, date),
          getCheckinHistory: () => useWebStore.getState().checkinHistory ?? [],
          applyPatch: (patch) => useWebStore.setState(patch as any),
          getProfile: () => (useWebStore.getState().userProfile ?? {}) as Record<string, unknown>,
          getWaterGoal: () => useWebStore.getState().waterGoal ?? 2000,
          persistProfile: (data) => {
            webStorageAdapter.persistChange('profile', 'self', data).catch(console.error);
          },
        });
        dailyReset.start(loadPromise);
      },
    }
  )
);
