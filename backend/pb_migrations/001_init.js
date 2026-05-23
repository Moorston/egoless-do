// ─── PocketBase migration: initial collections ────────────────────
migrate((db) => {
  // up
  const schema = require("../pb_schema.json");
  schema._collections.forEach(col => {
    db.saveCollection(new Collection(col));
  });
}, (db) => {
  // down
  ["checkins", "map_pins", "published_minds"].forEach(name => {
    const col = db.findCollectionByNameOrId(name);
    if (col) db.deleteCollection(col);
  });
});
