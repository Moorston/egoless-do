// ─── Sync entity configuration (shared across platforms) ────────
// ENTITY_COLLECTION and ENTITY_ID_FIELD are now derived from SCHEMAS in entitySchemas.ts.

import { SCHEMA_COLLECTION, SCHEMA_ID_FIELD } from './entitySchemas';

export const SYNC_ENTITIES = [
  'habit', 'reflection', 'fasting', 'food', 'checkin', 'meditation', 'profile', 'exercise',
  'plan', 'planItem', 'planItemCheckin', 'dailyCustomTodo', 'dailyTodoHistory', 'grace',
  'thoughtTrail', 'trailNote', 'reflectionLink', 'aiConfig', 'checkinReview',
] as const;

export type SyncEntity = typeof SYNC_ENTITIES[number];

/** PocketBase collection names — derived from SCHEMAS */
export const ENTITY_COLLECTION: Record<SyncEntity, string> = SCHEMA_COLLECTION;

/** PocketBase server ID fields — derived from SCHEMAS */
export const ENTITY_ID_FIELD: Record<SyncEntity, string> = SCHEMA_ID_FIELD;
