/// <reference path="../pb_data/types.d.ts" />

// Fix: Early migrations (002-012) created sync collections without 'deleted' and 'updated_at' fields.
// Migration 1782500000 skips existing collections, so these fields were never added.
// This migration adds the missing fields to all existing sync collections.

migrate((txApp) => {
  const SYNC_COLLECTIONS = [
    'habits', 'reflections', 'fasting_sessions', 'food_entries',
    'checkin_records', 'meditation_history', 'user_profiles',
    'exercise_entries', 'plans', 'plan_items', 'plan_item_checkins',
    'daily_custom_todos', 'daily_todo_history', 'grace_history',
    'thought_trails', 'trail_notes', 'reflection_links',
    'ai_configs', 'checkin_reviews',
  ];

  for (const name of SYNC_COLLECTIONS) {
    try {
      const collection = txApp.findCollectionByNameOrId(name);
      if (!collection) continue;

      const fields = collection.fields;
      const fieldNames = fields.map(f => f.name);
      let modified = false;

      // Add 'deleted' bool field if missing
      if (!fieldNames.includes('deleted')) {
        fields.push({
          "help": "",
          "hidden": false,
          "id": "bool_fix_del_" + name,
          "name": "deleted",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "bool",
        });
        console.log('[migration] Added deleted field to ' + name);
        modified = true;
      }

      // Add 'updated_at' date field if missing
      if (!fieldNames.includes('updated_at')) {
        fields.push({
          "autogeneratePattern": "",
          "help": "",
          "hidden": false,
          "id": "date_fix_uat_" + name,
          "max": "",
          "min": "",
          "name": "updated_at",
          "presentable": false,
          "required": false,
          "system": false,
          "type": "date",
        });
        console.log('[migration] Added updated_at field to ' + name);
        modified = true;
      }

      if (modified) {
        collection.fields = fields;
        txApp.save(collection);
      }
    } catch (err) {
      console.log('[migration] Skip ' + name + ': ' + (err.message || String(err)));
    }
  }
}, (txApp) => {
  // Rollback: removing fields from PocketBase collections is not easily reversible
});
