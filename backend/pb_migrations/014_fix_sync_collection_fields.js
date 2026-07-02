/// <reference path="../pb_data/types.d.ts" />

// Fix: add missing ID fields to sync collections that may have been
// created with old PocketBase API and are missing custom fields.

migrate((txApp) => {
  const FIXES = [
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

  for (const { coll, field } of FIXES) {
    try {
      const c = txApp.findCollectionByNameOrId(coll);
      if (!c) continue;

      // Check if field already exists
      const existing = c.fields || [];
      let found = false;
      for (let i = 0; i < existing.length; i++) {
        if (existing[i] && existing[i].name === field) { found = true; break; }
      }
      if (found) continue;

      // Add missing text field using raw field schema
      const newField = {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_fix_" + field,
        "max": 0,
        "min": 0,
        "name": field,
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
      };
      c.fields.push(newField);
      txApp.save(c);
      console.log("[migration] Added field " + field + " to " + coll);
    } catch (err) {
      console.error("[migration] Failed to add " + field + " to " + coll + ": " + (err.message || String(err)));
    }
  }
}, (txApp) => {
  // rollback: no-op
});
