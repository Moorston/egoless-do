// ─── PocketBase migration: create global_checkins + global_stats ───
migrate(function(db) {
  // Create global_checkins collection (idempotent)
  try {
    db.findCollectionByNameOrId("global_checkins");
  } catch (e) {
    var checkinsCollection = new Collection({
      name: "global_checkins",
      type: "base",
      system: false,
      fields: [
        { name: "checkin_id", type: "text", required: true, unique: true, options: { min: 1, max: 36 } },
        { name: "user_hash", type: "text", required: true, unique: false, options: { min: 8, max: 64 } },
        { name: "lat", type: "number", required: true, unique: false, options: { min: -90, max: 90 } },
        { name: "lng", type: "number", required: true, unique: false, options: { min: -180, max: 180 } },
        { name: "type", type: "select", required: true, unique: false, options: { maxSelect: 1, values: ["exercise", "fasting", "meditation"] } },
        { name: "streak", type: "number", required: true, unique: false, options: { min: 0, max: 99999 } },
        { name: "total_days", type: "number", required: true, unique: false, options: { min: 0, max: 99999 } },
        { name: "nickname", type: "text", required: false, unique: false, options: { min: 0, max: 20, pattern: "" } },
        { name: "city", type: "text", required: false, unique: false, options: { min: 0, max: 50, pattern: "" } },
        { name: "created_at", type: "date", required: true, unique: false },
        { name: "opted_out", type: "bool", required: false, unique: false }
      ],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_hash = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_hash = @request.auth.id"
    });
    db.save(checkinsCollection);
    // Add indexes after table exists
    var cc = db.findCollectionByNameOrId("global_checkins");
    cc.indexes = [
      "CREATE INDEX idx_global_checkins_user_hash ON global_checkins (user_hash)",
      "CREATE INDEX idx_global_checkins_created_at ON global_checkins (created_at)",
      "CREATE INDEX idx_global_checkins_type ON global_checkins (type)",
      "CREATE INDEX idx_global_checkins_lat_lng ON global_checkins (lat, lng)"
    ];
    db.save(cc);
  }

  // Create global_stats collection (idempotent)
  try {
    db.findCollectionByNameOrId("global_stats");
  } catch (e) {
    var statsCollection = new Collection({
      name: "global_stats",
      type: "base",
      system: false,
      fields: [
        { name: "total_users", type: "number", required: true, unique: false, options: { min: 0 } },
        { name: "active_today", type: "number", required: true, unique: false, options: { min: 0 } },
        { name: "top_streak", type: "number", required: true, unique: false, options: { min: 0 } },
        { name: "countries", type: "number", required: true, unique: false, options: { min: 0 } },
        { name: "updated_at", type: "date", required: true, unique: false }
      ],
      indexes: [],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null
    });
    db.save(statsCollection);

    // Initialize stats record
    var statsRecord = new Record(statsCollection, {
      total_users: 0,
      active_today: 0,
      top_streak: 0,
      countries: 0,
      updated_at: new Date().toISOString()
    });
    db.saveNoValidate(statsRecord);
  }
}, function(db) {
  try { db.deleteCollection(db.findCollectionByNameOrId("global_checkins")); } catch (e) {}
  try { db.deleteCollection(db.findCollectionByNameOrId("global_stats")); } catch (e) {}
});
