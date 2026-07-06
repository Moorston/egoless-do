// ─── Zustand store (mobile) — slice composition ────────────────
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { AppState } from 'react-native';
import type {
  AuthSlice, HabitSlice, ReflectionSlice, FastingSlice, MeditationSlice, SleepSlice, GiveSlice,
  FoodSlice, ExerciseSlice, CheckinSlice, ProfileSlice, SettingsSlice, TagMoodSlice,
  PlanSlice, RecycleBinSlice, ThoughtTrailSlice, TrailNoteSlice, ReflectionLinkSlice, AISlice, ReviewSlice, BodySlice,
  WeightSlice, BodyCheckinSlice, DietSlice, VisionSlice, DedicationSlice, MindSlice, MantraSlice, ZhiguanSlice, BreathSlice,
} from '@egoless-do/core';
import {
  setApiBase, setPushApiBase, setSyncApiBase,
  createAuthSlice, createHabitSlice, createReflectionSlice, createFastingSlice, createMeditationSlice, createSleepSlice, createGiveSlice,
  createFoodSlice, createExerciseSlice, createCheckinSlice, createProfileSlice, createSettingsSlice, createTagMoodSlice,
  createPlanSlice, createRecycleBinSlice, createThoughtTrailSlice, createTrailNoteSlice, createReflectionLinkSlice, createAISlice, createReviewSlice, createBodySlice,
  createWeightSlice, createBodyCheckinSlice, createDietSlice,
  createVisionSlice, createDedicationSlice, createMindSlice, createMantraSlice,
  createZhiguanSlice,
  createBreathSlice,
  createLogger,
} from '@egoless-do/core';
import Constants from 'expo-constants';
import { mobileStorageAdapter, flushWrites, setPersistErrorHandler } from './storageAdapter';
import { createMobileUiSlice, type MobileUiSlice } from './createMobileUiSlice';
import { useMusicStore, setMusicSyncCallback } from '../features/music/useMusicStore';
import { runSync, resetSyncState, softResetSyncState, resetMigrationFlag, rehydrateFromDb, initialSync } from '../features/sync/SyncService';

const log = createLogger('App');

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

// Flush pending writes when app goes to background
AppState.addEventListener('change', async (state) => {
  if (state !== 'active') {
    flushProfileSettings();
    flushAIConfig();
    await flushWrites(); // flush WriteBatcher buffer before suspension
  }
});

export type MobileStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice & SleepSlice & GiveSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & MobileUiSlice & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & TrailNoteSlice & ReflectionLinkSlice & AISlice & ReviewSlice
  & BodySlice & WeightSlice & BodyCheckinSlice & DietSlice & VisionSlice & DedicationSlice & MindSlice & MantraSlice & ZhiguanSlice & BreathSlice;

/** Partial store type for setState calls */
export type PartialMobileStore = Partial<MobileStore>;

/** useShallow 的类型安全 wrapper。
 *  显式绑定 MobileStore 以避免 useShallow 类型推断失败（TS7006/TS18046）。 */
export function useShallowStore<U>(selector: (state: MobileStore) => U): U {
  return useAppStore(useShallow(selector));
}

// Delayed sync callback - set after store is created
let _autoSyncCallback: (() => void) | null = null;
const triggerAutoSync = () => _autoSyncCallback?.();

// Lazy store reference to avoid circular dependency
let _storeRef: MobileStore | null = null;
const getStore = () => _storeRef!;

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
          getStore().setState(dbPatch as PartialMobileStore);
          if (dbPatch.medHistory) getStore().getState().calculateTotalMedMin();
          if (dbPatch.checkinHistory) getStore().getState().calculateStreak();
        }
      }, async () => {
        // onClearData: hard logout — clear all local data
        await resetSyncState();
      })(...a),
      ...createHabitSlice(adapter, triggerAutoSync)(...a),
      ...createReflectionSlice(adapter)(...a),
      ...createFastingSlice(adapter, triggerAutoSync)(...a),
      ...createMeditationSlice(adapter, triggerAutoSync)(...a),
      ...createSleepSlice(adapter, triggerAutoSync)(...a),
      ...createGiveSlice(adapter, triggerAutoSync)(...a),
      ...createMobileUiSlice(adapter, createFoodSlice(adapter, persistProfileSettings, triggerAutoSync), createExerciseSlice(adapter, triggerAutoSync), createCheckinSlice(adapter, triggerAutoSync), createProfileSlice(adapter), createSettingsSlice(persistProfileSettings, () => { const s = getStore().getState(); getStore().setState({ userProfile: { ...(s.userProfile ?? {}), updatedAt: Date.now() } } as PartialMobileStore); }), createTagMoodSlice(adapter), () => { resetSyncState().catch((e) => log.error(e)); resetMigrationFlag(); }, persistProfileSettings, () => runSync(), () => resetSyncState())(...a),
      ...createPlanSlice(adapter)(...a),
      ...createRecycleBinSlice(adapter)(...a),
      ...createThoughtTrailSlice(adapter)(...a),
      ...createTrailNoteSlice(adapter)(...a),
      ...createReflectionLinkSlice(adapter)(...a),
      ...createAISlice(persistAIConfig)(...a),
      ...createReviewSlice(adapter, triggerAutoSync)(...a),
      ...createBodySlice(adapter, triggerAutoSync)(...a),
      ...createWeightSlice(adapter, triggerAutoSync)(...a),
      ...createBodyCheckinSlice(adapter, triggerAutoSync)(...a),
      ...createDietSlice(adapter, triggerAutoSync)(...a),
      ...createVisionSlice(adapter, triggerAutoSync)(...a),
      ...createDedicationSlice(adapter, triggerAutoSync)(...a),
      ...createMindSlice(adapter, triggerAutoSync)(...a),
      ...createMantraSlice(adapter, triggerAutoSync)(...a),
      ...createZhiguanSlice(adapter, () => getStore().getState().auth?.user?.id ?? 'anonymous', triggerAutoSync)(...a),
      ...createBreathSlice(adapter, triggerAutoSync)(...a),
    };
    _storeRef = store;

    // Connect persist error handler: WriteBatcher failures → store.persistErrors
    setPersistErrorHandler((error, entity, id) => {
      store.addPersistError(error, entity, id);
    });

    return store;
  },
);
