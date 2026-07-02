// ─── PocketBase migration: add checkin_reviews collection ────────
migrate((db) => {
  // up
  const collection = new Collection({
    id: "checkin_reviews",
    name: "checkin_reviews",
    type: "base",
    fields: [
      { "name": "user_id",      "type": "text",   "required": true },
      { "name": "review_id",    "type": "text",   "required": true },
      { "name": "period",       "type": "text",   "required": true },
      { "name": "start_date",   "type": "text",   "required": true },
      { "name": "end_date",     "type": "text",   "required": true },
      { "name": "review_data",  "type": "json",   "required": false, "maxSize": 5000000 },
      { "name": "updated_at",   "type": "number", "required": true },
      { "name": "deleted",      "type": "bool",   "required": false }
    ],
    listRule:   "@request.auth.id = user_id",
    viewRule:   "@request.auth.id = user_id",
    createRule: "@request.auth.id = user_id",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id"
  });
  
  db.save(collection);
}, (db) => {
  // down
  const collection = db.findCollectionByNameOrId("checkin_reviews");
  if (collection) {
    db.deleteCollection(collection);
  }
});
