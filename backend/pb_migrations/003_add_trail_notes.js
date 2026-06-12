// ─── PocketBase migration: add trail_notes collection ──────────
migrate((db) => {
  // up
  const collection = new Collection({
    id: "trail_notes",
    name: "trail_notes",
    type: "base",
    fields: [
      { "name": "trail_id",        "type": "text",   "required": true },
      { "name": "content",         "type": "text",   "required": true },
      { "name": "tags",            "type": "json",   "required": false, "maxSize": 1000 },
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

  db.saveCollection(collection);

  // Add new fields to thought_trails collection
  const thoughtTrails = db.findCollectionByNameOrId("thought_trails");
  if (thoughtTrails) {
    thoughtTrails.fields.push(
      { "name": "note_ids",      "type": "json", "required": false, "maxSize": 5000000 },
      { "name": "insight_cache", "type": "json", "required": false, "maxSize": 5000000 },
      { "name": "review_cache",  "type": "json", "required": false, "maxSize": 5000000 }
    );
    db.saveCollection(thoughtTrails);
  }

  // Add trail_id field to plan_items collection
  const planItems = db.findCollectionByNameOrId("plan_items");
  if (planItems) {
    planItems.fields.push(
      { "name": "trail_id", "type": "text", "required": false }
    );
    db.saveCollection(planItems);
  }
}, (db) => {
  // down
  const collection = db.findCollectionByNameOrId("trail_notes");
  if (collection) {
    db.deleteCollection(collection);
  }

  // Remove added fields (PocketBase handles field removal on collection update)
  const thoughtTrails = db.findCollectionByNameOrId("thought_trails");
  if (thoughtTrails) {
    thoughtTrails.fields = thoughtTrails.fields.filter(
      (f) => !['note_ids', 'insight_cache', 'review_cache'].includes(f.name)
    );
    db.saveCollection(thoughtTrails);
  }

  const planItems = db.findCollectionByNameOrId("plan_items");
  if (planItems) {
    planItems.fields = planItems.fields.filter((f) => f.name !== 'trail_id');
    db.saveCollection(planItems);
  }
});
