'use client';

import { useSyncExternalStore, useEffect } from 'react';
import { initSync, subscribeSyncState, getSyncState, triggerSync, setSyncTokenProvider, type SyncState } from '../db/syncService';
import { useWebStore } from '../store/useWebStore';

export function useSync(): SyncState & { triggerSync: () => Promise<void> } {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, getSyncState);
  const token = useWebStore(s => s.auth.token);

  useEffect(() => {
    // Configure sync service to use auth token
    setSyncTokenProvider(() => useWebStore.getState().auth.token);
    const cleanup = initSync();
    return cleanup;
  }, []);

  return { ...state, triggerSync };
}
