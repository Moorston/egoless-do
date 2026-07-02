/// <reference path="../pb_data/types.d.ts" />

// Fix: add missing ID fields to sync collections.

migrate(function(txApp) {
  var FIXES = [
    { coll: 'ai_configs',           field: 'config_id' },
    { coll: 'checkin_reviews',      field: 'review_id' },
    { coll: 'reflection_links',     field: 'link_id' },
    { coll: 'meditation_history',   field: 'date' },
    { coll: 'grace_history',        field: 'date' },
    { coll: 'user_profiles',        field: 'profile_id' },
    { coll: 'trail_notes',          field: 'note_id' },
    { coll: 'thought_trails',       field: 'trail_id' },
    { coll: 'daily_todo_history',   field: 'history_id' },
    { coll: 'daily_custom_todos',   field: 'todo_id' },
    { coll: 'plan_item_checkins',   field: 'checkin_id' },
    { coll: 'plan_items',           field: 'plan_item_id' },
    { coll: 'plans',                field: 'plan_id' },
    { coll: 'exercise_entries',     field: 'exercise_id' },
  ];

  for (var fi = 0; fi < FIXES.length; fi++) {
    var fix = FIXES[fi];
    try {
      var c = txApp.findCollectionByNameOrId(fix.coll);
      if (!c) continue;

      // Check if field already exists
      var existing = c.fields || [];
      var found = false;
      for (var i = 0; i < existing.length; i++) {
        if (existing[i] && existing[i].name === fix.field) { found = true; break; }
      }
      if (found) continue;

      // Add missing text field using SchemaField
      c.fields.add(new Field({
        "autogeneratePattern": "", "hidden": false,
        "id": "text_fix_" + fix.field, "max": 0, "min": 0,
        "name": fix.field, "pattern": "", "presentable": false,
        "primaryKey": false, "required": true, "system": false, "type": "text",
      }));
      txApp.save(c);
      console.log("[migration] Added field " + fix.field + " to " + fix.coll);
    } catch (err) {
      console.error("[migration] Failed to add " + fix.field + " to " + fix.coll + ": " + (err.message || String(err)));
    }
  }
}, function(txApp) {
  // rollback: no-op
});
