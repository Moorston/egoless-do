/// <reference path="../pb_data/types.d.ts" />

// ─── Sync API endpoints ──────────────────────────────────────────
// POST /api/sync — push local changes + pull server changes
// GET  /api/sync — full pull (all user data)
// GET  /api/sync/check?since=... — lightweight change check

routerAdd("POST", "/api/sync", (e) => {
  const info = e.request.authRecord;
  if (!info) {
    return e.json(401, { code: "UNAUTHORIZED", message: "请先登录" });
  }

  const userId = info.id;
  const body = e.request.body;
  const lastSyncAt = body.lastSyncAt || 0;
  const changes = body.changes || [];

  // Entity → PocketBase collection mapping
  const ENTITY_COLLECTION = {
    habit: "habits",
    reflection: "reflections",
    fasting: "fasting_sessions",
    food: "food_entries",
    checkin: "checkin_records",
    meditation: "meditation_history",
    profile: "user_profiles",
    exercise: "exercise_entries",
    plan: "plans",
    planItem: "plan_items",
    planItemCheckin: "plan_item_checkins",
    dailyCustomTodo: "daily_custom_todos",
    dailyTodoHistory: "daily_todo_history",
    grace: "grace_history",
    thoughtTrail: "thought_trails",
    trailNote: "trail_notes",
    reflectionLink: "reflection_links",
    aiConfig: "ai_configs",
    checkinReview: "checkin_reviews",
  };

  // Entity → ID field mapping
  const ENTITY_ID_FIELD = {
    habit: "habit_id",
    reflection: "reflection_id",
    fasting: "session_id",
    food: "food_id",
    checkin: "date",
    meditation: "date",
    profile: "profile_id",
    exercise: "exercise_id",
    plan: "plan_id",
    planItem: "plan_item_id",
    planItemCheckin: "checkin_id",
    dailyCustomTodo: "todo_id",
    dailyTodoHistory: "history_id",
    grace: "date",
    thoughtTrail: "trail_id",
    trailNote: "note_id",
    reflectionLink: "link_id",
    aiConfig: "config_id",
    checkinReview: "review_id",
  };

  const applied = [];
  const errors = [];

  // ── Apply incoming changes ──────────────────────────────────────
  for (const change of changes) {
    const { entity, entityId, operation, payload } = change;
    const collection = ENTITY_COLLECTION[entity];
    const idField = ENTITY_ID_FIELD[entity];

    if (!collection || !idField) {
      errors.push({ entityId, error: "Unknown entity: " + entity });
      continue;
    }

    try {
      if (operation === "delete") {
        // Soft delete: mark as deleted
        const records = $app.findRecordsByFilter(
          collection,
          idField + " = '" + entityId + "' && user_id = '" + userId + "'"
        );
        for (const r of records) {
          r.set("deleted", true);
          r.set("updated_at", new Date().toISOString());
          $app.save(r);
        }
      } else {
        // Upsert: find existing or create
        const records = $app.findRecordsByFilter(
          collection,
          idField + " = '" + entityId + "' && user_id = '" + userId + "'"
        );

        let record;
        if (records.length > 0) {
          record = records[0];
        } else {
          record = new Record($app.findCollectionByNameOrId(collection));
          record.set(idField, entityId);
          record.set("user_id", userId);
        }

        // Apply payload fields
        if (payload) {
          for (const [key, value] of Object.entries(payload)) {
            if (key !== idField && key !== "user_id") {
              record.set(key, value);
            }
          }
        }

        record.set("updated_at", new Date().toISOString());
        record.set("deleted", false);
        $app.save(record);
      }
      applied.push({ entity, entityId, operation });
    } catch (err) {
      errors.push({ entityId, error: err.message || String(err) });
    }
  }

  // ── Pull server changes since lastSyncAt ────────────────────────
  const serverData = {};
  const sinceDate = new Date(lastSyncAt).toISOString();

  for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
    try {
      const records = $app.findRecordsByFilter(
        collection,
        "user_id = '" + userId + "' && updated_at > '" + sinceDate + "'",
        "-updated_at",
        500
      );
      if (records.length > 0) {
        serverData[entity] = records.map((r) => r.publicExport());
      }
    } catch (err) {
      // Collection might not exist yet — skip silently
    }
  }

  return e.json(200, {
    applied,
    errors,
    data: serverData,
    serverTime: Date.now(),
  });
});

routerAdd("GET", "/api/sync", (e) => {
  const info = e.request.authRecord;
  if (!info) {
    return e.json(401, { code: "UNAUTHORIZED", message: "请先登录" });
  }

  const userId = info.id;

  const ENTITY_COLLECTION = {
    habit: "habits",
    reflection: "reflections",
    fasting: "fasting_sessions",
    food: "food_entries",
    checkin: "checkin_records",
    meditation: "meditation_history",
    profile: "user_profiles",
    exercise: "exercise_entries",
    plan: "plans",
    planItem: "plan_items",
    planItemCheckin: "plan_item_checkins",
    dailyCustomTodo: "daily_custom_todos",
    dailyTodoHistory: "daily_todo_history",
    grace: "grace_history",
    thoughtTrail: "thought_trails",
    trailNote: "trail_notes",
    reflectionLink: "reflection_links",
    aiConfig: "ai_configs",
    checkinReview: "checkin_reviews",
  };

  const data = {};

  for (const [entity, collection] of Object.entries(ENTITY_COLLECTION)) {
    try {
      const records = $app.findRecordsByFilter(
        collection,
        "user_id = '" + userId + "' && deleted != true",
        "-updated_at",
        2000
      );
      data[entity] = records.map((r) => r.publicExport());
    } catch (err) {
      // Collection might not exist yet — skip silently
    }
  }

  return e.json(200, {
    data,
    serverTime: Date.now(),
  });
});

routerAdd("GET", "/api/sync/check", (e) => {
  const info = e.request.authRecord;
  if (!info) {
    return e.json(401, { code: "UNAUTHORIZED", message: "请先登录" });
  }

  const userId = info.id;
  const since = parseInt(e.request.query().get("since") || "0", 10);
  const sinceDate = new Date(since).toISOString();

  const ENTITY_COLLECTION = {
    habit: "habits",
    reflection: "reflections",
    fasting: "fasting_sessions",
    food: "food_entries",
    checkin: "checkin_records",
    meditation: "meditation_history",
    profile: "user_profiles",
    exercise: "exercise_entries",
    plan: "plans",
    planItem: "plan_items",
    planItemCheckin: "plan_item_checkins",
    dailyCustomTodo: "daily_custom_todos",
    dailyTodoHistory: "daily_todo_history",
    grace: "grace_history",
    thoughtTrail: "thought_trails",
    trailNote: "trail_notes",
    reflectionLink: "reflection_links",
    aiConfig: "ai_configs",
    checkinReview: "checkin_reviews",
  };

  let totalCount = 0;

  for (const [, collection] of Object.entries(ENTITY_COLLECTION)) {
    try {
      const records = $app.findRecordsByFilter(
        collection,
        "user_id = '" + userId + "' && updated_at > '" + sinceDate + "'",
        "",
        1
      );
      totalCount += records.length;
    } catch (err) {
      // Skip
    }
  }

  return e.json(200, {
    hasChanges: totalCount > 0,
    count: totalCount,
  });
});
