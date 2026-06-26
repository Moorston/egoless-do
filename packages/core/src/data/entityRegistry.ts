// ─── Entity Registry ──────────────────────────────────────────────
// Central registry of all syncable entities with their metadata.

import type { SyncEntity } from '../sync/entities';

export interface EntityMeta {
  /** PocketBase collection name */
  collection: string;
  /** Primary key field in local SQLite */
  localPk: string;
  /** Primary key field in PocketBase */
  remotePk: string;
  /** Whether this entity supports soft delete */
  softDelete: boolean;
}

export const ENTITY_REGISTRY: Record<SyncEntity, EntityMeta> = {
  habit:            { collection: 'habits',             localPk: 'id',         remotePk: 'id',       softDelete: true },
  reflection:       { collection: 'reflections',        localPk: 'id',         remotePk: 'id',       softDelete: true },
  fasting:          { collection: 'fasting_sessions',   localPk: 'id',         remotePk: 'id',       softDelete: true },
  food:             { collection: 'food_entries',       localPk: 'id',         remotePk: 'id',       softDelete: true },
  checkin:          { collection: 'checkin_records',    localPk: 'date',       remotePk: 'date',     softDelete: true },
  meditation:       { collection: 'meditation_history', localPk: 'date',       remotePk: 'date',     softDelete: true },
  profile:          { collection: 'user_profiles',      localPk: 'profile_id', remotePk: 'profile_id', softDelete: true },
  exercise:         { collection: 'exercise_entries',   localPk: 'id',         remotePk: 'id',       softDelete: true },
  plan:             { collection: 'plans',              localPk: 'id',         remotePk: 'id',       softDelete: true },
  planItem:         { collection: 'plan_items',         localPk: 'id',         remotePk: 'id',       softDelete: true },
  planItemCheckin:  { collection: 'plan_item_checkins', localPk: 'id',         remotePk: 'id',       softDelete: true },
  dailyCustomTodo:  { collection: 'daily_custom_todos', localPk: 'id',         remotePk: 'id',       softDelete: true },
  dailyTodoHistory: { collection: 'daily_todo_history', localPk: 'id',         remotePk: 'id',       softDelete: true },
  grace:            { collection: 'grace_history',      localPk: 'date',       remotePk: 'date',     softDelete: true },
  thoughtTrail:     { collection: 'thought_trails',     localPk: 'id',         remotePk: 'id',       softDelete: true },
  trailNote:        { collection: 'trail_notes',        localPk: 'id',         remotePk: 'id',       softDelete: true },
  reflectionLink:   { collection: 'reflection_links',   localPk: 'link_id',    remotePk: 'link_id',  softDelete: true },
  aiConfig:         { collection: 'ai_configs',         localPk: 'config_id',  remotePk: 'config_id', softDelete: true },
  checkinReview:    { collection: 'checkin_reviews',    localPk: 'id',         remotePk: 'id',       softDelete: true },
};

/** Get entity meta by sync entity name. Throws if unknown. */
export function getEntityMeta(entity: SyncEntity): EntityMeta {
  const meta = ENTITY_REGISTRY[entity];
  if (!meta) throw new Error(`Unknown entity: ${entity}`);
  return meta;
}
