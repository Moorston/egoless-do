/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);

  // 1. Create leaderboard collection
  const leaderboardCollection = new Collection({
    "id": "leaderboard_001",
    "created": "2026-06-26T00:00:00Z",
    "updated": "2026-06-26T00:00:00Z",
    "name": "leaderboard",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "lb_user_hash",
        "name": "user_hash",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": { "min": 8, "max": 64, "pattern": "" }
      },
      {
        "system": false,
        "id": "lb_best_streak",
        "name": "best_streak",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 99999 }
      },
      {
        "system": false,
        "id": "lb_total_days",
        "name": "total_days",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": 0, "max": 99999 }
      },
      {
        "system": false,
        "id": "lb_last_active_at",
        "name": "last_active_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": "", "max": "" }
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_leaderboard_user_hash` ON `leaderboard` (`user_hash`)",
      "CREATE INDEX `idx_leaderboard_best_streak` ON `leaderboard` (`best_streak` DESC)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": null,
    "options": {}
  });
  dao.saveCollection(leaderboardCollection);

  // 2. Fix active_sessions permissions (was fully open, now requires auth)
  try {
    const activeSessions = dao.findCollectionByNameOrId("active_sessions_001");
    activeSessions.createRule = "@request.auth.id != ''";
    activeSessions.updateRule = "@request.auth.id != ''";
    activeSessions.deleteRule = "@request.auth.id != ''";
    dao.saveCollection(activeSessions);
  } catch (e) {
    // Collection may not exist
    console.log("[Migration] active_sessions not found, skipping permission fix");
  }
}, (db) => {
  // Rollback
  const dao = new Dao(db);
  try {
    const lb = dao.findCollectionByNameOrId("leaderboard_001");
    dao.deleteCollection(lb);
  } catch (e) {}

  try {
    const activeSessions = dao.findCollectionByNameOrId("active_sessions_001");
    activeSessions.createRule = "";
    activeSessions.updateRule = "";
    activeSessions.deleteRule = "";
    dao.saveCollection(activeSessions);
  } catch (e) {}
});
