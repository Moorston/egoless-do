// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { registerPushToken, getSyncUrl, createLogger } from '@egoless-do/core';
import type { RecycleBinItem } from '@egoless-do/core';
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { getState, openDatabase } from '../../db/schema';
import { getQueueCount, setOnEnqueuedCallback } from '../../db/syncQueue';
import { mobileStorageAdapter, flushWrites, setStorageAdapterTrigger, setRegisterLocalDelete } from '../../store/storageAdapter';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import type { MobileStore } from '../../store/useAppStore';
import { useMusicStore } from '../music/useMusicStore';
import { useSyncStore } from '../../store/syncStore';

import { runSync, setSyncTokenProvider, setSyncUserIdProvider, setSyncChangeHandler, setDeletedIdsProvider, connectRealtime, disconnectRealtime, isMigrationDone, setMigrationDone, resetMigrationFlag, rehydrateFromDb, setKickedOutHandler, resumeInitialSync, setSyncTriggerCallback, triggerSyncDebounced, clearSyncTrigger, registerLocalDelete, setSyncErrorHandler } from './SyncService';
import { mergeSyncPatch } from './mergeSyncPatch';
import { migrateToSyncQueue } from './migrateToSyncQueue';

const log = createLogger('Sync');

type SyncableItem = { id?: string; deleted?: boolean; updatedAt?: number; [k: string]: unknown };
type SyncPatch = Record<string, SyncableItem[] | unknown>;

const getNotifications = () => import('expo-notifications');

export function useSync() {
  const token = useShallowStore(s => s.auth.token);
  const isSignedIn = useShallowStore(s => s.auth.isSignedIn);
  const syncingRef = useRef(false);
  const [kickOutVisible, setKickOutVisible] = useState(false);
  const [hasPendingData, setHasPendingData] = useState(false);

  // Kick out handlers
  const handleSyncAndLogout = useCallback(async () => {
    const auth = useAppStore.getState().auth;
    if (auth.token) {
      try {
        await useAppStore.getState().refreshAuth();
      } catch (e) { log.debug('Token refresh failed during kick-out:', e); }
    }
    const newToken = useAppStore.getState().auth.token;
    if (newToken) {
      try {
        await runSync(); // Push pending data with fresh token
      } catch {
        log.error('Sync before logout failed, staying logged in');
        setKickOutVisible(true); // Re-show dialog on failure
        return;
      }
    }
    setKickOutVisible(false);
    void useAppStore.getState().logout();
  }, []);

  const handleLogoutDirectly = useCallback(() => {
    setKickOutVisible(false);
    void useAppStore.getState().logout();
  }, []);

  // Wire up token provider & change handler once
  useEffect(() => {
    setSyncTokenProvider(() => {
      const state = useAppStore.getState();
      const token = state.auth.token;
      if (!token) {
        log.warn(`tokenProvider: token is null! isSignedIn=${state.auth.isSignedIn}, refreshToken=${state.auth.refreshToken ? 'yes' : 'no'}, expiresAt=${state.auth.expiresAt}`);
      }
      return token;
    });
    log.info('Token provider and sync callbacks registered');
    setSyncUserIdProvider(() => useAppStore.getState().auth.user?.id ?? null);

    // Wire up debounced sync trigger: WriteBatcher flush → triggerSyncDebounced → runSync
    setSyncTriggerCallback(() => { runSync().catch((e) => log.error(e)); });
    setOnEnqueuedCallback(() => { triggerSyncDebounced(); });
    // Wire WriteBatcher flush → triggerSyncDebounced (breaks circular dependency)
    setStorageAdapterTrigger(() => { triggerSyncDebounced(); });
    // Wire local delete → SyncApplyService (prevents sync resurrection)
    setRegisterLocalDelete((entity, id) => { registerLocalDelete(entity, id); });

    // Register kicked out handler
    setKickedOutHandler(async () => {
      const count = await getQueueCount();
      setHasPendingData(count > 0);
      setKickOutVisible(true);
    });

    // Wire sync error to UI store
    setSyncErrorHandler((error) => {
      useSyncStore.getState().setSyncError(error);
    });

    setSyncChangeHandler(async (patch: SyncPatch) => {
      try {
        // Use functional updater to ensure atomicity (prevents race conditions)
        let changedEntities: string[] = [];
        useAppStore.setState((state: MobileStore) => {
          const result = mergeSyncPatch(state, patch);
          changedEntities = result.changedEntities;
          return result.storePatch;
        });

        // Restore music data from synced profile
        if (changedEntities.includes('profile') || patch.userProfile) {
          const up = useAppStore.getState().userProfile;
          if (up) {
            const musicPatch: Record<string, unknown> = {};
            if (up.musicFavorites && Array.isArray(up.musicFavorites)) musicPatch.favorites = up.musicFavorites;
            if (up.musicVolume !== undefined && typeof up.musicVolume === 'number') musicPatch.volume = up.musicVolume;
            if (up.musicPlayMode && typeof up.musicPlayMode === 'string') musicPatch.playMode = up.musicPlayMode;
            if (Object.keys(musicPatch).length) useMusicStore.setState(musicPatch as Partial<ReturnType<typeof useMusicStore.getState>>);
          }
        }

        if (changedEntities.includes('meditation')) {
          useAppStore.getState().calculateTotalMedMin();
        }

        if (changedEntities.includes('checkin')) {
          useAppStore.getState().calculateStreak();
        }
      } catch (callbackErr) {
        log.error(callbackErr, { msg: '_onChanges callback error' });
      }
    });
    // Provide recycle bin IDs so sync can skip locally deleted items
    setDeletedIdsProvider(() => {
      const recycleBin = useAppStore.getState().recycleBin ?? [];
      return new Set(recycleBin.map((r: RecycleBinItem) => r.id as string));
    });
  }, []);

  // Register push token on sign in
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const getExpoPushToken = async () => {
      try {
        const Notifications = await getNotifications();
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          log.info('Permission denied');
          return null;
        }

        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
        if (!projectId) {
          log.info('No project ID configured');
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        return tokenData.data;
      } catch (err) {
        log.error(err, { msg: 'Failed to get push token' });
        return null;
      }
    };

    registerPushToken(token, Platform.OS as 'ios' | 'android', getExpoPushToken);
  }, [isSignedIn, token]);

  // Connect realtime on sign in (short polling)
  useEffect(() => {
    if (!isSignedIn || !token) {
      disconnectRealtime();
      return;
    }

    connectRealtime(getSyncUrl());

    return () => {
      disconnectRealtime();
    };
  }, [isSignedIn, token]);

  // Sync on foreground if signed in
  const prevTokenRef = useRef(token);
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const sync = async () => {
      if (syncingRef.current) return; // Prevent concurrent syncs
      syncingRef.current = true;
      try {
        // Proactive token refresh: refresh before it expires to avoid mid-sync auth failures
        try {
          await useAppStore.getState().refreshAuth();
        } catch {
          // Best-effort: if refresh fails, sync will handle token recovery
        }

        // One-time migration: move old unsynced records to sync_queue
        if (!isMigrationDone()) {
          await migrateToSyncQueue();
          setMigrationDone();
        }

        // Check if initial sync was interrupted — resume from breakpoint
        const db = await openDatabase();
        const initialDone = await getState(db, 'initialSyncDone');
        if (initialDone !== 'true' && token) {
          const userId = useAppStore.getState().auth.user?.id;
          await resumeInitialSync(token, userId);
          // Rehydrate after resume — flush pending writes first
          await flushWrites();
          const dbPatch = await rehydrateFromDb();
          if (Object.keys(dbPatch).length) {
            useAppStore.setState(dbPatch as Partial<MobileStore>);
          }
          useAppStore.getState().calculateStreak();
          if (dbPatch.medHistory) useAppStore.getState().calculateTotalMedMin();
        }

        // runSync() manages _lastSyncAt internally — no need to set it here
        await runSync();
      } catch (e) {
        log.error(e);
      } finally {
        syncingRef.current = false;
      }
    };

    // Only trigger sync if token actually changed (prevents retry loop on token refresh)
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token;
    }

    // Initial sync on mount
    sync();

    // Sync when app returns to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') sync();
    });

    return () => sub.remove();
  }, [isSignedIn, token]);

  return {
    kickOutVisible,
    hasPendingData,
    handleSyncAndLogout,
    handleLogoutDirectly,
  };
}
