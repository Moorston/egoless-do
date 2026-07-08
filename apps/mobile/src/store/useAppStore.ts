// ─── Zustand store (mobile) — slice composition ────────────────
import type {
  AuthSlice, HabitSlice, ReflectionSlice, SleepSlice,
  FoodSlice, CheckinSlice, ProfileSlice, SettingsSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice, ReviewSlice, BodySlice,
  DietSlice, MindSlice, MantraSlice, ZhiguanSlice, PracticeSlice,
} from '@egoless-do/core';
import {
  setApiBase, setPushApiBase, setSyncApiBase,
  createAuthSlice, createHabitSlice, createReflectionSlice, createSleepSlice,
  createFoodSlice, createCheckinSlice, createProfileSlice, createSettingsSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createReviewSlice, createBodySlice,
  createDietSlice,
  createPracticeSlice, createMindSlice, createMantraSlice,
  createZhiguanSlice,
  createLogger,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';


import { useMusicStore, setMusicSyncCallback } from '../features/music/useMusicStore';
import { runSync, resetSyncState, softResetSyncState, resetMigrationFlag, rehydrateFromDb, initialSync } from '../features/sync/SyncService';

import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { mobileStorageAdapter, flushWrites, setPersistErrorHandler } from './storageAdapter';

const log = createLogger('App');

// Configure API base for mobile
const hostUri = Constants.expoConfig?.hostUri ?? Constants.experienceUrl?.split('?')[0]?.split('://')[1];
const devHost = hostUri?.split(':')[0] ?? 'localhost';
// NOTE: HTTP (not HTTPS) is intentional for local development (Expo Go / device on LAN).
// Production URLs MUST use HTTPS — verify EXPO_PUBLIC_API_URL and EXPO_PUBLIC_PB_URL are https:// in production.
const DEV_API = `http://${devHost}:3000`;
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://egolessdo.freebytes.net';
const apiBase = __DEV__ ? DEV_API : PROD_API;
setApiBase(apiBase);
setPushApiBase(apiBase);

// PocketBase URL for sync endpoints (separate from auth API)
// NOTE: HTTP (not HTTPS) is intentional for local development. Production URLs MUST use HTTPS.
const DEV_PB = `http://${devHost}:8090`;
// Fallback chain: EXPO_PUBLIC_PB_URL → EXPO_PUBLIC_POCKETBASE_URL → apiBase
const PROD_PB = process.env.EXPO_PUBLIC_PB_URL
  ?? process.env.EXPO_PUBLIC_POCKETBASE_URL
  ?? 'https://egolessdo.freebytes.net';
setSyncApiBase(__DEV__ ? DEV_PB : PROD_PB);

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
  & FoodSlice & CheckinSlice & ProfileSlice & SettingsSlice
  & MobileUiSlice & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & ReviewSlice
  & BodySlice & DietSlice & PracticeSlice & MindSlice & MantraSlice & ZhiguanSlice;

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
    const store = {
      ...createAuthSlice(adapter, () => { runSync().catch((e) => log.error(e)); }, async () => {
        // onLogout: soft reset — clear sync metadata, preserve local data
        await softResetSyncState();
        resetMigrationFlag();
      }, async (token, userId) => {
        // Mobile pullServerData: phased initial sync → SQLite → store
        await initialSync(token, userId);
        // Flush pending writes before rehydration to avoid losing optimistic updates
        await flushWrites();
        // Rehydrate store from SQLite after Phase 1 completes
        const dbPatch = await rehydrateFromDb();
        if (Object.keys(dbPatch).length) {
          // Prevent rehydration from resurrecting any locally-deleted records.
          // For each array in the patch, filter out records whose IDs are marked
          // as deleted in the current in-memory store.
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
          if (dbPatch.medHistory) useAppStore.getState().calculateTotalMedMin();
          if (dbPatch.checkinHistory) useAppStore.getState().calculateStreak();
        }
      }, async () => {
        // onClearData: hard logout — clear all local data
        await resetSyncState();
      })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter, undefined, persistProfileSettings)(...a),
      ...createSleepSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter, persistProfileSettings, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(persistProfileSettings, () => { const s = useAppStore.getState(); useAppStore.setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as PartialMobileStore); }), createReflectionSlice(adapter, undefined, persistProfileSettings), () => { resetSyncState().catch((e) => log.error(e)); resetMigrationFlag(); }, persistProfileSettings, () => resetSyncState())(...a),
      ...createPlanSlice(adapter)(...a),
      ...createRecycleBinSlice(adapter)(...a),
      ...createThoughtTrailSlice(adapter, persistProfileSettings)(...a),
      ...createReviewSlice(adapter, triggerAutoSync)(...a),
      ...createBodySlice(adapter, triggerAutoSync)(...a),
      ...createDietSlice(adapter, triggerAutoSync, persistProfileSettings)(...a),
      ...createPracticeSlice(adapter, triggerAutoSync)(...a),
      ...createMindSlice(adapter, triggerAutoSync)(...a),
      ...createMantraSlice(adapter, triggerAutoSync)(...a),
      ...createZhiguanSlice(adapter, () => useAppStore.getState().auth?.user?.id ?? 'anonymous', triggerAutoSync)(...a),
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
