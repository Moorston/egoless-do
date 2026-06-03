'use client';

import { useSyncExternalStore, useEffect } from 'react';
import { normalizeEntity } from '@egoless-do/core';
import { initSync, subscribeSyncState, getSyncState, triggerSync, setSyncTokenProvider, setSyncStoreUpdater, setDeletedIdsProvider, type SyncState } from '../db/syncService';
import { useWebStore } from '../store/useWebStore';

const ENTITY_STATE_MAP: Record<string, string> = {
  habit: 'habits', reflection: 'reflections', fasting: 'fastingHistory',
  food: 'foodLog', checkin: 'checkinHistory', exercise: 'exerciseLog',
  meditation: 'medHistory', profile: 'userProfile', grace: 'graceHistory',
  plan: 'plans', planItem: 'planItems', planItemCheckin: 'planItemCheckins',
};

export function useSync(): SyncState & { triggerSync: () => Promise<void> } {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, getSyncState);
  const token = useWebStore(s => s.auth.token);

  useEffect(() => {
    // Configure sync service to use auth token
    setSyncTokenProvider(() => useWebStore.getState().auth.token);

    // Provide deleted IDs from recycle bin to prevent server data from re-adding them
    setDeletedIdsProvider(() => {
      const recycleBin = (useWebStore.getState() as any).recycleBin ?? [];
      return new Set(recycleBin.map((r: any) => r.id));
    });

    // Configure store updater: merge server changes into Zustand
    setSyncStoreUpdater((changes) => {
      const store = useWebStore.getState();
      const grouped: Record<string, { entity: string; payload: any }[]> = {};
      for (const c of changes) {
        const key = ENTITY_STATE_MAP[c.entity];
        if (!key) continue;
        (grouped[key] ??= []).push({ entity: c.entity, payload: normalizeEntity(c.payload) });
      }
      if (Object.keys(grouped).length) {
        const patch: Record<string, any> = {};
        for (const [stateKey, entries] of Object.entries(grouped)) {
          // userProfile is a single object, not an array
          if (stateKey === 'userProfile') {
            const latest = entries.filter(e => !e.payload.deleted).sort((a, b) => (b.payload.updatedAt ?? 0) - (a.payload.updatedAt ?? 0))[0];
            if (latest) {
              const merged = { ...(store.userProfile ?? {}), ...latest.payload };
              patch.userProfile = merged;
              if (merged.waterMl !== undefined) patch.waterMl = merged.waterMl;
              if (merged.waterGoal !== undefined) patch.waterGoal = merged.waterGoal;
            }
            continue;
          }
          const existing = (store as any)[stateKey] as any[] ?? [];
          const merged = [...existing];
          for (const { payload: item } of entries) {
            const idField = item.date ? 'date' : 'id';
            const idx = merged.findIndex((e: any) => e[idField] === item[idField]);
            if (idx >= 0) {
              const local = merged[idx];
              if (local.deleted) {
                // Local is deleted — only accept if server also deleted with newer timestamp
                if (item.deleted && (item.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
                  merged[idx] = item;
                }
                // Otherwise keep local deleted version — server cannot resurrect
              } else if (item.deleted) {
                // Server says deleted, local is not — apply if server is newer
                if ((item.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
                  merged[idx] = item;
                }
              } else {
                // Neither deleted — keep newest
                if ((item.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
                  merged[idx] = item;
                }
              }
            } else {
              // New from server — skip if it's already deleted
              if (!item.deleted) merged.push(item);
            }
          }
          patch[stateKey] = merged;
        }
        useWebStore.setState(patch);
        // Recalculate streak after syncing checkin records
        if (patch.checkinHistory) {
          useWebStore.getState().calculateStreak();
        }
      }
    });

    const cleanup = initSync();
    return cleanup;
  }, []);

  return { ...state, triggerSync };
}
