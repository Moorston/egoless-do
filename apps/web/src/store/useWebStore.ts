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

    // Helper: filter out deleted records (handles both boolean true and number 1)
    const notDeleted = <T extends { deleted?: boolean | number }>(arr: T[]) =>
      arr.filter(r => !r.deleted);

    const [habits, reflections, fastingSessions, foodEntries, checkins, exerciseEntries, meditationEntries, profiles, plans, planItems, planItemCheckins, graceEntries, dailyCustomTodos, dailyTodoHistory] = await Promise.all([
      db.habits?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.reflections?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.fastingSessions?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.foodEntries?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.checkins?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.exerciseEntries?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.meditationEntries?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.profiles?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.plans?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.planItems?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.planItemCheckins?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.graceHistory?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.dailyCustomTodos?.toArray().then(notDeleted).catch(() => []) ?? [],
      db.dailyTodoHistory?.toArray().then(notDeleted).catch(() => []) ?? [],
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
    if (dailyCustomTodos.length) patch.dailyCustomTodos = dailyCustomTodos;
    if (dailyTodoHistory.length) patch.dailyTodoHistory = dailyTodoHistory;

    // Load profile (single record with profileId='self')
    if (profiles.length) {
      const latest = profiles.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (latest?.data) {
        try {
          const profileData = typeof latest.data === 'string' ? JSON.parse(latest.data) : latest.data;
          patch.userProfile = profileData;
          // waterMl is managed by DailyResetManager, don't load from profile
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

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

export const useWebStore = create<WebStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(adapter, () => { triggerSync().catch(console.error); })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createFoodSlice(adapter)(...a),
      ...createExerciseSlice(adapter, triggerAutoSync)(...a),
      ...createCheckinSlice(adapter, triggerAutoSync)(...a),
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
        // waterMl is NOT persisted here — it's managed by DailyResetManager and stored in IndexedDB profile
        waterGoal: s.waterGoal, calGoal: s.calGoal,
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
        graceHistory: s.graceHistory, recycleBin: s.recycleBin,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Set the auto sync callback after store is created
        _autoSyncCallback = () => {
          useWebStore.getState().autoSyncPlanItems?.();
        };

        const loadPromise = loadFromIndexedDB().then(() => {
          triggerSync().catch(console.error);
          // 数据加载完成后检查习惯自动启动
          // 使用 setTimeout 确保 store 已完全更新
          setTimeout(() => {
            console.log('[loadFromIndexedDB] calling checkAutoStatus');
            useWebStore.getState().checkAutoStatus?.();
          }, 0);
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
          onPlanDailyReset: (previousDate) => {
            useWebStore.getState().performDailyReset?.(previousDate);
          },
          onHabitDailyReset: () => {
            useWebStore.getState().checkHabitAutoStatus?.();
          },
        });
        dailyReset.start(loadPromise);
      },
    }
  )
);
