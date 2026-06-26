// ─── PocketBase server-side JS hooks ─────────────────────────────
// Runs inside PocketBase's embedded goja runtime.
// Docs: https://pocketbase.io/docs/js-overview/

/** Blur GPS coords ±500 m before storing map_pins */
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const R = 0.0045; // ~500m at equator
  record.set("lat", record.get("lat") + (Math.random() - 0.5) * R);
  record.set("lng", record.get("lng") + (Math.random() - 0.5) * R);
}, "map_pins");

/** Strip PII from published_minds: replace author info with anon_id */
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const authId = e.httpContext.get("authRecord")?.get("id") ?? "";
  // Deterministic anon hash from auth ID
  const anon = $security.md5(authId).slice(0, 8);
  record.set("anon_id", anon);
}, "published_minds");

/** Auto-delete map_pins older than 7 days (keep map fresh) */
cronAdd("cleanup_old_pins", "0 3 * * *", () => {
  const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const records = $app.dao().findRecordsByFilter(
    "map_pins", `pinned_at < "${cutoff}"`, "-pinned_at", 1000, 0
  );
  records.forEach(r => $app.dao().deleteRecord(r));
  console.log(`[Cleanup] Deleted ${records.length} old map pins`);
});

/** Health check endpoint */
routerAdd("GET", "/api/health", (c) => {
  return c.json(200, { status: "ok", ts: new Date().toISOString() });
});

// ─── Computed fields for Entity-Bag collections ────────────────────
// Extract key fields from JSON data blob to top-level for indexing/querying.

/**
 * Extract computed fields from checkin_records JSON data.
 * Fields: computed_type, computed_user, computed_date
 */
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
  $app.dao().saveRecord(e.record);
}, "checkin_records");

onRecordAfterUpdateRequest((e) => {
  extractCheckinFields(e.record);
  $app.dao().saveRecord(e.record);
}, "checkin_records");

/**
 * Extract computed fields from reflections JSON data.
 * Fields: computed_user, computed_is_published
 */
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
  $app.dao().saveRecord(e.record);
}, "reflections");

onRecordAfterUpdateRequest((e) => {
  extractReflectionFields(e.record);
  $app.dao().saveRecord(e.record);
}, "reflections");

/**
 * Extract computed fields from goals JSON data.
 * Fields: computed_user, computed_status
 */
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
  $app.dao().saveRecord(e.record);
}, "goals");

onRecordAfterUpdateRequest((e) => {
  extractGoalFields(e.record);
  $app.dao().saveRecord(e.record);
}, "goals");

/**
 * Extract computed fields from habits JSON data.
 * Fields: computed_user, computed_status
 */
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
  $app.dao().saveRecord(e.record);
}, "habits");

onRecordAfterUpdateRequest((e) => {
  extractHabitFields(e.record);
  $app.dao().saveRecord(e.record);
}, "habits");

/**
 * Cleanup stale active sessions (no heartbeat for > 2 minutes).
 * Runs every minute.
 */
cronAdd("cleanup_stale_sessions", "* * * * *", () => {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  try {
    const records = $app.dao().findRecordsByFilter(
      "active_sessions", `last_heartbeat < "${cutoff}"`, "-last_heartbeat", 100, 0
    );
    records.forEach(r => $app.dao().deleteRecord(r));
    if (records.length > 0) {
      console.log(`[Cleanup] Deleted ${records.length} stale active sessions`);
    }
  } catch (e) {
    // Collection may not exist yet
  }
});
