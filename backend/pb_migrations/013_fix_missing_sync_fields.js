/// <reference path="../pb_data/types.d.ts" />

// Fix: Early migrations created sync collections without 'deleted' and 'updated_at' fields.
// This migration adds the missing fields to all existing sync collections.

migrate(function(txApp) {
  var SYNC_COLLECTIONS = [
    'habits', 'reflections', 'fasting_sessions', 'food_entries',
    'checkin_records', 'meditation_history', 'user_profiles',
    'exercise_entries', 'plans', 'plan_items', 'plan_item_checkins',
    'daily_custom_todos', 'daily_todo_history', 'grace_history',
    'thought_trails', 'trail_notes', 'reflection_links',
    'ai_configs', 'checkin_reviews',
  ];

  for (var ci = 0; ci < SYNC_COLLECTIONS.length; ci++) {
    var name = SYNC_COLLECTIONS[ci];
    try {
      var collection = txApp.findCollectionByNameOrId(name);
      if (!collection) continue;

      var fieldNames = collection.fields.map(function(f) { return f.name; });
      var modified = false;

      // Add 'deleted' bool field if missing
      if (fieldNames.indexOf('deleted') === -1) {
        collection.fields.add(new Field({
          "help": "", "hidden": false, "id": "bool_fix_del_" + name,
          "name": "deleted", "presentable": false, "required": false,
          "system": false, "type": "bool",
        }));
        console.log('[migration] Added deleted field to ' + name);
        modified = true;
      }

      // Add 'updated_at' date field if missing
      if (fieldNames.indexOf('updated_at') === -1) {
        collection.fields.add(new Field({
          "autogeneratePattern": "", "help": "", "hidden": false,
          "id": "date_fix_uat_" + name, "max": "", "min": "",
          "name": "updated_at", "presentable": false, "required": false,
          "system": false, "type": "date",
        }));
        console.log('[migration] Added updated_at field to ' + name);
        modified = true;
      }

      if (modified) {
        txApp.save(collection);
      }
    } catch (err) {
      console.log('[migration] Skip ' + name + ': ' + (err.message || String(err)));
    }
  }
}, function(txApp) {
  // Rollback: removing fields from PocketBase collections is not easily reversible
});
