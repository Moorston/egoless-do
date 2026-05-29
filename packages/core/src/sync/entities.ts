// ─── Sync entity configuration (shared across platforms) ────────

export const SYNC_ENTITIES = [
  'habit', 'reflection', 'fasting', 'food', 'checkin', 'meditation', 'profile', 'exercise',
  'plan', 'planItem', 'planItemCheckin',
] as const;

export type SyncEntity = typeof SYNC_ENTITIES[number];

export const ENTITY_COLLECTION: Record<SyncEntity, string> = {
  habit:      'habits',
  reflection: 'reflections',
  fasting:    'fasting_sessions',
  food:       'food_entries',
  checkin:    'checkin_records',
  meditation: 'meditation_history',
  profile:    'user_profiles',
  exercise:   'exercise_entries',
  plan:            'plans',
  planItem:        'plan_items',
  planItemCheckin: 'plan_item_checkins',
};

export const ENTITY_ID_FIELD: Record<SyncEntity, string> = {
  habit:      'habit_id',
  reflection: 'reflection_id',
  fasting:    'session_id',
  food:       'food_id',
  checkin:    'date',
  meditation: 'date',
  profile:    'profile_id',
  exercise:   'exercise_id',
  plan:            'plan_id',
  planItem:        'plan_item_id',
  planItemCheckin: 'checkin_id',
};
