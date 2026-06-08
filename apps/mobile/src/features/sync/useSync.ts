// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runSync, setSyncTokenProvider, setSyncChangeHandler, setDeletedIdsProvider, connectRealtime, disconnectRealtime } from './SyncService';
import { migrateToSyncQueue } from './migrateToSyncQueue';
import { useAppStore } from '../../store/useAppStore';
import { mobileStorageAdapter } from '../../store/storageAdapter';
import { registerPushToken } from '@egoless-do/core';

const getNotifications = () => import('expo-notifications');

// Module-level guards to avoid repeated DB queries and concurrent syncs
let _migrationDone = false;

export function resetMigrationFlag() {
  _migrationDone = false;
}

export function useSync() {
  const token = useAppStore(s => s.auth.token);
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const syncingRef = useRef(false);

  // Wire up token provider & change handler once
  useEffect(() => {
    setSyncTokenProvider(() => useAppStore.getState().auth.token);
    setSyncChangeHandler((patch) => {
      const store = useAppStore.getState();
      const merged: Record<string, unknown> = {};
      const ARRAY_KEYS: Record<string, string> = {
        habits: 'habits', reflections: 'reflections', fastingHistory: 'fastingHistory',
        foodLog: 'foodLog', checkinHistory: 'checkinHistory', exerciseLog: 'exerciseLog',
        medHistory: 'medHistory', plans: 'plans', planItems: 'planItems',
        planItemCheckins: 'planItemCheckins', dailyCustomTodos: 'dailyCustomTodos',
        dailyTodoHistory: 'dailyTodoHistory', graceHistory: 'graceHistory',
        thoughtTrails: 'thoughtTrails',
      };
      // Explicit PK field per store key (don't guess from field presence)
      const KEY_FIELD: Record<string, string> = {
        checkinHistory: 'date', medHistory: 'date', graceHistory: 'date',
      };
      for (const [key, storeKey] of Object.entries(ARRAY_KEYS)) {
        if (!patch[key]) continue;
        const serverItems = patch[key] as any[];
        const existing = (store as any)[storeKey] as any[] ?? [];
        const result = [...existing];
        const idField = KEY_FIELD[storeKey] ?? 'id';
        for (const item of serverItems) {
          const idx = result.findIndex((e: any) => e[idField] === item[idField]);
          if (idx >= 0) {
            const local = result[idx];
            if (local.deleted) {
              if (item.deleted && (item.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
                result[idx] = item;
              }
            } else if (item.deleted) {
              if ((item.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
                result[idx] = item;
              }
            } else {
              if ((item.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
                const itemColorsMissing = storeKey === 'reflections' && (!item.colors || typeof item.colors === 'string');
                result[idx] = (itemColorsMissing && local.colors && Array.isArray(local.colors))
                  ? { ...item, colors: local.colors }
                  : item;
              }
            }
          } else {
            if (!item.deleted) result.push(item);
          }
        }
        merged[storeKey] = result;
      }
      // Non-array fields (userProfile, waterMl, etc.) pass through directly
      for (const key of Object.keys(patch)) {
        if (!ARRAY_KEYS[key]) merged[key] = patch[key];
      }

      // Extract settings from profile data (piggybacked on profile entity)
      if (merged.userProfile && Array.isArray(merged.userProfile)) {
        const profileArr = merged.userProfile as any[];
        if (profileArr.length > 0) {
          // Pick the latest non-deleted profile (matching pullServerData behavior)
          const latest = profileArr
            .filter((p: any) => !p.deleted)
            .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
          if (latest) {
            let profileData = latest.data ?? latest;
            if (typeof profileData === 'string') {
              try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
            }
            // Flatten profile array back to object (matching pullServerData behavior)
            merged.userProfile = { ...(store.userProfile ?? {}), ...profileData };
            if (profileData.waterMl !== undefined) merged.waterMl = profileData.waterMl;
            if (profileData.waterGoal !== undefined) merged.waterGoal = profileData.waterGoal;
            if (profileData.weightUnit !== undefined) merged.weightUnit = profileData.weightUnit;
            const SETTINGS_KEYS = ['calGoal', 'customFoodPresets', 'theme', 'language', 'remindEnabled', 'remindTime', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder'] as const;
            for (const sk of SETTINGS_KEYS) {
              if (profileData[sk] !== undefined) (merged as any)[sk] = profileData[sk];
            }
          } else {
            // All profiles deleted — remove userProfile from patch, continue with other data
            delete merged.userProfile;
          }
        }
      }
      useAppStore.setState(merged);

      // Reconcile thoughtTrailIds: rebuild from canonical thoughtTrail.reflectionIds
      if (merged.thoughtTrails || merged.reflections) {
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
        const changedReflections: typeof reflections = [];
        const updated = reflections.map(r => {
          const ids = trailMap.get(r.id) ?? [];
          const current = r.thoughtTrailIds ?? [];
          if (ids.length === current.length && ids.every((id, i) => id === current[i])) return r;
          const updatedR = { ...r, thoughtTrailIds: ids };
          changedReflections.push(updatedR);
          return updatedR;
        });
        if (changedReflections.length) {
          useAppStore.setState({ reflections: updated } as any);
          for (const r of changedReflections) {
            mobileStorageAdapter.persistChange('reflection', r.id, r).catch(console.error);
          }
        }
      }

      if (merged.checkinHistory) {
        useAppStore.getState().calculateStreak();
      }
    });
    // Provide recycle bin IDs so sync can skip locally deleted items
    setDeletedIdsProvider(() => {
      const recycleBin = useAppStore.getState().recycleBin ?? [];
      return new Set(recycleBin.map((r: any) => r.id));
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
          console.log('[Push] Permission denied');
          return null;
        }

        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
        if (!projectId) {
          console.log('[Push] No project ID configured');
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        return tokenData.data;
      } catch (err) {
        console.error('[Push] Failed to get push token:', err);
        return null;
      }
    };

    registerPushToken(token, 'ios', getExpoPushToken);
  }, [isSignedIn, token]);

  // Connect realtime on sign in (short polling)
  useEffect(() => {
    if (!isSignedIn || !token) {
      disconnectRealtime();
      return;
    }

    // Connect to real-time sync (short polling)
    connectRealtime();

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
          await migrateToSyncQueue().catch((e) => console.error('[Migration] Error:', e));
          _migrationDone = true;
        }

        // runSync() manages _lastSyncAt internally — no need to set it here
        await runSync();
      } catch (e) {
        console.error('[err]', e);
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
}
