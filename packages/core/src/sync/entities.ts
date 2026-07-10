// ─── Sync entity configuration (shared across platforms) ────────
// ENTITY_COLLECTION and ENTITY_ID_FIELD are now derived from SCHEMAS in entitySchemas.ts.

import { SCHEMA_COLLECTION, SCHEMA_ID_FIELD, SCHEMAS } from './entitySchemas';

export const SYNC_ENTITIES = [
  'habit', 'reflection', 'fasting', 'food', 'checkin', 'meditation', 'profile', 'exercise',
  'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'grace',
  'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview',
  'bodyGoal', 'bodyPlan', 'weightRecord', 'bodyCheckin', 'sleep', 'give',
  'motivationEntry', 'customWuxing',
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

/** Derive ENTITY_STORE_KEY from SCHEMAS */
export const ENTITY_STORE_KEY: Record<string, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [
    k,
    SCHEMAS[k].storeKey ?? `${k}s`
  ])
);
