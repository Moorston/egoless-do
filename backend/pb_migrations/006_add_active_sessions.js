// ─── PocketBase migration: create active_sessions ──────────────────
migrate((db) => {
  const dao = new Dao(db);
  const collection = new Collection({
    name: "active_sessions",
    type: "base",
    system: false,
    schema: [
      {
        name: "session_id",
        type: "text",
        required: true,
        presentable: false,
        unique: true,
        options: { min: 1, max: 36, pattern: "" }
      },
      {
        name: "user_hash",
        type: "text",
        required: true,
        presentable: false,
        unique: false,
        options: { min: 8, max: 64, pattern: "" }
      },
      {
        name: "nickname",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: 20, pattern: "" }
      },
      {
        name: "type",
        type: "select",
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["exercise", "meditation", "fasting"]
        }
      },
      {
        name: "started_at",
        type: "date",
        required: true,
        presentable: false,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        name: "last_heartbeat",
        type: "date",
        required: true,
        presentable: false,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        name: "goal",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: 100, pattern: "" }
      },
      {
        name: "insight",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: 200, pattern: "" }
      },
      {
        name: "sport_key",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: 50, pattern: "" }
      },
      {
        name: "sport_icon",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: 10, pattern: "" }
      },
      {
        name: "lat",
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: { min: -90, max: 90, noDecimal: false }
      },
      {
        name: "lng",
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: { min: -180, max: 180, noDecimal: false }
      }
    ],
    indexes: [
      "CREATE INDEX idx_active_sessions_user_hash ON active_sessions (user_hash)",
      "CREATE INDEX idx_active_sessions_last_heartbeat ON active_sessions (last_heartbeat)",
      "CREATE INDEX idx_active_sessions_type ON active_sessions (type)"
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    options: {}
  });

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("active_sessions");
  return dao.deleteCollection(collection);
});
