// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runSync, setSyncTokenProvider, setSyncChangeHandler, setLastSyncAt, connectRealtime, disconnectRealtime } from './SyncService';
import { useAppStore } from '../../store/useAppStore';
import { registerPushToken } from '@egoless-do/core';
import * as Notifications from 'expo-notifications';

const POCKETBASE_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? 'http://localhost:8090';

export function useSync() {
  const token = useAppStore(s => s.auth.token);
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const updateFromSync = useAppStore.setState;
  const lastSyncAtRef = useRef(0);

  // Wire up token provider & change handler once
  useEffect(() => {
    setSyncTokenProvider(() => useAppStore.getState().auth.token);
    setSyncChangeHandler((patch) => {
      useAppStore.setState(patch);
      // Recalculate streak after syncing checkin records
      if (patch.checkinHistory) {
        useAppStore.getState().calculateStreak();
      }
    });
  }, []);

  // Register push token on sign in
  useEffect(() => {
    if (!isSignedIn || !token) return;

    const getExpoPushToken = async () => {
      try {
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
