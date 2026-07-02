// ─── PocketBase migration: add push_tokens collection ───────────
migrate(function(db) {
  try {
    db.findCollectionByNameOrId("push_tokens");
    return; // already exists
  } catch (e) {}

  var collection = new Collection({
    id: "push_tokens_001",
    name: "push_tokens",
    type: "base",
    fields: [
      { name: "user_id", type: "text", required: true, options: { min: 1, max: 128 } },
      { name: "platform", type: "text", required: true, options: { min: 1, max: 16 } },
      { name: "token", type: "text", required: true, options: { min: 1, max: 512 } },
    ],
    listRule: "@request.auth.id = user_id",
    viewRule: "@request.auth.id = user_id",
    createRule: "@request.auth.id = user_id",
    updateRule: "@request.auth.id = user_id",
    deleteRule: "@request.auth.id = user_id",
  });
  db.save(collection);

  // Add indexes after table exists
  var c = db.findCollectionByNameOrId("push_tokens");
  c.indexes = [
    "CREATE INDEX idx_push_tokens_user ON push_tokens (user_id)",
    "CREATE UNIQUE INDEX idx_push_tokens_token ON push_tokens (token)",
  ];
  db.save(c);
}, function(db) {
  try {
    var collection = db.findCollectionByNameOrId("push_tokens");
    if (collection) db.deleteCollection(collection);
  } catch (e) {}
});
