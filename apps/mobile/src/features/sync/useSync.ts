// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { runSync, setSyncTokenProvider, setSyncUserIdProvider, setSyncChangeHandler, setDeletedIdsProvider, connectRealtime, disconnectRealtime, _migrationDone, setMigrationDone, resetMigrationFlag, rehydrateFromDb, setKickedOutHandler, resumeInitialSync, setSyncTriggerCallback, triggerSyncDebounced, clearSyncTrigger } from './SyncService';
import { migrateToSyncQueue } from './migrateToSyncQueue';
import { getQueueCount, setOnEnqueuedCallback } from '../../db/syncQueue';
import { getState, openDatabase } from '../../db/schema';
import { useAppStore } from '../../store/useAppStore';
import type { MobileStore } from '../../store/useAppStore';
import { mobileStorageAdapter } from '../../store/storageAdapter';
import { registerPushToken, getSyncUrl, createLogger } from '@egoless-do/core';

const log = createLogger('Sync');

type SyncableItem = { id?: string; deleted?: boolean; updatedAt?: number; [k: string]: unknown };
type SyncPatch = Record<string, SyncableItem[] | unknown>;

const getNotifications = () => import('expo-notifications');

export function useSync() {
  const token = useAppStore(s => s.auth.token);
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const syncingRef = useRef(false);
  const [kickOutVisible, setKickOutVisible] = useState(false);
  const [hasPendingData, setHasPendingData] = useState(false);

  // Kick out handlers
  const handleSyncAndLogout = useCallback(async () => {
    setKickOutVisible(false);
    try {
      await runSync(); // Push pending data
      useAppStore.getState().logout();
    } catch {
      // Sync failed — stay logged in so user can retry; don't lose pending data
      log.error('Sync before logout failed, staying logged in');
    }
  }, []);

  const handleLogoutDirectly = useCallback(() => {
    setKickOutVisible(false);
    useAppStore.getState().logout();
  }, []);

  // Wire up token provider & change handler once
  useEffect(() => {
    setSyncTokenProvider(() => useAppStore.getState().auth.token);
    setSyncUserIdProvider(() => useAppStore.getState().auth.user?.id ?? null);

    // Wire up debounced sync trigger: enqueueChange → triggerSyncDebounced → runSync
    setSyncTriggerCallback(() => { runSync().catch((e) => log.error(e)); });
    setOnEnqueuedCallback(() => { triggerSyncDebounced(); });

    // Register kicked out handler
    setKickedOutHandler(async () => {
      const count = await getQueueCount();
      setHasPendingData(count > 0);
      setKickOutVisible(true);
    });

    setSyncChangeHandler(async (patch: SyncPatch) => {
      try {
      // Map store keys back to entity names for rehydrateFromDb
      const STORE_KEY_TO_ENTITY: Record<string, string> = {
        habits: 'habit', reflections: 'reflection', fastingHistory: 'fasting',
        foodLog: 'food', checkinHistory: 'checkin', exerciseLog: 'exercise',
        medHistory: 'meditation', userProfile: 'profile',
        plans: 'plan', planItems: 'planItem', planItemCheckins: 'planItemCheckin',
        dailyCustomTodos: 'dailyCustomTodo', dailyTodoHistory: 'dailyTodoHistory',
        graceHistory: 'grace', thoughtTrails: 'thoughtTrail',
        trailNotes: 'trailNote', reflectionLinks: 'reflectionLink',
        checkinReviews: 'checkinReview',
      };

      // Patch from applyServerChanges already contains store-mapped entities.
      // Use them directly instead of re-reading from SQLite.
      const storePatch: Partial<MobileStore> = {};
      const isStoreKey = (k: string) => !!STORE_KEY_TO_ENTITY[k];
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'totalMedMinutes') {
          storePatch.totalMedMinutes = value as number;
        } else if (key === 'aiMode') {
          (storePatch as any).aiMode = value;
        } else if (key === 'aiModels') {
          (storePatch as any).aiModels = value;
        } else if (isStoreKey(key) && Array.isArray(value)) {
          (storePatch as any)[key] = value;
        }
      }

      if (Object.keys(storePatch).length) {
        useAppStore.setState(storePatch);
      }

      // Derived state recalculation
      const changedEntities = Object.keys(patch)
        .map(k => STORE_KEY_TO_ENTITY[k] ?? (k === 'aiMode' || k === 'aiModels' ? 'aiConfig' : null))
        .filter(Boolean) as string[];

      if (changedEntities.includes('meditation')) {
        useAppStore.getState().calculateTotalMedMin();
      }

      // thoughtTrailIds reconciliation: rebuild from canonical thoughtTrail.reflectionIds
      if (changedEntities.includes('thoughtTrail') || changedEntities.includes('reflection')) {
        const state = useAppStore.getState();
        const trails = state.thoughtTrails ?? [];
        const trailMap = new Map<string, string[]>();
        for (const trail of trails) {
          if (trail.deleted) continue;
          for (const rid of (trail.reflectionIds ?? [])) {
            const arr = trailMap.get(rid) ?? [];
            arr.push(trail.id);
            trailMap.set(rid, arr);
          }
        }
        const reflections = state.reflections ?? [];
        const updated = reflections.map(r => {
          const ids = trailMap.get(r.id) ?? [];
          const current = r.thoughtTrailIds ?? [];
          if (ids.length === current.length && ids.every((id, i) => id === current[i])) return r;
          return { ...r, thoughtTrailIds: ids };
        });
        if (updated.some((r, i) => r !== reflections[i])) {
          useAppStore.setState({ reflections: updated } as Partial<MobileStore>);
        }
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
      return new Set(recycleBin.map((r) => ((r as unknown) as Record<string, unknown>).id as string));
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
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const sync = async () => {
      if (syncingRef.current) return; // Prevent concurrent syncs
      syncingRef.current = true;
      try {
        // One-time migration: move old unsynced records to sync_queue
        if (!_migrationDone) {
          await migrateToSyncQueue();
          setMigrationDone();
        }

        // Check if initial sync was interrupted — resume from breakpoint
        const db = await openDatabase();
        const initialDone = await getState(db, 'initialSyncDone');
        if (initialDone !== 'true' && token) {
          const userId = useAppStore.getState().auth.user?.id;
          await resumeInitialSync(token, userId);
          // Rehydrate after resume
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
