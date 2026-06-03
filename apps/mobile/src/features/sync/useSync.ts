// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runSync, setSyncTokenProvider, setSyncChangeHandler, setDeletedIdsProvider, setLastSyncAt, connectRealtime, disconnectRealtime } from './SyncService';
import { useAppStore } from '../../store/useAppStore';
import { registerPushToken } from '@egoless-do/core';

const getNotifications = () => import('expo-notifications');

const POCKETBASE_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? 'http://localhost:8090';

export function useSync() {
  const token = useAppStore(s => s.auth.token);
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const lastSyncAtRef = useRef(0);

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
      };
      for (const [key, storeKey] of Object.entries(ARRAY_KEYS)) {
        if (!patch[key]) continue;
        const serverItems = patch[key] as any[];
        const existing = (store as any)[storeKey] as any[] ?? [];
        const result = [...existing];
        for (const item of serverItems) {
          const idField = item.date ? 'date' : 'id';
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
                result[idx] = (storeKey === 'reflections' && !item.colors && local.colors)
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
      useAppStore.setState(merged);
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
    connectRealtime(POCKETBASE_URL);

    return () => {
      disconnectRealtime();
    };
  }, [isSignedIn, token]);

  // Sync on foreground if signed in
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const sync = () => {
      setLastSyncAt(lastSyncAtRef.current);
      runSync().then(() => {
        // lastSyncAt is updated internally in runSync
      }).catch((e) => console.error('[err]', e));
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
