/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "active_sessions_001",
    "created": "2026-06-25T12:00:00Z",
    "updated": "2026-06-25T12:00:00Z",
    "name": "active_sessions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "sess_id",
        "name": "session_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": { "min": 1, "max": 36, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_user_hash",
        "name": "user_hash",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": { "min": 8, "max": 64, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_nickname",
        "name": "nickname",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 20, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_type",
        "name": "type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["exercise", "meditation", "fasting"]
        }
      },
      {
        "system": false,
        "id": "sess_started_at",
        "name": "started_at",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": { "min": "", "max": "" }
      },
      {
        "system": false,
        "id": "sess_last_heartbeat",
        "name": "last_heartbeat",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": { "min": "", "max": "" }
      },
      {
        "system": false,
        "id": "sess_goal",
        "name": "goal",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 100, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_insight",
        "name": "insight",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 200, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_sport_key",
        "name": "sport_key",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 50, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_sport_icon",
        "name": "sport_icon",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 10, "pattern": "" }
      },
      {
        "system": false,
        "id": "sess_lat",
        "name": "lat",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": -90, "max": 90, "noDecimal": false }
      },
      {
        "system": false,
        "id": "sess_lng",
        "name": "lng",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": -180, "max": 180, "noDecimal": false }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_active_sessions_user_hash` ON `active_sessions` (`user_hash`)",
      "CREATE INDEX `idx_active_sessions_last_heartbeat` ON `active_sessions` (`last_heartbeat`)",
      "CREATE INDEX `idx_active_sessions_type` ON `active_sessions` (`type`)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("active_sessions_001");
  return dao.deleteCollection(collection);
});
