// ─── Zustand store (mobile) — slice composition ────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice, TrailNoteSlice, ReflectionLinkSlice, AISlice, ReviewSlice,
} from '@egoless-do/core';
import {
  setApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager, createResetDataPatch,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createTrailNoteSlice, createReflectionLinkSlice, createAISlice, createReviewSlice,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { mobileStorageAdapter } from './storageAdapter';
import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { runSync, resetSyncState, resetMigrationFlag } from '../features/sync/SyncService';
import { openDatabase } from '../db/schema';
import { dbGetAllFoodEntries } from '../db/queries';

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-production-domain.com';
const apiBase = __DEV__ ? DEV_API : PROD_API;
setApiBase(apiBase);

const adapter = mobileStorageAdapter;

// Debounced profile settings persistence (piggyback settings onto profile entity)
let _settingsPersistTimer: ReturnType<typeof setTimeout> | null = null;
function persistProfileSettings() {
  if (_settingsPersistTimer) clearTimeout(_settingsPersistTimer);
  _settingsPersistTimer = setTimeout(() => {
    _settingsPersistTimer = null;
    const s = useAppStore.getState();
    adapter.persistChange('profile', 'self', {
      ...s.userProfile,
      waterMl: s.waterMl,
      waterGoal: s.waterGoal,
      weightUnit: s.weightUnit,
      calGoal: s.calGoal,
      customFoodPresets: s.customFoodPresets,
      theme: s.theme,
      language: s.language,
      remindEnabled: s.remindEnabled,
      remindTime: s.remindTime,
      healthSyncEnabled: s.healthSyncEnabled,
      customTags: s.customTags,
      customMoods: s.customMoods,
      allTagsOrder: s.allTagsOrder,
      allMoodsOrder: s.allMoodsOrder,
      updatedAt: Date.now(),
    }).catch(console.error);
  }, 500);
}

// Debounced AI config persistence
let _aiConfigPersistTimer: ReturnType<typeof setTimeout> | null = null;
function persistAIConfig() {
  if (_aiConfigPersistTimer) clearTimeout(_aiConfigPersistTimer);
  _aiConfigPersistTimer = setTimeout(() => {
    _aiConfigPersistTimer = null;
    const s = useAppStore.getState();
    adapter.persistChange('aiConfig', 'self', {
      config_id: 'self',
      mode: s.aiMode,
      models: s.aiModels,
      updatedAt: Date.now(),
      deleted: false,
    }).catch(console.error);
  }, 500);
}

export type MobileStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & MobileUiSlice & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & TrailNoteSlice & ReflectionLinkSlice & AISlice & ReviewSlice;

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

export const useAppStore = create<MobileStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(adapter, () => { runSync().catch(console.error); }, () => {
        const { auth, theme, language } = useAppStore.getState();
        useAppStore.setState(createResetDataPatch(auth, theme, language) as any);
        resetSyncState().catch(console.error);
        resetMigrationFlag();
      })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter, persistProfileSettings, triggerAutoSync), createExerciseSlice(adapter, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(persistProfileSettings, () => { const s = useAppStore.getState(); useAppStore.setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as any); }), createTagMoodSlice(persistProfileSettings), () => { resetSyncState().catch(console.error); resetMigrationFlag(); }, persistProfileSettings)(...a),
      ...createPlanSlice(adapter)(...a),
      ...createRecycleBinSlice(adapter)(...a),
      ...createThoughtTrailSlice(adapter)(...a),
      ...createTrailNoteSlice(adapter)(...a),
      ...createReflectionLinkSlice(adapter)(...a),
      ...createAISlice(persistAIConfig)(...a),
      ...createReviewSlice(adapter, triggerAutoSync)(...a),
    }),
    {
      name: 'egoless-do-mobile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({
        auth: s.auth, theme: s.theme, language: s.language, streak: s.streak,
        waterMl: s.waterMl, waterGoal: s.waterGoal, calGoal: s.calGoal,
        foodLog: s.foodLog, habits: s.habits, reflections: s.reflections,
        thoughtTrails: s.thoughtTrails,
        trailNotes: s.trailNotes,
        reflectionLinks: s.reflectionLinks,
        activeFasting: s.activeFasting,
        fastingHistory: s.fastingHistory, totalMedMinutes: s.totalMedMinutes,
        medHistory: s.medHistory, checkinHistory: s.checkinHistory,
        userProfile: s.userProfile, remindEnabled: s.remindEnabled, remindTime: s.remindTime,
        weightUnit: s.weightUnit, customTags: s.customTags, customMoods: s.customMoods,
        allTagsOrder: s.allTagsOrder, allMoodsOrder: s.allMoodsOrder,
        customFoodPresets: s.customFoodPresets,
        reflectionFilters: s.reflectionFilters,
        exerciseLog: s.exerciseLog,
        plans: s.plans, planItems: s.planItems, planItemCheckins: s.planItemCheckins,
        dailyCustomTodos: s.dailyCustomTodos, dailyTodoHistory: s.dailyTodoHistory,
        graceHistory: s.graceHistory, recycleBin: s.recycleBin,
        healthSyncEnabled: s.healthSyncEnabled,
        aiMode: s.aiMode, aiModels: s.aiModels,
        checkinReviews: s.checkinReviews,
        ignoredRecPatterns: s.ignoredRecPatterns,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Set the auto sync callback after store is created
        _autoSyncCallback = () => {
          useAppStore.getState().autoSyncPlanItems?.();
        };

        const dailyReset = new DailyResetManager({
          getLastReset: () => AsyncStorage.getItem(DAILY_RESET_KEY),
          setLastReset: (date) => { AsyncStorage.setItem(DAILY_RESET_KEY, date).catch(console.error); },
          getCheckinHistory: () => useAppStore.getState().checkinHistory ?? [],
          applyPatch: (patch) => useAppStore.setState(patch as any),
          getProfile: () => (useAppStore.getState().userProfile ?? {}) as Record<string, unknown>,
          getWaterGoal: () => useAppStore.getState().waterGoal ?? 2000,
          persistProfile: (data) => {
            const s = useAppStore.getState();
            adapter.persistChange('profile', 'self', {
              ...data,
              calGoal: s.calGoal, customFoodPresets: s.customFoodPresets,
              theme: s.theme, language: s.language,
              remindEnabled: s.remindEnabled, remindTime: s.remindTime,
              healthSyncEnabled: s.healthSyncEnabled,
              customTags: s.customTags, customMoods: s.customMoods,
              allTagsOrder: s.allTagsOrder, allMoodsOrder: s.allMoodsOrder,
            }).catch(console.error);
          },
          onPlanDailyReset: (previousDate) => {
            useAppStore.getState().performDailyReset?.(previousDate);
          },
          onHabitDailyReset: () => {
            useAppStore.getState().checkHabitAutoStatus?.();
          },
          addVisibilityListener: (callback) => {
            AppState.addEventListener('change', (s) => {
              if (s === 'active') callback();
            });
          },
        });
        dailyReset.start();

        // 习惯自动启动检查
        useAppStore.getState().checkHabitAutoStatus?.();

        // Load food entries from SQLite into store
        openDatabase().then(db => dbGetAllFoodEntries(db)).then(entries => {
          if (!entries || entries.length === 0) return;
          const store = useAppStore.getState();
          const storeMap = new Map((store.foodLog ?? []).map(f => [f.id, f]));
          let changed = false;
          for (const entry of entries) {
            const existing = storeMap.get(entry.id);
            if (!existing || (entry.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
              storeMap.set(entry.id, entry);
              changed = true;
            }
          }
          if (changed) {
            const merged = Array.from(storeMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            useAppStore.setState({ foodLog: merged });
          }
        }).catch(err => console.error('[rehydrate] food load error:', err));

        // Clean up expired recycle bin items
        useAppStore.getState().cleanupRecycleBin();

        // Load AI config from SQLite into store
        openDatabase().then(async db => {
          try {
            const row = await db.getFirstAsync<{ mode: string; models: string }>(
              "SELECT mode, models FROM ai_configs WHERE config_id = 'self' AND deleted = 0"
            );
            if (row) {
              let models: any[] = [];
              try { models = JSON.parse(row.models); } catch {}
              useAppStore.setState({ aiMode: row.mode as any, aiModels: models });
            }
          } catch {}
        }).catch(() => {});
      },
    }
  )
);
