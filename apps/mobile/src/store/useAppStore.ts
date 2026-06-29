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
  setApiBase, setPushApiBase, setSyncApiBase, DAILY_RESET_KEY, DailyResetManager,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createTrailNoteSlice, createReflectionLinkSlice, createAISlice, createReviewSlice,
  createLogger,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { mobileStorageAdapter, flushWrites } from './storageAdapter';
import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { runSync, resetSyncState, softResetSyncState, resetMigrationFlag, rehydrateFromDb, initialSync } from '../features/sync/SyncService';
import { applyServerChanges as _applyServerChanges } from '../features/sync/SyncService';
import { openDatabase, setState as setAppState } from '../db/schema';

const log = createLogger('App');
import { migrateAsyncStorageToSQLite } from './migrateAsyncStorage';

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
const DEV_API = `http://${devHost}:3000`;
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://egolessdo.freebytes.net';
const apiBase = __DEV__ ? DEV_API : PROD_API;
setApiBase(apiBase);
setPushApiBase(apiBase);

// PocketBase URL for sync endpoints (separate from auth API)
const DEV_PB = `http://${devHost}:8090`;
// Fallback chain: EXPO_PUBLIC_PB_URL → EXPO_PUBLIC_POCKETBASE_URL → apiBase
const PROD_PB = process.env.EXPO_PUBLIC_PB_URL
  ?? process.env.EXPO_PUBLIC_POCKETBASE_URL
  ?? 'https://egolessdo.freebytes.net';
setSyncApiBase(__DEV__ ? DEV_PB : PROD_PB);

const adapter = mobileStorageAdapter;

// Debounced profile settings persistence (piggyback settings onto profile entity)
let _settingsPersistTimer: ReturnType<typeof setTimeout> | null = null;

function flushProfileSettings() {
  if (_settingsPersistTimer) {
    clearTimeout(_settingsPersistTimer);
    _settingsPersistTimer = null;
  }
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
  } as Record<string, unknown>).catch((e) => log.error(e));
}

function persistProfileSettings() {
  if (_settingsPersistTimer) clearTimeout(_settingsPersistTimer);
  _settingsPersistTimer = setTimeout(flushProfileSettings, 500);
}

// Debounced AI config persistence
let _aiConfigPersistTimer: ReturnType<typeof setTimeout> | null = null;

function flushAIConfig() {
  if (_aiConfigPersistTimer) {
    clearTimeout(_aiConfigPersistTimer);
    _aiConfigPersistTimer = null;
  }
  const s = useAppStore.getState();
  adapter.persistChange('aiConfig', 'self', {
    config_id: 'self',
    mode: s.aiMode,
    models: s.aiModels,
    updatedAt: Date.now(),
    deleted: false,
  }).catch((e) => log.error(e));
}

function persistAIConfig() {
  if (_aiConfigPersistTimer) clearTimeout(_aiConfigPersistTimer);
  _aiConfigPersistTimer = setTimeout(flushAIConfig, 500);
}

// Flush pending writes when app goes to background
AppState.addEventListener('change', (state) => {
  if (state !== 'active') {
    flushProfileSettings();
    flushAIConfig();
    flushWrites(); // flush WriteBatcher buffer
  }
});

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
      ...createAuthSlice(adapter, () => { runSync().catch((e) => log.error(e)); }, async () => {
        // onLogout: soft reset — clear sync metadata, preserve local data
        await softResetSyncState();
        resetMigrationFlag();
      }, async (token, userId) => {
        // Mobile pullServerData: phased initial sync → SQLite → store
        await initialSync(token, userId);
        // Rehydrate store from SQLite after Phase 1 completes
        const dbPatch = await rehydrateFromDb();
        if (Object.keys(dbPatch).length) {
          useAppStore.setState(dbPatch as PartialMobileStore);
          if (dbPatch.medHistory) useAppStore.getState().calculateTotalMedMin();
          if (dbPatch.checkinHistory) useAppStore.getState().calculateStreak();
        }
      }, async () => {
        // onClearData: hard logout — clear all local data
        await resetSyncState();
      })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter, persistProfileSettings, triggerAutoSync), createExerciseSlice(adapter, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(persistProfileSettings, () => { const s = useAppStore.getState(); useAppStore.setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as PartialMobileStore); }), createTagMoodSlice(persistProfileSettings), () => { resetSyncState().catch((e) => log.error(e)); resetMigrationFlag(); }, persistProfileSettings, () => runSync(), () => resetSyncState())(...a),
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
          setLastReset: (date) => { AsyncStorage.setItem(DAILY_RESET_KEY, date).catch((e) => log.error(e)); },
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
            } as Record<string, unknown>).catch((e) => log.error(e));
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

            // Step 2: Load all entities from SQLite via unified rehydrateFromDb
            const dbPatch = await rehydrateFromDb();

            if (Object.keys(dbPatch).length > 0) {
              useAppStore.setState(dbPatch as PartialMobileStore);
            }

            // Derived state recalculation
            if (dbPatch.medHistory) useAppStore.getState().calculateTotalMedMin();
            if (dbPatch.checkinHistory) useAppStore.getState().calculateStreak();
          } catch (err) {
            log.error(err, { message: 'SQLite entity load error' });
          }
        }).catch(err => log.error(err, { message: 'database open error' }));

        // Clean up expired recycle bin items
        useAppStore.getState().cleanupRecycleBin();
      },
    }
  )
);
