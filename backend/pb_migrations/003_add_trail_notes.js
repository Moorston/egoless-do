// ─── PocketBase migration: add trail_notes collection ──────────
migrate(function(db) {
  // up
  // Only create trail_notes if it doesn't already exist
  try {
    db.findCollectionByNameOrId("trail_notes");
  } catch (e) {
    var collection = new Collection({
      id: "trail_notes",
      name: "trail_notes",
      type: "base",
      fields: [
        { "name": "trail_id",        "type": "text",   "required": true },
        { "name": "content",         "type": "text",   "required": true },
        { "name": "tags",            "type": "json",   "required": false, "options": { "maxSize": 1000 } },
        { "name": "mood",            "type": "text",   "required": false },
        { "name": "source",          "type": "text",   "required": true },
        { "name": "guided_question", "type": "text",   "required": false },
        { "name": "note_order",      "type": "number", "required": false },
        { "name": "created_at",      "type": "number", "required": true },
        { "name": "updated_at",      "type": "number", "required": true },
        { "name": "deleted",         "type": "bool",   "required": false }
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''"
    });
    db.save(collection);
  }

  // Add new fields to thought_trails collection (idempotent)
  try {
    var thoughtTrails = db.findCollectionByNameOrId("thought_trails");
    if (thoughtTrails) {
      thoughtTrails.fields.add(new Field({ "name": "note_ids",      "type": "json", "required": false, "options": { "maxSize": 5000000 } }));
      thoughtTrails.fields.add(new Field({ "name": "insight_cache", "type": "json", "required": false, "options": { "maxSize": 5000000 } }));
      thoughtTrails.fields.add(new Field({ "name": "review_cache",  "type": "json", "required": false, "options": { "maxSize": 5000000 } }));
      db.save(thoughtTrails);
    }
  } catch (e) {
    // Fields may already exist
  }

  // Add trail_id field to plan_items collection (idempotent)
  try {
    var planItems = db.findCollectionByNameOrId("plan_items");
    if (planItems) {
      planItems.fields.add(new Field({ "name": "trail_id", "type": "text", "required": false }));
      db.save(planItems);
    }
  } catch (e) {
    // Field may already exist
  }
}, function(db) {
  // down
  var collection = db.findCollectionByNameOrId("trail_notes");
  if (collection) {
    db.deleteCollection(collection);
  }

  // Remove added fields
  try {
    var thoughtTrails = db.findCollectionByNameOrId("thought_trails");
    if (thoughtTrails) {
      thoughtTrails.fields.removeByName("note_ids_field");
      thoughtTrails.fields.removeByName("insight_cache_field");
      thoughtTrails.fields.removeByName("review_cache_field");
      db.save(thoughtTrails);
    }
  } catch (e) {}

  try {
    var planItems = db.findCollectionByNameOrId("plan_items");
    if (planItems) {
      planItems.fields.removeByName("trail_id_field");
      db.save(planItems);
    }
  } catch (e) {}
});
