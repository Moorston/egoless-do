// ─── Zustand store (mobile) — slice composition ────────────────
import type {
  AuthSlice, HabitSlice, ReflectionSlice, SleepSlice,
  FoodSlice, CheckinSlice, ExerciseSlice, MeditationSlice, FastingSlice,
  ProfileSlice, SettingsSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice, ReviewSlice, BodySlice,
  DietSlice, MindSlice, MantraSlice, ZhiguanSlice, PracticeSlice,
  SliceErrorState,
} from '@egoless-do/core';
import {
  setApiBase, setPushApiBase, setSyncApiBase,
  createAuthSlice, createHabitSlice, createReflectionSlice, createSleepSlice,
  createFoodSlice, createCheckinSlice, createExerciseSlice, createMeditationSlice, createFastingSlice,
  createProfileSlice, createSettingsSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createReviewSlice, createBodySlice,
  createDietSlice,
  createPracticeSlice, createMindSlice, createMantraSlice,
  createZhiguanSlice,
  createSliceErrorSlice,
  createLogger,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';


import { API_URL, PB_URL } from '../config';
import { useMusicStore, setMusicSyncCallback } from '../features/music/useMusicStore';
import { runSync, resetSyncState, softResetSyncState, resetMigrationFlag, rehydrateFromDb, initialSync } from '../features/sync/SyncService';

import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { saveSecureTokens } from './secureAuth';
import { mobileStorageAdapter, flushWrites, setPersistErrorHandler } from './storageAdapter';
import { useUiStore } from './uiStore';

const log = createLogger('App');

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
// NOTE: HTTP (not HTTPS) is intentional for local development (Expo Go / device on LAN).
// Production URLs MUST use HTTPS — verify EXPO_PUBLIC_API_URL and EXPO_PUBLIC_PB_URL are https:// in production.
const DEV_API = `http://${devHost}:3000`;
const apiBase = __DEV__ ? DEV_API : API_URL;
setApiBase(apiBase);

// PocketBase URL for sync endpoints (separate from auth API)
// NOTE: HTTP (not HTTPS) is intentional for local development. Production URLs MUST use HTTPS.
const DEV_PB = `http://${devHost}:8090`;
const pbBase = __DEV__ ? DEV_PB : PB_URL;
setSyncApiBase(pbBase);
setPushApiBase(pbBase);  // Push token endpoint is on PocketBase, not API server

const adapter = mobileStorageAdapter;

// Debounced profile settings persistence (piggyback settings onto profile entity)
let _settingsPersistTimer: ReturnType<typeof setTimeout> | null = null;

/** Flush all pending debounce timers. Call on app shutdown / background. */
export function flushAllPendingTimers(): void {
  if (_settingsPersistTimer) { clearTimeout(_settingsPersistTimer); _settingsPersistTimer = null; flushProfileSettings(); }
  if (_aiConfigPersistTimer) { clearTimeout(_aiConfigPersistTimer); _aiConfigPersistTimer = null; flushAIConfig(); }
}

function flushProfileSettings() {
  if (_settingsPersistTimer) {
    clearTimeout(_settingsPersistTimer);
    _settingsPersistTimer = null;
  }
  const s = useAppStore.getState();
  const profile = s.userProfile ?? {};
  // Skip flush if profile is empty (e.g., after clearLocalData reset) to avoid overwriting real data
  const hasRealData = Object.keys(profile).length > 1 || (Object.keys(profile).length === 1 && !('updatedAt' in profile));
  if (!hasRealData && s.waterGoal === 2000 && s.waterMl === 0 && s.weightUnit === 'kg') {
    return;
  }
  const ms = useMusicStore.getState();
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
    reflectionFilters: s.reflectionFilters,
    ignoredRecPatterns: s.ignoredRecPatterns,
    musicFavorites: ms.favorites,
    musicUserTracks: ms.userTracks.map(t => ({ id: t.id, name: t.name, nameEn: t.nameEn, category: t.category })),
    musicVolume: ms.volume,
    musicPlayMode: ms.playMode,
    updatedAt: Date.now(),
  } as Record<string, unknown>).catch((e) => log.error(e));
}

function persistProfileSettings() {
  if (_settingsPersistTimer) clearTimeout(_settingsPersistTimer);
  _settingsPersistTimer = setTimeout(flushProfileSettings, 500);
}

// Wire music store changes → profile persistence
setMusicSyncCallback(persistProfileSettings);

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

// Backward-compatible: register AppState listener at module load time
// via initMobileStore() (defined after useAppStore to avoid circular reference).
initMobileStore();

export type MobileStore = AuthSlice & HabitSlice & ReflectionSlice & SleepSlice
  & FoodSlice & CheckinSlice & ExerciseSlice & MeditationSlice & FastingSlice
  & ProfileSlice & SettingsSlice
  & MobileUiSlice & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & ReviewSlice
  & BodySlice & DietSlice & PracticeSlice & MindSlice & MantraSlice & ZhiguanSlice & SliceErrorState;

/** Partial store type for setState calls */
export type PartialMobileStore = Partial<MobileStore>;

/** useShallow 的类型安全 wrapper。
 *  显式绑定 MobileStore 以避免 useShallow 类型推断失败（TS7006/TS18046）。 */
export function useShallowStore<U>(selector: (state: MobileStore) => U): U {
  return useAppStore(useShallow(selector));
}

// Delayed sync callback - set after store is created (mutable for initApp injection)
let _autoSyncCallback: (() => void) | null = null;
/** Inject the auto-sync callback after SyncEngine is initialized */
export function setAutoSyncCallback(cb: () => void) { _autoSyncCallback = cb; }
const triggerAutoSync = () => _autoSyncCallback?.();

export const useAppStore = create<MobileStore>()(
  (...a) => {
    // Extract slice factories for readability (avoids deeply nested inline calls)
    const authSlice = createAuthSlice(adapter, () => { runSync().catch((e) => log.error(e)); }, async () => {
      await softResetSyncState();
      resetMigrationFlag();
    }, async (token, userId) => {
      await initialSync(token, userId);
      await flushWrites();
      const dbPatch = await rehydrateFromDb();
      if (Object.keys(dbPatch).length) {
        const current = useAppStore.getState();
        for (const key of Object.keys(dbPatch)) {
          const patchVal = dbPatch[key];
          if (!Array.isArray(patchVal)) continue;
          const currentVal = (current as Record<string, unknown>)[key];
          if (!Array.isArray(currentVal)) continue;
          const deletedIds = new Set(
            currentVal.filter((r: Record<string, unknown>) => r.deleted).map((r: Record<string, unknown>) => r.id as string),
          );
          if (deletedIds.size > 0) {
            dbPatch[key] = patchVal.filter((r: Record<string, unknown>) => !deletedIds.has(r.id as string));
          }
        }
        useAppStore.setState(dbPatch as PartialMobileStore);
        // Restore non-array fields (userProfile, aiMode, aiModels) after array-only loop
        if (dbPatch.userProfile && typeof dbPatch.userProfile === 'object' && Object.keys(dbPatch.userProfile as Record<string, unknown>).length > 1) {
          const current = useAppStore.getState();
          const merged = { ...(current.userProfile ?? {}), ...dbPatch.userProfile as Record<string, unknown> };
          useAppStore.setState({ userProfile: merged } as PartialMobileStore);
        }
        if (dbPatch.medHistory) useAppStore.getState().calculateTotalMedMin();
        if (dbPatch.checkinHistory) useAppStore.getState().calculateStreak();
      }
    }, async () => {
      await resetSyncState();
    }, () => {
      useUiStore.getState().showToast('登录已过期，请重新登录', 'error');
    }, (token, refreshToken, expiresAt) => {
      // Persist the token to all layers (SecureStore + SQLite + file) right after
      // login/refresh. Return the promise so createAuthSlice's `await persistTokenNow()`
      // genuinely waits for the write to flush — otherwise MIUI process-kill can drop it.
      return saveSecureTokens(token, refreshToken ?? '', expiresAt);
    })(...a);
    // StateCreator factories (needed by createMobileUiSlice before resolution)
    const foodCreator = createFoodSlice(adapter, persistProfileSettings, triggerAutoSync);
    const checkinCreator = createCheckinSlice(adapter, triggerAutoSync);
    const profileCreator = createProfileSlice(adapter);
    const settingsCreator = createSettingsSlice(persistProfileSettings, () => {
      const s = useAppStore.getState();
      useAppStore.setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as PartialMobileStore);
    });
    const reflectionCreator = createReflectionSlice(adapter, undefined, persistProfileSettings);
    // Resolve slices for store composition
    const foodSlice = foodCreator(...a);
    const checkinSlice = checkinCreator(...a);
    const profileSlice = profileCreator(...a);
    const settingsSlice = settingsCreator(...a);
    const reflectionSlice = reflectionCreator(...a);
    const mobileUiSlice = createMobileUiSlice(
      adapter, foodCreator, checkinCreator, profileCreator, settingsCreator, reflectionCreator,
      () => { resetSyncState().catch((e) => log.error(e)); resetMigrationFlag(); },
      persistProfileSettings, () => resetSyncState(),
    )(...a);
    const habitSlice = createHabitSlice(adapter, triggerAutoSync)(...a);
    const exerciseSlice = createExerciseSlice(adapter, triggerAutoSync)(...a);
    const meditationSlice = createMeditationSlice(adapter, triggerAutoSync)(...a);
    const fastingSlice = createFastingSlice(adapter, triggerAutoSync)(...a);
    const sleepSlice = createSleepSlice(adapter, triggerAutoSync)(...a);
    const planSlice = createPlanSlice(adapter)(...a);
    const recycleBinSlice = createRecycleBinSlice(adapter)(...a);
    const thoughtTrailSlice = createThoughtTrailSlice(adapter, persistProfileSettings)(...a);
    const reviewSlice = createReviewSlice(adapter, triggerAutoSync)(...a);
    const bodySlice = createBodySlice(adapter, triggerAutoSync)(...a);
    const dietSlice = createDietSlice(adapter, triggerAutoSync, persistProfileSettings)(...a);
    const practiceSlice = createPracticeSlice(adapter, triggerAutoSync)(...a);
    const mindSlice = createMindSlice(adapter, triggerAutoSync)(...a);
    const mantraSlice = createMantraSlice(adapter, triggerAutoSync)(...a);
    const zhiguanSlice = createZhiguanSlice(adapter, () => useAppStore.getState().auth?.user?.id ?? 'anonymous', triggerAutoSync)(...a);
    const sliceErrorSlice = createSliceErrorSlice()(...a);

    const store = {
      ...authSlice,
      ...habitSlice, ...reflectionSlice, ...sleepSlice,
      ...foodSlice, ...checkinSlice, ...exerciseSlice, ...meditationSlice, ...fastingSlice,
      ...profileSlice, ...settingsSlice,
      ...mobileUiSlice, ...planSlice, ...recycleBinSlice, ...thoughtTrailSlice,
      ...reviewSlice, ...bodySlice, ...dietSlice, ...practiceSlice,
      ...mindSlice, ...mantraSlice, ...zhiguanSlice,
      ...sliceErrorSlice,
    };

    // Connect persist error handler: WriteBatcher failures → store.persistErrors
    setPersistErrorHandler((error, entity, id) => {
      store.addPersistError(error, entity, id);
    });

    return store;
  },
);

// Ghost entry cleanup is in initApp.ts (runs after rehydrateFromDb loads actual data)

// ─── Named handler for AppState changes (extracted for testability) ───
async function handleAppStateChange(state: string) {
  if (state !== 'active') {
    flushProfileSettings();
    flushAIConfig();
    await flushWrites(); // flush WriteBatcher buffer before suspension
  }
}

/**
 * Initialize mobile store side effects — registers the AppState listener
 * that flushes pending writes when the app goes to background.
 *
 * Called automatically at module load time for backward compatibility.
 * Can also be called explicitly in tests to control initialization timing.
 *
 * Note: setApiBase, setPushApiBase, setSyncApiBase, and setMusicSyncCallback
 * remain as inline module-level calls since they don't reference useAppStore.
 */
export function initMobileStore() {
  AppState.addEventListener('change', handleAppStateChange);
}
