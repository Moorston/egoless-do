// ─── App Initialization — replaces onRehydrateStorage logic ──
// Called from App.tsx after the Zustand store is created.
// Loads all persisted data from SQLite, restores auth tokens,
// and sets up daily reset management.

import { DailyResetManager , createLogger, setSentryBridge, apiGetMe, configureFontScale } from '@egoless-do/core';
import { AppState, PixelRatio } from 'react-native';

import { openDatabase, setState as setAppState } from '../db/schema';
import {
  rehydrateFromDb,
  runSync,
  setTokenRecoveryFn,
  setRealtimeLogoutHandler,
  setRealtimeUserIdProvider,
} from '../features/sync/SyncService';
import { captureException, captureMessage, addBreadcrumb, setSentryUser, clearSentryUser } from '../sentry';

import { migrateAsyncStorageToSQLite, migrateSettingsToSQLite } from './migrateAsyncStorage';
import { loadSecureTokens, saveSecureTokens, clearSecureTokens } from './secureAuth';
import { mobileStorageAdapter as adapter, flushWrites } from './storageAdapter';
import { useAppStore, setAutoSyncCallback, type PartialMobileStore, type MobileStore } from './useAppStore';

const log = createLogger('App');

/** Tracks visibility listener subscription for cleanup on teardown. */
let _visibilitySubscription: { remove: () => void } | null = null;

/** Non-profile keys persisted in app_state table (profile settings use profile entity instead). */
const SETTINGS_KEYS = [
  'sleepGoal',      // SleepGoal object — persisted via SleepSlice.persistSettings, not in profile
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
  // Wire up Sentry bridge for all logger.error/warn calls
  setSentryBridge({ captureException, captureMessage, addBreadcrumb });

  // ── Step 0: Configure font scaling from system settings ─────
  // Must run before any StyleSheet.create() evaluates FONT_* constants.
  configureFontScale(PixelRatio.getFontScale());

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

    // Unpack profile fields into top-level store keys
    // Profile blob is the primary source of truth (updated by flushProfileSettings on every change).
    // These fields are NOT loaded from app_state — profile entity is the sole source.
    const profile = fullPatch.userProfile as Record<string, unknown> | undefined;
    if (profile) {
      const PROFILE_UNPACK_KEYS = [
        'waterMl', 'waterGoal', 'weightUnit', 'calGoal', 'customFoodPresets',
        'theme', 'language', 'remindEnabled', 'remindTime',
        'healthSyncEnabled', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder',
        'reflectionFilters', 'ignoredRecPatterns',
      ] as const;
      for (const key of PROFILE_UNPACK_KEYS) {
        if (profile[key] !== undefined) {
          (fullPatch as Record<string, unknown>)[key] = profile[key];
        }
      }
    }

    if (Object.keys(fullPatch).length > 0) {
      setState(fullPatch);
    }

    // ── Step 3b: Clean up ghost entries (atomically inside setState to avoid race with realtime) ──
    try {
      const GHOST_CHECKS: Array<[string, string, (item: Record<string, unknown>) => boolean]> = [
        ['foodLog', 'food', f => f.name == null && f.calories == null && f.timestamp == null],
        ['exerciseLog', 'exercise', f => f.sportKey == null && f.date == null],
        ['plans', 'plan', f => f.name == null && f.startDate == null],
        ['medHistory', 'meditation', f => f.date == null && f.durationSec == null],
        ['sleepHistory', 'sleep', f => f.date == null && f.startTs == null],
        ['breathHistory', 'breath', f => f.date == null && f.durationSec == null],
        ['sessions', 'zhiguanSession', f => f.startTs == null && f.status == null],
        ['mantraSessions', 'mantraSession', f => f.mantraId == null && f.date == null],
        ['mantraDefs', 'mantraDef', f => f.name == null && f.subtitle == null],
        ['visions', 'vision', f => f.text == null && f.type == null],
        ['dedications', 'dedication', f => f.date == null && f.periodLabel == null],
        ['fearEntries', 'fearEntry', f => f.content == null && f.date == null],
        ['courageEntries', 'courageEntry', f => f.action == null && f.date == null],
        ['giveHistory', 'give', f => f.content == null && f.date == null],
        ['motivationLog', 'motivationEntry', f => f.foodId == null && f.motivation == null],
        ['readingSessions', 'sutraReading', f => f.mantraId == null && f.date == null],
      ];
      const toDelete: Array<{ entity: string; id: string }> = [];
      // Step 1: Pure computation — find ghosts from current store state (outside setState)
      const s = store();
      const ghostPatch: Record<string, unknown[]> = {};
      for (const [storeKey, entity, isGhost] of GHOST_CHECKS) {
        const items = (s[storeKey as keyof typeof s] ?? []) as Array<Record<string, unknown>>;
        const ghosts = items.filter(i => !i.deleted && isGhost(i));
        if (ghosts.length > 0) {
          log.warn(`cleanupGhosts: ${storeKey} — removing ${ghosts.length} ghost entries`);
          ghostPatch[storeKey] = items.map(i => ghosts.some(g => g.id === i.id) ? { ...i, deleted: true, updatedAt: Date.now() } : i);
          for (const g of ghosts) toDelete.push({ entity, id: g.id as string });
        }
      }
      // Step 2: Apply state atomically
      if (Object.keys(ghostPatch).length > 0) {
        setState(ghostPatch as PartialMobileStore);
      }
      for (const { entity, id } of toDelete) {
        adapter.markDeleted(entity as Parameters<typeof adapter.markDeleted>[0], id).catch(e => log.error(e));
      }
    } catch (err) {
      log.error(err, { message: 'Ghost cleanup failed (non-fatal)' });
    }

    // ── Step 4: Restore auth tokens from SecureStore ──────────
    try {
      const secureTokens = await loadSecureTokens();
      if (secureTokens) {
        const currentAuth = store().auth;
        // Always restore tokens from SecureStore if available (regardless of isSignedIn state)
        // This handles cases where the in-memory/sqlite auth state was lost (crash, migration)
        if (secureTokens.token && secureTokens.refreshToken) {
          // Try to verify the token is still valid by calling getMe
          // If it fails, keep the token anyway — refreshAuth() will handle it later
          const authPatch: Record<string, unknown> = {
            token: secureTokens.token,
            refreshToken: secureTokens.refreshToken,
          };
          if (secureTokens.expiresAt) {
            authPatch.expiresAt = secureTokens.expiresAt;
          }

          // Verify token validity in background — don't block app startup
          apiGetMe(secureTokens.token).then(({ user }) => {
            // Token is valid — update user info
            const latestAuth = store().auth;
            if (latestAuth.token === secureTokens.token) {
              setState({ auth: { ...latestAuth, user } } as PartialMobileStore);
            }
          }).catch(() => {
            // Token expired or invalid — proactively refresh instead of waiting for next sync
            log.info('SecureStore token expired, proactively refreshing');
            store().refreshAuth().catch(e => log.error(e, { message: 'Startup token refresh failed' }));
          });

          if (!currentAuth.isSignedIn) {
            // Restore full auth state from SecureStore
            setState({
              auth: {
                ...currentAuth,
                ...authPatch,
                isSignedIn: true,
                isLoading: false,
              },
            } as PartialMobileStore);
          } else if (!currentAuth.token) {
            // Token was lost but user was still marked signed in
            setState({
              auth: { ...currentAuth, ...authPatch },
            } as PartialMobileStore);
          }
        }
      }
    } catch (err) {
      log.error(err, { message: 'SecureStore load failed — user may appear logged out despite valid tokens' });
    }

    // Guard: if user appears signed in but has no token (SecureStore empty/corrupt),
    // clear signed-in state to prevent stuck "no token" state on next sync.
    {
      const auth = store().auth;
      if (auth.isSignedIn && !auth.token) {
        log.warn('isSignedIn=true but no token — clearing auth state');
        setState({ auth: { ...auth, isSignedIn: false, isLoading: false } } as PartialMobileStore);
      }
    }

    // ── Step 5: Wire auth token changes → SecureStore + Sentry user ─
    // Store unsubscribe handle for testability (subscription is permanent in production).
    const _unsubscribeAuth = useAppStore.subscribe((state: MobileStore, prevState: MobileStore) => {
      const newToken = state.auth.token;
      const newRefresh = state.auth.refreshToken;
      const oldToken = prevState.auth.token;
      const oldRefresh = prevState.auth.refreshToken;
      if (newToken && newRefresh && (newToken !== oldToken || newRefresh !== oldRefresh)) {
        saveSecureTokens(newToken, newRefresh, state.auth.expiresAt).catch(e => log.error(e, { phase: 'saveSecureTokens' }));
      } else if (!newToken && oldToken) {
        clearSecureTokens().catch(e => log.error(e, { phase: 'clearSecureTokens' }));
      }
      // Sync Sentry user context on auth state changes
      if (state.auth.isSignedIn && state.auth.user && (!prevState.auth.isSignedIn || state.auth.user.id !== prevState.auth.user?.id)) {
        setSentryUser({ id: state.auth.user.id, email: state.auth.user.email, name: state.auth.user.name });
      } else if (!state.auth.isSignedIn && prevState.auth.isSignedIn) {
        clearSentryUser();
      }
    });
    // Suppress unused variable warning — _unsubscribeAuth is stored for testability
    void _unsubscribeAuth;

    // ── Step 6: Set up auto-sync callback ─────────────────────
    // Connect the store's triggerAutoSync → SyncEngine so data mutations trigger sync
    setAutoSyncCallback(() => {
      store().autoSyncPlanItems?.();
      store().autoSyncHabits?.();
      runSync().catch((e) => log.error(e));
    });

    // ── Step 6b: Wire token recovery for SyncEngine ──────────
    // Avoids circular import: SyncEngine → useAppStore
    setTokenRecoveryFn(async () => {
      const auth = store().auth;
      if (auth.refreshToken) {
        await store().refreshAuth();
        return store().auth.token ?? null;
      }
      return null;
    });

    // ── Step 6c: Wire realtime controller callbacks ──────────
    // Avoids circular import: SyncRealtimeController → useAppStore
    setRealtimeLogoutHandler(() => { void store().logout(); });
    setRealtimeUserIdProvider(() => store().auth.user?.id ?? undefined);

    // ── Step 7: Create DailyResetManager with SQLite storage ──
    const dailyReset = new DailyResetManager({
      getLastReset: async () => {
        const val = await adapter.getSettings('lastDailyReset');
        return typeof val === 'string' ? val : null;
      },
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
        // Store subscription for cleanup on teardown
        _visibilitySubscription = AppState.addEventListener('change', (s) => {
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
    // Pass Promise.resolve() so the first check runs immediately (no waiting for sync).
    // This is intentional: the daily reset should fire on app start regardless of sync
    // status, because the user's local timezone may have crossed midnight while offline.
    try { dailyReset.start(Promise.resolve()); } catch (err) { log.error(err, { message: 'Daily reset start failed (non-fatal)' }); }

    log.info('App initialized successfully');
  } catch (err) {
    log.error(err, { message: 'App initialization failed — database open error' });
  }
}