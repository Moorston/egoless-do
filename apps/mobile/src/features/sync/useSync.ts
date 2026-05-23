// ─── useSync hook (mobile) ────────────────────────────────────────
// Connects SyncService to the app lifecycle: foreground triggers sync,
// token comes from Zustand store, server changes update store.
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { runSync, setSyncTokenProvider, setSyncChangeHandler, setLastSyncAt } from './SyncService';
import { useAppStore } from '../../store/useAppStore';

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
    });
  }, []);

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
