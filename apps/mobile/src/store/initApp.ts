// ─── App Initialization — replaces onRehydrateStorage logic ──
// Called from App.tsx after the Zustand store is created.
// Loads all persisted data from SQLite, restores auth tokens,
// and sets up daily reset management.

import { AppState } from 'react-native';
import { useAppStore, type PartialMobileStore } from './useAppStore';
import { mobileStorageAdapter as adapter, flushWrites } from './storageAdapter';
import { openDatabase, setState as setAppState } from '../db/schema';
import { migrateAsyncStorageToSQLite, migrateSettingsToSQLite } from './migrateAsyncStorage';
import { loadSecureTokens, saveSecureTokens, clearSecureTokens } from './secureAuth';
import { DailyResetManager } from '@egoless-do/core';
import {
  rehydrateFromDb,
} from '../features/sync/SyncService';
import { createLogger } from '@egoless-do/core';

const log = createLogger('App');

/** Settings keys persisted via adapter.persistSettings() to app_state table. */
const SETTINGS_KEYS = [
  'theme', 'language', 'waterMl', 'waterGoal', 'calGoal',
  'remindEnabled', 'remindTime', 'weightUnit',
  'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder',
  'customFoodPresets', 'reflectionFilters',
  'healthSyncEnabled', 'ignoredRecPatterns',
  'sleepGoal',
  'auth',           // { isSignedIn, user, isGuest } — no tokens
  'recycleBin',     // RecycleBinItem[]
] as const;

/**
 * Load serialized settings from SQLite app_state via adapter.getSettings()
 * and return them as a partial store patch.
 */
async function loadSettingsPatch(): Promise<PartialMobileStore> {
  const patch: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) {
    try {
      const val = await adapter.getSettings(key);
      if (val !== null && val !== undefined) {
        patch[key] = val;
      }
    } catch (err) {
      log.error(err, { message: `Failed to load setting: ${key}` });
    }
  }
  return patch as PartialMobileStore;
}

/**
 * Application initialization — runs once at startup after the store is created.
 *
 * Responsibilities:
 * 1. Run one-time AsyncStorage → SQLite migrations
 * 2. Load all settings + entity data from SQLite into the store
 * 3. Restore auth tokens from SecureStore
 * 4. Wire up runtime subscriptions (token sync, auto sync)
 * 5. Start DailyResetManager (backed by SQLite)
 * 6. Recalculate derived state (streak, medMinutes)
 * 7. Clean up expired recycle bin items
 */
export async function initApp(): Promise<void> {
  const store = useAppStore.getState;
  const setState = useAppStore.setState;

  try {
    // ── Step 1: Open SQLite DB ─────────────────────────────────
    const db = await openDatabase();

    // ── Step 2: Run migrations (one-time, idempotent) ──────────
    try {
      const didMigrate = await migrateAsyncStorageToSQLite(db, adapter);
      if (didMigrate) {
        await setAppState(db, 'needs_initial_sync', '1');
      }
    } catch (err) {
      log.error(err, { message: 'Entity migration failed (non-fatal)' });
    }

    try {
      await migrateSettingsToSQLite(db, adapter);
    } catch (err) {
      log.error(err, { message: 'Settings migration failed (non-fatal)' });
    }

    // ── Step 3: Flush pending writes, then load from SQLite ────
    try { await flushWrites(); } catch (err) { log.error(err, { message: 'Flush failed (non-fatal)' }); }

    let settingsPatch: PartialMobileStore = {};
    let entityPatch: Record<string, unknown> = {};
    try {
      [settingsPatch, entityPatch] = await Promise.all([
        loadSettingsPatch(),
        rehydrateFromDb(),
      ]);
    } catch (err) {
      log.error(err, { message: 'Data loading failed (non-fatal)' });
    }

    // Merge settings + entities into store in one batch
    const fullPatch = { ...settingsPatch, ...entityPatch } as PartialMobileStore;
    if (Object.keys(fullPatch).length > 0) {
      setState(fullPatch);
    }

    // ── Step 4: Restore auth tokens from SecureStore ──────────
    try {
      const secureTokens = await loadSecureTokens();
      if (secureTokens) {
        const currentAuth = store().auth;
        if (currentAuth.isSignedIn && !currentAuth.token) {
          setState({
            auth: { ...currentAuth, token: secureTokens.token, refreshToken: secureTokens.refreshToken },
          } as PartialMobileStore);
        }
      }
    } catch (err) {
      log.error(err, { message: 'SecureStore load failed (non-fatal)' });
    }

    // ── Step 5: Wire auth token changes → SecureStore ─────────
    useAppStore.subscribe((state: any, prevState: any) => {
      const newToken = state.auth.token;
      const newRefresh = state.auth.refreshToken;
      const oldToken = prevState.auth.token;
      const oldRefresh = prevState.auth.refreshToken;
      if (newToken && newRefresh && (newToken !== oldToken || newRefresh !== oldRefresh)) {
        saveSecureTokens(newToken, newRefresh);
      } else if (!newToken && oldToken) {
        clearSecureTokens();
      }
    });

    // ── Step 6: Set up auto-sync callback ─────────────────────
    let autoSyncCallback: (() => void) | null = null;
    const triggerAutoSync = () => autoSyncCallback?.();
    autoSyncCallback = () => {
      store().autoSyncPlanItems?.();
      store().autoSyncHabits?.();
    };

    // ── Step 7: Create DailyResetManager with SQLite storage ──
    const dailyReset = new DailyResetManager({
      getLastReset: () => adapter.getSettings('lastDailyReset') as Promise<string | null>,
      setLastReset: (date: string) => { adapter.persistSettings('lastDailyReset', date).catch(e => log.error(e)); },
      getCheckinHistory: () => store().checkinHistory ?? [],
      applyPatch: (patch) => setState(patch as PartialMobileStore),
      getProfile: () => (store().userProfile ?? {}) as Record<string, unknown>,
      getWaterGoal: () => store().waterGoal ?? 2000,
      persistProfile: (data) => {
        const s = store();
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
        store().performDailyReset?.(previousDate);
      },
      onHabitDailyReset: () => {
        store().checkHabitAutoStatus?.();
      },
      addVisibilityListener: (callback) => {
        AppState.addEventListener('change', (s) => {
          if (s === 'active') callback();
        });
      },
    });

    // ── Step 8: Recalculate derived state ──────────────────────
    try {
      if (entityPatch.medHistory) store().calculateTotalMedMin();
      if (entityPatch.checkinHistory) store().calculateStreak();
    } catch (err) {
      log.error(err, { message: 'Derived state recalculation failed (non-fatal)' });
    }

    // ── Step 9: Clean up expired recycle bin items ─────────────
    try { store().cleanupRecycleBin(); } catch (err) { log.error(err, { message: 'Recycle bin cleanup failed (non-fatal)' }); }

    // ── Step 10: Start daily reset checks ──────────────────────
    try { dailyReset.start(Promise.resolve()); } catch (err) { log.error(err, { message: 'Daily reset start failed (non-fatal)' }); }

    log.info('App initialized successfully');
  } catch (err) {
    log.error(err, { message: 'App initialization failed — database open error' });
  }
}