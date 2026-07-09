/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // ─── Fix overly permissive collection rules ─────────────────────
  // These collections previously had updateRule/deleteRule of '@request.auth.id != ""'
  // which allowed ANY authenticated user to modify ANY other user's data.

  // active_sessions: mutations are handled by server-side hooks, admin-only via API
  const activeSessions = app.findCollectionByNameOrId("active_sessions");
  activeSessions.updateRule = null;
  activeSessions.deleteRule = null;
  app.save(activeSessions);

  // leaderboard: mutations are handled by server-side hooks, admin-only via API
  const leaderboard = app.findCollectionByNameOrId("leaderboard");
  leaderboard.updateRule = null;
  app.save(leaderboard);

  // global_stats: only server-side hooks should update, remove direct API update
  const globalStats = app.findCollectionByNameOrId("global_stats");
  globalStats.updateRule = null;
  app.save(globalStats);
}, (app) => {
  // rollback: restore permissive rules
  const activeSessions = app.findCollectionByNameOrId("active_sessions");
  activeSessions.updateRule = '@request.auth.id != ""';
  activeSessions.deleteRule = '@request.auth.id != ""';
  app.save(activeSessions);

  const leaderboard = app.findCollectionByNameOrId("leaderboard");
  leaderboard.updateRule = '@request.auth.id != ""';
  app.save(leaderboard);

  const globalStats = app.findCollectionByNameOrId("global_stats");
  globalStats.updateRule = '@request.auth.id != ""';
  app.save(globalStats);
});
