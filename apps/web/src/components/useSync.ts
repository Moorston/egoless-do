'use client';

import { useSyncExternalStore, useEffect } from 'react';
import { normalizeEntity } from '@egoless-do/core';
import { initSync, subscribeSyncState, getSyncState, triggerSync, setSyncTokenProvider, setSyncStoreUpdater, type SyncState } from '../db/syncService';
import { useWebStore } from '../store/useWebStore';

const ENTITY_STATE_MAP: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fastingHistory',
  food: 'foodLog', checkin: 'checkinHistory', exercise: 'exerciseLog',
};

export function useSync(): SyncState & { triggerSync: () => Promise<void> } {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, getSyncState);
  const token = useWebStore(s => s.auth.token);

  useEffect(() => {
    // Configure sync service to use auth token
    setSyncTokenProvider(() => useWebStore.getState().auth.token);

    // Configure store updater: merge server changes into Zustand
    setSyncStoreUpdater((changes) => {
      const store = useWebStore.getState();
      const grouped: Record<string, any[]> = {};
      for (const c of changes) {
        const key = ENTITY_STATE_MAP[c.entity];
        if (!key) continue;
        (grouped[key] ??= []).push(normalizeEntity(c.payload));
      }
      if (Object.keys(grouped).length) {
        // Merge: for each entity type, replace matching items by id/date
        const patch: Record<string, any[]> = {};
        for (const [stateKey, serverItems] of Object.entries(grouped)) {
          const existing = (store as any)[stateKey] as any[] ?? [];
          const merged = [...existing];
          for (const item of serverItems) {
            const idField = item.date ? 'date' : 'id';
            const idx = merged.findIndex((e: any) => e[idField] === item[idField]);
            if (idx >= 0) merged[idx] = item;
            else merged.push(item);
          }
          patch[stateKey] = merged;
        }
        useWebStore.setState(patch);
      }
    });

    const cleanup = initSync();
    return cleanup;
  }, []);

  return { ...state, triggerSync };
}
