/// <reference path="../pb_data/types.d.ts" />

// Fix: Sync collections created by early migrations (012 and before) are missing
// the 'created' autodate field. Five backend endpoints use "-created" sort for
// pull operations, which fails with "invalid sort field 'created'" on these collections.
// This migration adds the missing autodate 'created' field.

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
      var hasCreated = false;

      for (var fi = 0; fi < fieldNames.length; fi++) {
        if (fieldNames[fi] === 'created') { hasCreated = true; break; }
      }

      if (!hasCreated) {
        collection.fields.add(new Field({
          "hidden": false,
          "id": "autodate_cr_" + name,
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate",
        }));
        console.log('[migration] Added created autodate field to ' + name);
        txApp.save(collection);
      }
    } catch (err) {
      console.log('[migration] Skip ' + name + ': ' + (err.message || String(err)));
    }
  }

}, function(txApp) {
  // Rollback: remove any created autodate fields from sync collections
  var SYNC_COLLECTIONS = [
    'habits', 'reflections', 'fasting_sessions', 'food_entries',
    'checkin_records', 'meditation_history', 'user_profiles',
    'exercise_entries', 'plans', 'plan_items', 'plan_item_checkins',
    'daily_custom_todos', 'daily_todo_history', 'grace_history',
    'thought_trails', 'trail_notes', 'reflection_links',
    'ai_configs', 'checkin_reviews',
  ];

  for (var ri = 0; ri < SYNC_COLLECTIONS.length; ri++) {
    var name = SYNC_COLLECTIONS[ri];
    try {
      var collection = txApp.findCollectionByNameOrId(name);
      if (!collection) continue;

      var fields = collection.fields;
      var toRemove = null;
      for (var fi = 0; fi < fields.length; fi++) {
        if (fields[fi] && fields[fi].name === 'created' && fields[fi].type === 'autodate') {
          toRemove = fields[fi];
          break;
        }
      }
      if (toRemove) {
        collection.fields.remove(toRemove);
        txApp.save(collection);
        console.log('[migration] Removed created field from ' + name);
      }
    } catch (err) {
      console.log('[migration] Rollback skip ' + name + ': ' + (err.message || String(err)));
    }
  }
});
