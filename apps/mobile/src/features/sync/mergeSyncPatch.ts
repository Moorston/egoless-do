// ─── mergeSyncPatch ────────────────────────────────────────────────
// Pure function: merges a sync delta patch into the current store state.
// Returns the store patch to apply and the list of changed entities.
// Side-effect free — safe to unit test.
import type { AIMode, ModelConfig } from '@egoless-do/core';

import type { MobileStore } from '../../store/useAppStore';

/** Maps Zustand store keys to entity names used by rehydrateFromDb / sync. */
export const STORE_KEY_TO_ENTITY: Record<string, string> = {
  habits: 'habit', reflections: 'reflection', fastingHistory: 'fasting',
  foodLog: 'food', checkinHistory: 'checkin', exerciseLog: 'exercise',
  medHistory: 'meditation', userProfile: 'profile',
  plans: 'plan', planItems: 'planItem', planItemCheckins: 'planItemCheckin',
  dailyCustomTodos: 'dailyCustomTodo', dailyTodoHistory: 'dailyTodoHistory',
  graceHistory: 'grace', thoughtTrails: 'thoughtTrail',
  trailNotes: 'trailNote', reflectionLinks: 'reflectionLink',
  checkinReviews: 'checkinReview',
  bodyGoals: 'bodyGoal', bodyPlans: 'bodyPlan',
  weightRecords: 'weightRecord', bodyCheckins: 'bodyCheckin',
  sleepHistory: 'sleep', giveHistory: 'give',
  motivationLog: 'motivationEntry', customWuxingMaps: 'customWuxing',
  visions: 'vision', visionPractices: 'visionPractice', dedications: 'dedication',
  mantraDefs: 'mantraDef', mantraSessions: 'mantraSession',
  readingSessions: 'sutraReading',
  fearEntries: 'fearEntry', courageEntries: 'courageEntry', achievements: 'fearAchievement',
  breathHistory: 'breath', sessions: 'zhiguanSession',
};

export interface SyncMergeResult {
  storePatch: Partial<MobileStore>;
  changedEntities: string[];
}

type SyncableItem = { id?: string; date?: string; deleted?: boolean; updatedAt?: number; [k: string]: unknown };
type SyncPatch = Record<string, SyncableItem[] | unknown>;

const isStoreKey = (k: string) => !!STORE_KEY_TO_ENTITY[k];

/**
 * Pure function: merges a sync delta patch into the current store state.
 *
 * - Delta records are merged by `id` (or `date` fallback) into existing arrays.
 * - `thoughtTrailIds` on reflections are reconciled from thoughtTrail data.
 * - Non-array store keys (totalMedMinutes, aiMode, aiModels) are passed through.
 *
 * @param state  Current MobileStore snapshot
 * @param patch  Sync delta patch from the server
 * @returns      The store patch to apply and the list of changed entity names
 */
export function mergeSyncPatch(
  state: MobileStore,
  patch: SyncPatch,
): SyncMergeResult {
  // Compute changed entity names from the patch keys
  const changedEntities = Object.keys(patch)
    .map(k => STORE_KEY_TO_ENTITY[k] ?? (k === 'aiMode' || k === 'aiModels' ? 'aiConfig' : null))
    .filter(Boolean) as string[];

  const storePatch: Record<string, unknown> = {};
  let reflectionsChanged = false;

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'totalMedMinutes') {
      storePatch.totalMedMinutes = value as number;
    } else if (key === 'aiMode') {
      storePatch.aiMode = value as AIMode;
    } else if (key === 'aiModels') {
      storePatch.aiModels = value as ModelConfig[];
    } else if (isStoreKey(key) && Array.isArray(value)) {
      const existing = (state as unknown as Record<string, unknown[]>)[key];
      // Filter out entries without a valid key (id or date) to prevent ghost entries
      let validDelta = (value as SyncableItem[]).filter(item => !!(item?.id ?? item?.date));
      // For foodLog, also filter out entries with empty/missing name (server ghost data)
      if (key === 'foodLog') {
        validDelta = validDelta.filter(item => !!(item as Record<string, unknown>)?.name);
      }
      if (Array.isArray(existing) && existing.length > 0) {
        // Merge delta items into existing array by id/date
        const map = new Map(
          existing.map((item) => {
            const r = item as Record<string, unknown>;
            return [r.id ?? r.date, r];
          }),
        );
        for (const item of validDelta) {
          const rec = item as Record<string, unknown>;
          const k = rec?.id ?? rec?.date;
          if (k) map.set(k, item);
        }
        const merged = [...map.values()];
        storePatch[key] = merged;
      } else {
        // No existing items — use delta directly (only valid entries)
        storePatch[key] = validDelta;
      }
      if (key === 'reflections') reflectionsChanged = true;
    }
  }

  // Atomic thoughtTrailIds reconciliation
  const needsTrailReconciliation =
    changedEntities.includes('thoughtTrail') || changedEntities.includes('reflection');

  if (needsTrailReconciliation) {
    const trails = (state.thoughtTrails ?? []) as unknown as Record<string, unknown>[];
    const trailMap = new Map<string, string[]>();
    for (const trail of trails) {
      if (trail.deleted) continue;
      for (const rid of ((trail.reflectionIds ?? []) as string[])) {
        const arr = trailMap.get(rid) ?? []; // Creates new empty array on first get — no shared reference issue
        arr.push(trail.id as string);
        trailMap.set(rid, arr);
      }
    }
    const reflections = ((storePatch.reflections ?? state.reflections ?? []) as unknown as Record<string, unknown>[]);
    const updated = reflections.map((r: Record<string, unknown>) => {
      const ids = trailMap.get(r.id as string) ?? []; // Creates new array each call — no shared reference
      const current = (r.thoughtTrailIds ?? []) as string[];
      const sortedNew = [...ids].sort();
      const sortedCurrent = [...current].sort();
      if (
        sortedNew.length === sortedCurrent.length &&
        sortedNew.every((id, i) => id === sortedCurrent[i])
      )
        return r;
      return { ...r, thoughtTrailIds: ids };
    });
    if (updated.some((r: Record<string, unknown>, i: number) => r !== reflections[i])) {
      storePatch.reflections = updated;
      reflectionsChanged = true;
    }
  }

  // Only include reflections in the patch if something actually changed
  if (!reflectionsChanged) delete storePatch.reflections;

  return {
    storePatch: storePatch as Partial<MobileStore>,
    changedEntities,
  };
}
