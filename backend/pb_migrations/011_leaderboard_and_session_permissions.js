/// <reference path="../pb_data/types.d.ts" />

migrate(function(db) {
  // 1. Create leaderboard collection (idempotent)
  try {
    db.findCollectionByNameOrId("leaderboard");
  } catch (e) {
    var leaderboardCollection = new Collection({
      "id": "leaderboard_001",
      "name": "leaderboard",
      "type": "base",
      "system": false,
      "fields": [
        { "name": "user_hash", "type": "text", "required": true, "presentable": false, "unique": true, "options": { "min": 8, "max": 64, "pattern": "" } },
        { "name": "best_streak", "type": "number", "required": false, "presentable": false, "unique": false, "options": { "min": 0, "max": 99999 } },
        { "name": "total_days", "type": "number", "required": false, "presentable": false, "unique": false, "options": { "min": 0, "max": 99999 } },
        { "name": "last_active_at", "type": "date", "required": false, "presentable": false, "unique": false, "options": { "min": "", "max": "" } }
      ],
      "listRule": "",
      "viewRule": "",
      "createRule": "@request.auth.id != ''",
      "updateRule": "@request.auth.id != ''",
      "deleteRule": null,
      "options": {}
    });
    db.save(leaderboardCollection);

    // Add indexes after table exists
    var lb = db.findCollectionByNameOrId("leaderboard");
    lb.indexes = [
      "CREATE INDEX idx_leaderboard_user_hash ON leaderboard (user_hash)",
      "CREATE INDEX idx_leaderboard_best_streak ON leaderboard (best_streak DESC)"
    ];
    db.save(lb);
  }

  // 2. Fix active_sessions permissions (idempotent)
  try {
    var activeSessions = db.findCollectionByNameOrId("active_sessions");
    if (activeSessions) {
      activeSessions.createRule = "@request.auth.id != ''";
      activeSessions.updateRule = "@request.auth.id != ''";
      activeSessions.deleteRule = "@request.auth.id != ''";
      db.save(activeSessions);
    }
  } catch (e) {
    console.log("[Migration] active_sessions not found, skipping permission fix");
  }
}, function(db) {
  // Rollback
  try { db.deleteCollection(db.findCollectionByNameOrId("leaderboard")); } catch (e) {}
  try {
    var activeSessions = db.findCollectionByNameOrId("active_sessions");
    if (activeSessions) {
      activeSessions.createRule = "";
      activeSessions.updateRule = "";
      activeSessions.deleteRule = "";
      db.save(activeSessions);
    }
  } catch (e) {}
});
