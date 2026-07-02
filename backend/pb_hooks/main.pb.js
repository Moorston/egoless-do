// ─── PocketBase server-side JS hooks (v0.38.2 API) ──────────────
// Runs inside PocketBase's embedded goja runtime.
// Docs: https://pocketbase.io/docs/js-overview/

// ─── Shared utilities ───────────────────────────────────────────
function escapeFilterValue(v) {
  if (typeof v !== 'string') return String(v);
  // Escape backslashes and single quotes to prevent filter injection
  return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildUserHashFilter(userHash, additionalFilter) {
  var escaped = escapeFilterValue(userHash);
  var filter = 'user_hash = "' + escaped + '"';
  if (additionalFilter) {
    filter += " && " + additionalFilter;
  }
  return filter;
}

/** Strip PII from published_minds: replace author info with anon_id */
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const authId = e.auth?.id ?? "";
  // Deterministic anon hash from auth ID
  const anon = $security.md5(authId).slice(0, 8);
  record.set("anon_id", anon);
}, "published_minds");

/** Update global_stats and leaderboard when a global_checkin is created */
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  const userHash = record.get("user_hash");
  const streak = record.get("streak") || 0;
  const totalDays = record.get("total_days") || 0;

  // Update global_stats (single-row table) using incremental update
  try {
    const stats = $app.findRecordsByFilter("global_stats", "", "", 1, 0);
    if (stats.length > 0) {
      const s = stats[0];
      const today = new Date().toISOString().slice(0, 10);
      
      // Check if this user already checked in today (before this record)
      const todayFilter = `created_at >= "${today}T00:00:00Z" && user_hash = "${escapeFilterValue(userHash)}"`;
      const userTodayCheckins = $app.findRecordsByFilter("global_checkins", todayFilter, "", 2, 0);
      const isNewToday = userTodayCheckins.length <= 1; // Only this new record means it's new
      
      // Incremental update: only increment if this is a new user today
      if (isNewToday) {
        s.set("active_today", (s.get("active_today") || 0) + 1);
      }
      
      // For total_users, check if this is the first checkin ever for this user
      const userAllFilter = `user_hash = "${escapeFilterValue(userHash)}"`;
      const userAllCheckins = $app.findRecordsByFilter("global_checkins", userAllFilter, "", 2, 0);
      const isNewUser = userAllCheckins.length <= 1;
      
      if (isNewUser) {
        s.set("total_users", (s.get("total_users") || 0) + 1);
      }
      
      // Top streak
      const topStreak = Math.max(s.get("top_streak") || 0, streak);
      s.set("top_streak", topStreak);
      s.set("updated_at", new Date().toISOString());
      $app.save(s);
    }
  } catch (e) {
    console.error("[Hooks] global_stats update error:", e);
  }

  // Update leaderboard (upsert by user_hash)
  try {
    const filter = buildUserHashFilter(userHash);
    const existing = $app.findRecordsByFilter("leaderboard", filter, "", 1, 0);
    if (existing.length > 0) {
      const lb = existing[0];
      if (streak > (lb.get("best_streak") || 0)) {
        lb.set("best_streak", streak);
      }
      lb.set("total_days", totalDays);
      lb.set("last_active_at", new Date().toISOString());
      $app.save(lb);
    } else {
      const collection = $app.findCollectionByNameOrId("leaderboard");
      const lb = new Record(collection);
      lb.set("user_hash", userHash);
      lb.set("best_streak", streak);
      lb.set("total_days", totalDays);
      lb.set("last_active_at", new Date().toISOString());
      $app.save(lb);
    }
  } catch (e) {
    console.error("[Hooks] leaderboard update error:", e);
  }
}, "global_checkins");

/** Health check endpoint */
routerAdd("GET", "/api/health", (c) => {
  return c.json(200, { status: "ok", ts: new Date().toISOString() });
});

/** Bulk opt-out: mark all checkins for a user_hash as opted_out */
routerAdd("POST", "/api/global-pulse/opt-out", (c) => {
  const body = c.requestInfo().body;
  const userHash = body?.user_hash;
  if (!userHash) return c.json(400, { error: "user_hash required" });

  // Validate userHash format (alphanumeric + hyphens, max 128 chars)
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) {
    return c.json(400, { error: "Invalid user_hash format" });
  }

  try {
    const filter = buildUserHashFilter(userHash, "opted_out != true");
    const records = $app.findRecordsByFilter("global_checkins", filter, "", 10000, 0);
    records.forEach(r => {
      r.set("opted_out", true);
      $app.save(r);
    });
    return c.json(200, { message: "opted_out", count: records.length });
  } catch (e) {
    console.error("[global-pulse] opt-out error:", e);
    return c.json(500, { error: "opt-out failed" });
  }
});

/** Bulk opt-in: unmark opted_out for a user_hash */
routerAdd("POST", "/api/global-pulse/opt-in", (c) => {
  const body = c.requestInfo().body;
  const userHash = body?.user_hash;
  if (!userHash) return c.json(400, { error: "user_hash required" });

  // Validate userHash format
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) {
    return c.json(400, { error: "Invalid user_hash format" });
  }

  try {
    const filter = buildUserHashFilter(userHash, "opted_out = true");
    const records = $app.findRecordsByFilter("global_checkins", filter, "", 10000, 0);
    records.forEach(r => {
      r.set("opted_out", false);
      $app.save(r);
    });
    return c.json(200, { message: "opted_in", count: records.length });
  } catch (e) {
    console.error("[global-pulse] opt-in error:", e);
    return c.json(500, { error: "opt-in failed" });
  }
});

/** Bulk delete: delete all global_checkins for a user_hash */
routerAdd("POST", "/api/global-pulse/delete-data", (c) => {
  const body = c.requestInfo().body;
  const userHash = body?.user_hash;
  if (!userHash) return c.json(400, { error: "user_hash required" });

  // Validate userHash format
  if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(userHash)) {
    return c.json(400, { error: "Invalid user_hash format" });
  }

  try {
    const filter = buildUserHashFilter(userHash);
    const records = $app.findRecordsByFilter("global_checkins", filter, "", 10000, 0);
    records.forEach(r => $app.delete(r));
    // Also delete leaderboard entry
    const lbRecords = $app.findRecordsByFilter("leaderboard", filter, "", 1, 0);
    lbRecords.forEach(r => $app.delete(r));
    return c.json(200, { message: "deleted", count: records.length });
  } catch (e) {
    console.error("[global-pulse] delete error:", e);
    return c.json(500, { error: "delete failed" });
  }
});

// ─── Computed fields for Entity-Bag collections ────────────────────
// Extract key fields from JSON data blob to top-level for indexing/querying.

function extractCheckinFields(record) {
  try {
    const raw = record.get("data");
    if (!raw) return;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.type) record.set("computed_type", String(data.type));
    if (data.userId) record.set("computed_user", String(data.userId));
    if (data.date) record.set("computed_date", String(data.date));
  } catch (e) {
    console.error("[Hooks] extractCheckinFields error:", e);
  }
}

onRecordAfterCreateRequest((e) => {
  extractCheckinFields(e.record);
  $app.save(e.record);
}, "checkin_records");

onRecordAfterUpdateRequest((e) => {
  extractCheckinFields(e.record);
  $app.save(e.record);
}, "checkin_records");

function extractReflectionFields(record) {
  try {
    const raw = record.get("data");
    if (!raw) return;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.userId) record.set("computed_user", String(data.userId));
    if (data.isPublished !== undefined) record.set("computed_is_published", data.isPublished ? "1" : "0");
  } catch (e) {
    console.error("[Hooks] extractReflectionFields error:", e);
  }
}

onRecordAfterCreateRequest((e) => {
  extractReflectionFields(e.record);
  $app.save(e.record);
}, "reflections");

onRecordAfterUpdateRequest((e) => {
  extractReflectionFields(e.record);
  $app.save(e.record);
}, "reflections");

function extractGoalFields(record) {
  try {
    const raw = record.get("data");
    if (!raw) return;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.userId) record.set("computed_user", String(data.userId));
    if (data.status) record.set("computed_status", String(data.status));
  } catch (e) {
    console.error("[Hooks] extractGoalFields error:", e);
  }
}

onRecordAfterCreateRequest((e) => {
  extractGoalFields(e.record);
  $app.save(e.record);
}, "goals");

onRecordAfterUpdateRequest((e) => {
  extractGoalFields(e.record);
  $app.save(e.record);
}, "goals");

function extractHabitFields(record) {
  try {
    const raw = record.get("data");
    if (!raw) return;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.userId) record.set("computed_user", String(data.userId));
    if (data.status) record.set("computed_status", String(data.status));
  } catch (e) {
    console.error("[Hooks] extractHabitFields error:", e);
  }
}

onRecordAfterCreateRequest((e) => {
  extractHabitFields(e.record);
  $app.save(e.record);
}, "habits");

onRecordAfterUpdateRequest((e) => {
  extractHabitFields(e.record);
  $app.save(e.record);
}, "habits");

/**
 * Cleanup stale active sessions (no heartbeat for > 2 minutes).
 * Exempts fasting sessions (they don't send heartbeats).
 * Runs every minute.
 */
cronAdd("cleanup_stale_sessions", "* * * * *", () => {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  try {
    const records = $app.findRecordsByFilter(
      "active_sessions", `last_heartbeat < "${cutoff}" && type != "fasting"`, "-last_heartbeat", 100, 0
    );
    records.forEach(r => $app.delete(r));
    if (records.length > 0) {
      console.log(`[Cleanup] Deleted ${records.length} stale active sessions`);
    }
  } catch (e) {
    // Collection may not exist yet
  }
});
