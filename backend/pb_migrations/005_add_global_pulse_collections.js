// ─── PocketBase migration: create global_checkins + global_stats ───
migrate((db) => {
  const dao = new Dao(db);

  // Create global_checkins collection
  const checkinsCollection = new Collection({
    name: "global_checkins",
    type: "base",
    system: false,
    schema: [
      {
        name: "checkin_id",
        type: "text",
        required: true,
        unique: true,
        options: { min: 1, max: 36 }
      },
      {
        name: "user_hash",
        type: "text",
        required: true,
        unique: false,
        options: { min: 8, max: 64 }
      },
      {
        name: "lat",
        type: "number",
        required: true,
        unique: false,
        options: { min: -90, max: 90 }
      },
      {
        name: "lng",
        type: "number",
        required: true,
        unique: false,
        options: { min: -180, max: 180 }
      },
      {
        name: "type",
        type: "select",
        required: true,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["exercise", "fasting", "meditation"]
        }
      },
      {
        name: "streak",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0, max: 99999 }
      },
      {
        name: "total_days",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0, max: 99999 }
      },
      {
        name: "nickname",
        type: "text",
        required: false,
        unique: false,
        options: { min: 0, max: 20, pattern: "" }
      },
      {
        name: "city",
        type: "text",
        required: false,
        unique: false,
        options: { min: 0, max: 50, pattern: "" }
      },
      {
        name: "created_at",
        type: "date",
        required: true,
        unique: false
      },
      {
        name: "opted_out",
        type: "bool",
        required: false,
        unique: false
      }
    ],
    indexes: [
      "CREATE INDEX idx_global_checkins_user_hash ON global_checkins (user_hash)",
      "CREATE INDEX idx_global_checkins_created_at ON global_checkins (created_at)",
      "CREATE INDEX idx_global_checkins_type ON global_checkins (type)",
      "CREATE INDEX idx_global_checkins_lat_lng ON global_checkins (lat, lng)"
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && user_hash = @request.auth.id",
    deleteRule: "@request.auth.id != '' && user_hash = @request.auth.id"
  });

  dao.saveCollection(checkinsCollection);

  // Create global_stats collection
  const statsCollection = new Collection({
    name: "global_stats",
    type: "base",
    system: false,
    schema: [
      {
        name: "total_users",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0 }
      },
      {
        name: "active_today",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0 }
      },
      {
        name: "top_streak",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0 }
      },
      {
        name: "countries",
        type: "number",
        required: true,
        unique: false,
        options: { min: 0 }
      },
      {
        name: "updated_at",
        type: "date",
        required: true,
        unique: false
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: null
  });

  dao.saveCollection(statsCollection);

  // Initialize stats record
  const statsRecord = new Record(statsCollection, {
    total_users: 0,
    active_today: 0,
    top_streak: 0,
    countries: 0,
    updated_at: new Date().toISOString()
  });
  dao.saveRecord(statsRecord);
}, (db) => {
  const dao = new Dao(db);
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId("global_checkins"));
  } catch (e) {}
  try {
    dao.deleteCollection(dao.findCollectionByNameOrId("global_stats"));
  } catch (e) {}
});
