/// <reference path="../pb_data/types.d.ts" />

migrate((txApp) => {
  // 1. Create leaderboard collection (without indexes first)
  const leaderboardCollection = new Collection({
    name: "leaderboard",
    type: "base",
    system: false,
    schema: [
      {
        name: "user_hash",
        type: "text",
        required: true,
        unique: true,
        options: { "min": 8, "max": 64, "pattern": "" }
      },
      {
        name: "best_streak",
        type: "number",
        required: false,
        unique: false,
        options: { "min": 0, "max": 99999 }
      },
      {
        name: "total_days",
        type: "number",
        required: false,
        unique: false,
        options: { "min": 0, "max": 99999 }
      },
      {
        name: "last_active_at",
        type: "date",
        required: false,
        unique: false
      }
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: null
  });
  txApp.save(leaderboardCollection);

  // 2. Add indexes after table is created
  leaderboardCollection.indexes = [
    "CREATE INDEX idx_leaderboard_user_hash ON leaderboard (user_hash)",
    "CREATE INDEX idx_leaderboard_best_streak ON leaderboard (best_streak DESC)"
  ];
  txApp.save(leaderboardCollection);

  // 3. Fix active_sessions permissions (was fully open, now requires auth)
  try {
    const activeSessions = txApp.findCollectionByNameOrId("active_sessions_001");
    activeSessions.createRule = "@request.auth.id != ''";
    activeSessions.updateRule = "@request.auth.id != ''";
    activeSessions.deleteRule = "@request.auth.id != ''";
    txApp.save(activeSessions);
  } catch (e) {
    // Collection may not exist
    console.log("[Migration] active_sessions not found, skipping permission fix");
  }
}, (txApp) => {
  // Rollback
  try {
    const lb = txApp.findCollectionByNameOrId("leaderboard");
    txApp.delete(lb);
  } catch (e) {}

  try {
    const activeSessions = txApp.findCollectionByNameOrId("active_sessions_001");
    activeSessions.createRule = "";
    activeSessions.updateRule = "";
    activeSessions.deleteRule = "";
    txApp.save(activeSessions);
  } catch (e) {}
});
