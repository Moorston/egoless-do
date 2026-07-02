// ─── PocketBase server-side JS hooks (v0.38.2 API) ──────────────
// PB v0.38.2: ALL callbacks run in isolated scopes.
// Top-level vars/functions are NOT accessible from callbacks.
// ALL helpers must be defined INSIDE each callback.

// Strip PII from published_minds: replace author info with anon_id
onRecordCreateRequest(function(e) {
  var record = e.record;
  var authId = e.auth ? e.auth.id : "";
  var anon = $security.md5(authId).slice(0, 8);
  record.set("anon_id", anon);

  // Enforce content length limit (max 10,000 chars)
  var content = record.get("content") || "";
  if (content.length > 10000) {
    throw new BadRequestError("Content exceeds maximum length of 10,000 characters");
  }
}, "published_minds");

// Update global_stats and leaderboard when a global_checkin is created
onRecordAfterCreateSuccess(function(e) {
  function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function buildUserHashFilter(userHash, additionalFilter) {
    var escaped = escapeFilterValue(userHash);
    var filter = 'user_hash = "' + escaped + '"';
    if (additionalFilter) filter += " && " + additionalFilter;
    return filter;
  }

  var record = e.record;
  var userHash = record.get("user_hash");
  var streak = record.get("streak") || 0;
  var totalDays = record.get("total_days") || 0;

  try {
    var stats = $app.findRecordsByFilter("global_stats", "", "", 1, 0);
    if (stats.length > 0) {
      var s = stats[0];
      var today = new Date().toISOString().slice(0, 10);
      var todayFilter = 'created_at >= "' + today + 'T00:00:00Z" && user_hash = "' + escapeFilterValue(userHash) + '"';
      var userTodayCheckins = $app.findRecordsByFilter("global_checkins", todayFilter, "", 2, 0);
      if (userTodayCheckins.length <= 1) s.set("active_today", (s.get("active_today") || 0) + 1);
      var userAllFilter = 'user_hash = "' + escapeFilterValue(userHash) + '"';
      var userAllCheckins = $app.findRecordsByFilter("global_checkins", userAllFilter, "", 2, 0);
      if (userAllCheckins.length <= 1) s.set("total_users", (s.get("total_users") || 0) + 1);
      s.set("top_streak", Math.max(s.get("top_streak") || 0, streak));
      s.set("updated_at", new Date().toISOString());
      $app.save(s);
    }
  } catch (err) { console.error("[Hooks] global_stats update error:", err); }

  try {
    var filter = buildUserHashFilter(userHash);
    var existing = $app.findRecordsByFilter("leaderboard", filter, "", 1, 0);
    if (existing.length > 0) {
      var lb = existing[0];
      if (streak > (lb.get("best_streak") || 0)) lb.set("best_streak", streak);
      lb.set("total_days", totalDays);
      lb.set("last_active_at", new Date().toISOString());
      $app.save(lb);
    } else {
      var collection = $app.findCollectionByNameOrId("leaderboard");
      var lb2 = new Record(collection);
      lb2.set("user_hash", userHash);
      lb2.set("best_streak", streak);
      lb2.set("total_days", totalDays);
      lb2.set("last_active_at", new Date().toISOString());
      $app.save(lb2);
    }
  } catch (err) { console.error("[Hooks] leaderboard update error:", err); }
}, "global_checkins");

// Bulk opt-out/opt-in/delete endpoints
routerAdd("POST", "/api/global-pulse/opt-out", function(c) {
  function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function buildUserHashFilter(userHash, additionalFilter) {
    var escaped = escapeFilterValue(userHash);
    var filter = 'user_hash = "' + escaped + '"';
    if (additionalFilter) filter += " && " + additionalFilter;
    return filter;
  }
  var info = c.requestInfo();
  if (!info.auth) return c.json(401, { error: "Authentication required" });
  var body = info.body;
  var userHash = body ? body.user_hash : null;
  if (!userHash) return c.json(400, { error: "user_hash required" });
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) return c.json(400, { error: "Invalid user_hash format" });
  try {
    var records = $app.findRecordsByFilter("global_checkins", buildUserHashFilter(userHash, "opted_out != true"), "", 10000, 0);
    for (var i = 0; i < records.length; i++) { records[i].set("opted_out", true); $app.save(records[i]); }
    return c.json(200, { message: "opted_out", count: records.length });
  } catch (e) { return c.json(500, { error: "opt-out failed" }); }
});

routerAdd("POST", "/api/global-pulse/opt-in", function(c) {
  function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function buildUserHashFilter(userHash, additionalFilter) {
    var escaped = escapeFilterValue(userHash);
    var filter = 'user_hash = "' + escaped + '"';
    if (additionalFilter) filter += " && " + additionalFilter;
    return filter;
  }
  var info = c.requestInfo();
  if (!info.auth) return c.json(401, { error: "Authentication required" });
  var body = info.body;
  var userHash = body ? body.user_hash : null;
  if (!userHash) return c.json(400, { error: "user_hash required" });
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) return c.json(400, { error: "Invalid user_hash format" });
  try {
    var records = $app.findRecordsByFilter("global_checkins", buildUserHashFilter(userHash, "opted_out = true"), "", 10000, 0);
    for (var i = 0; i < records.length; i++) { records[i].set("opted_out", false); $app.save(records[i]); }
    return c.json(200, { message: "opted_in", count: records.length });
  } catch (e) { return c.json(500, { error: "opt-in failed" }); }
});

routerAdd("POST", "/api/global-pulse/delete-data", function(c) {
  function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function buildUserHashFilter(userHash) {
    return 'user_hash = "' + escapeFilterValue(userHash) + '"';
  }
  var info = c.requestInfo();
  if (!info.auth) return c.json(401, { error: "Authentication required" });
  var body = info.body;
  var userHash = body ? body.user_hash : null;
  if (!userHash) return c.json(400, { error: "user_hash required" });
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) return c.json(400, { error: "Invalid user_hash format" });
  try {
    var filter = buildUserHashFilter(userHash);
    var records = $app.findRecordsByFilter("global_checkins", filter, "", 10000, 0);
    for (var i = 0; i < records.length; i++) $app.delete(records[i]);
    var lbRecords = $app.findRecordsByFilter("leaderboard", filter, "", 1, 0);
    for (var j = 0; j < lbRecords.length; j++) $app.delete(lbRecords[j]);
    return c.json(200, { message: "deleted", count: records.length });
  } catch (e) { return c.json(500, { error: "delete failed" }); }
});

// Computed fields — only save if values actually changed (prevent infinite loop)
// NOTE: In PB v0.38.2, top-level functions are NOT accessible from callbacks.
// The update logic must be inlined in each callback.

onRecordAfterCreateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.type && e.record.get("computed_type") !== String(data.type)) { e.record.set("computed_type", String(data.type)); changed = true; }
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.date && e.record.get("computed_date") !== String(data.date)) { e.record.set("computed_date", String(data.date)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "checkin_records");

onRecordAfterUpdateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.type && e.record.get("computed_type") !== String(data.type)) { e.record.set("computed_type", String(data.type)); changed = true; }
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.date && e.record.get("computed_date") !== String(data.date)) { e.record.set("computed_date", String(data.date)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "checkin_records");

onRecordAfterCreateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    var pub = data.isPublished ? "1" : "0";
    if (data.isPublished !== undefined && e.record.get("computed_is_published") !== pub) { e.record.set("computed_is_published", pub); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "reflections");

onRecordAfterUpdateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    var pub = data.isPublished ? "1" : "0";
    if (data.isPublished !== undefined && e.record.get("computed_is_published") !== pub) { e.record.set("computed_is_published", pub); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "reflections");

onRecordAfterCreateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.status && e.record.get("computed_status") !== String(data.status)) { e.record.set("computed_status", String(data.status)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "goals");

onRecordAfterUpdateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.status && e.record.get("computed_status") !== String(data.status)) { e.record.set("computed_status", String(data.status)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "goals");

onRecordAfterCreateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.status && e.record.get("computed_status") !== String(data.status)) { e.record.set("computed_status", String(data.status)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "habits");

onRecordAfterUpdateSuccess(function(e) {
  try {
    var raw = e.record.get("data"); if (!raw) return;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    var changed = false;
    if (data.userId && e.record.get("computed_user") !== String(data.userId)) { e.record.set("computed_user", String(data.userId)); changed = true; }
    if (data.status && e.record.get("computed_status") !== String(data.status)) { e.record.set("computed_status", String(data.status)); changed = true; }
    if (changed) $app.save(e.record);
  } catch (err) {}
}, "habits");

// Cleanup stale active sessions
cronAdd("cleanup_stale_sessions", "* * * * *", function() {
  var cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  try {
    var records = $app.findRecordsByFilter("active_sessions", 'last_heartbeat < "' + cutoff + '" && type != "fasting"', "-last_heartbeat", 100, 0);
    for (var i = 0; i < records.length; i++) $app.delete(records[i]);
    if (records.length > 0) console.log("[Cleanup] Deleted " + records.length + " stale active sessions");
  } catch (e) {}
});
