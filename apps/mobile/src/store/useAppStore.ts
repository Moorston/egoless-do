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
  setApiBase, setPushApiBase, dateStr, DAILY_RESET_KEY, DailyResetManager, createResetDataPatch,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createTrailNoteSlice, createReflectionLinkSlice, createAISlice, createReviewSlice,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { mobileStorageAdapter } from './storageAdapter';
import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { runSync, resetSyncState, resetMigrationFlag } from '../features/sync/SyncService';
import { openDatabase, setState as setAppState } from '../db/schema';
import { dbGetAllFoodEntries } from '../db/queries';
import {
  rowToHabit, rowToReflection, rowToFasting, rowToCheckin,
  rowToExercise, rowToMeditation, rowToProfile, rowToPlan, rowToPlanItem,
  rowToPlanItemCheckin, rowToGrace, rowToDailyCustomTodo, rowToDailyTodoHistory,
  rowToThoughtTrail, rowToTrailNote, rowToReflectionLink, rowToAIConfig, rowToCheckinReview,
} from './rowMappers';
import { migrateAsyncStorageToSQLite } from './migrateAsyncStorage';

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://egolessdo.freebytes.net';
const apiBase = __DEV__ ? DEV_API : PROD_API;
setApiBase(apiBase);
setPushApiBase(apiBase);

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

/** Partial store type for setState calls */
export type PartialMobileStore = Partial<MobileStore>;

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

export const useAppStore = create<MobileStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(adapter, () => { runSync().catch(console.error); }, () => {
        const { auth, theme, language } = useAppStore.getState();
        useAppStore.setState(createResetDataPatch(auth, theme, language) as PartialMobileStore);
        resetSyncState().catch(console.error);
        resetMigrationFlag();
      })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter, persistProfileSettings, triggerAutoSync), createExerciseSlice(adapter, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(persistProfileSettings, () => { const s = useAppStore.getState(); useAppStore.setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as PartialMobileStore); }), createTagMoodSlice(persistProfileSettings), () => { resetSyncState().catch(console.error); resetMigrationFlag(); }, persistProfileSettings)(...a),
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
        // Only persist settings, auth, and UI preferences — entities rehydrate from SQLite
        auth: s.auth, theme: s.theme, language: s.language, streak: s.streak,
        waterMl: s.waterMl, waterGoal: s.waterGoal, calGoal: s.calGoal,
        remindEnabled: s.remindEnabled, remindTime: s.remindTime,
        weightUnit: s.weightUnit, customTags: s.customTags, customMoods: s.customMoods,
        allTagsOrder: s.allTagsOrder, allMoodsOrder: s.allMoodsOrder,
        customFoodPresets: s.customFoodPresets,
        reflectionFilters: s.reflectionFilters,
        healthSyncEnabled: s.healthSyncEnabled,
        ignoredRecPatterns: s.ignoredRecPatterns,
        recycleBin: s.recycleBin, // Not in SQLite — persist in AsyncStorage for recovery
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Set the auto sync callback after store is created
        _autoSyncCallback = () => {
          useAppStore.getState().autoSyncPlanItems?.();
          useAppStore.getState().autoSyncHabits?.();
        };

        const dailyReset = new DailyResetManager({
          getLastReset: () => AsyncStorage.getItem(DAILY_RESET_KEY),
          setLastReset: (date) => { AsyncStorage.setItem(DAILY_RESET_KEY, date).catch(console.error); },
          getCheckinHistory: () => useAppStore.getState().checkinHistory ?? [],
          applyPatch: (patch) => useAppStore.setState(patch as PartialMobileStore),
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

        // Rehydrate ALL entity data from SQLite (replaces AsyncStorage dual storage)
        openDatabase().then(async db => {
          try {
            // Step 1: Migrate old AsyncStorage entity data to SQLite (one-time, idempotent)
            const didMigrate = await migrateAsyncStorageToSQLite(db, adapter);
            if (didMigrate) {
              // Mark that a full sync push is needed to send migrated data to server
              await setAppState(db, 'needs_initial_sync', '1');
            }

            // Step 2: Load all entities from SQLite (each query independently caught)
            const safe = <T>(p: Promise<T>, label: string): Promise<T | null> =>
              p.catch(e => { console.error(`[rehydrate] ${label} failed:`, e); return null; });

            const [
              habits, reflections, fastings, foods, checkins, exercises, meditations,
              profiles, plans, planItems, planItemCheckins, graces, dailyTodos,
              todoHistory, trails, trailNotes, refLinks, aiConfigs, reviews,
            ] = await Promise.all([
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM habits WHERE deleted = 0"), 'habits'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM mind_reflections WHERE deleted = 0"), 'reflections'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM fasting_sessions WHERE deleted = 0"), 'fastings'),
              safe(dbGetAllFoodEntries(db), 'foods'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM checkin_records WHERE deleted = 0"), 'checkins'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM exercise_entries WHERE deleted = 0"), 'exercises'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM meditation_history WHERE deleted = 0"), 'meditations'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM user_profiles WHERE deleted = 0"), 'profiles'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM plans WHERE deleted = 0"), 'plans'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM plan_items WHERE deleted = 0"), 'planItems'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM plan_item_checkins WHERE deleted = 0"), 'planItemCheckins'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM grace_history WHERE deleted = 0"), 'graces'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM daily_custom_todos WHERE deleted = 0"), 'dailyTodos'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM daily_todo_history WHERE deleted = 0"), 'todoHistory'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM thought_trails WHERE deleted = 0"), 'trails'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM trail_notes WHERE deleted = 0"), 'trailNotes'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM reflection_links WHERE deleted = 0"), 'refLinks'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM ai_configs WHERE config_id = 'self' AND deleted = 0"), 'aiConfigs'),
              safe(db.getAllAsync<Record<string, unknown>>("SELECT * FROM checkin_reviews WHERE deleted = 0"), 'reviews'),
            ]);

            // Convert rows to entities and build state patch (null from failed queries is safely skipped)
            const patch: Record<string, unknown> = {};

            if (habits?.length) patch.habits = habits.map(rowToHabit);
            if (reflections?.length) patch.reflections = reflections.map(rowToReflection);
            if (fastings?.length) patch.fastingHistory = fastings.map(rowToFasting);
            if (foods?.length) patch.foodLog = foods.sort((a, b) => b.timestamp - a.timestamp);
            if (checkins?.length) patch.checkinHistory = checkins.map(rowToCheckin);
            if (exercises?.length) patch.exerciseLog = exercises.map(rowToExercise);
            if (meditations?.length) {
              const medEntries = meditations.map(rowToMeditation);
              patch.medHistory = medEntries;
              patch.totalMedMinutes = medEntries.reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
            }
            if (profiles?.length) {
              const profile = profiles.map(rowToProfile)[0];
              if (profile) patch.userProfile = profile;
            }
            if (plans?.length) patch.plans = plans.map(rowToPlan);
            if (planItems?.length) patch.planItems = planItems.map(rowToPlanItem);
            if (planItemCheckins?.length) patch.planItemCheckins = planItemCheckins.map(rowToPlanItemCheckin);
            if (graces?.length) patch.graceHistory = graces.map(rowToGrace);
            if (dailyTodos?.length) patch.dailyCustomTodos = dailyTodos.map(rowToDailyCustomTodo);
            if (todoHistory?.length) patch.dailyTodoHistory = todoHistory.map(rowToDailyTodoHistory);
            if (trails?.length) patch.thoughtTrails = trails.map(rowToThoughtTrail);
            if (trailNotes?.length) patch.trailNotes = trailNotes.map(rowToTrailNote);
            if (refLinks?.length) patch.reflectionLinks = refLinks.map(rowToReflectionLink);
            if (reviews?.length) patch.checkinReviews = reviews.map(rowToCheckinReview);
            if (aiConfigs?.length) {
              const ai = rowToAIConfig(aiConfigs[0]);
              patch.aiMode = ai.mode;
              patch.aiModels = ai.models;
            }

            if (Object.keys(patch).length > 0) {
              useAppStore.setState(patch as PartialMobileStore);
            }
          } catch (err) {
            console.error('[rehydrate] SQLite entity load error:', err);
          }
        }).catch(err => console.error('[rehydrate] database open error:', err));

        // Clean up expired recycle bin items
        useAppStore.getState().cleanupRecycleBin();
      },
    }
  )
);
