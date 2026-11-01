// ─── Sync entity configuration (shared across platforms) ────────
// ENTITY_COLLECTION and ENTITY_ID_FIELD are now derived from SCHEMAS in entitySchemas.ts.

import { SCHEMA_COLLECTION, SCHEMA_ID_FIELD, SCHEMAS } from './entitySchemas';

export const SYNC_ENTITIES = [
  'habit', 'reflection', 'fasting', 'food', 'checkin', 'meditation', 'profile', 'exercise',
  'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'grace',
  'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview',
  'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep', 'give',
  'bodyTrainingPlan',
  'motivationEntry', 'customWuxing', 'foodPreset',
  'vision', 'visionPractice', 'dedication',
  'mantraDef', 'mantraSession',
  'sutraReading',
  'fearEntry', 'courageEntry', 'fearAchievement',
  'zhiguanSession', 'breath',
] as const;

export type SyncEntity = typeof SYNC_ENTITIES[number];

/** PocketBase collection names — derived from SCHEMAS */
export const ENTITY_COLLECTION: Record<SyncEntity, string> = SCHEMA_COLLECTION;

/** PocketBase server ID fields — derived from SCHEMAS */
export const ENTITY_ID_FIELD: Record<SyncEntity, string> = SCHEMA_ID_FIELD;

/**
 * Derive ENTITY_STORE_KEY from SCHEMAS — the single source of truth.
 * Entities marked `noStore: true` (e.g. aiConfig) have no store slice and are excluded.
 * Every other entity MUST declare an explicit `storeKey`; the `${entity}s` fallback
 * is a safety net only and is flagged by `validateEntityMappings` as a missing mapping.
 */
export const ENTITY_STORE_KEY: Record<string, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[])
    .filter(k => !SCHEMAS[k].noStore)
    .map(k => [k, SCHEMAS[k].storeKey ?? `${k}s`])
);

/**
 * Pure validation: scans SCHEMAS and returns the list of entities that lack a
 * required `storeKey`. Entities with `noStore: true` are exempt. Runs in the
 * standard test pipeline (not `__DEV__`-gated) to catch missing mappings early.
 *
 * @returns array of entity names missing a `storeKey` (empty = all good)
 */
export function validateEntityMappings(): string[] {
  const missing: string[] = [];
  for (const k of Object.keys(SCHEMAS) as SyncEntity[]) {
    const schema = SCHEMAS[k];
    if (schema.noStore) continue;
    if (!schema.storeKey || schema.storeKey.length === 0) {
      missing.push(k);
    }
  }
  return missing;
}
