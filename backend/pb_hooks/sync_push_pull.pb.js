
// PB v0.38.2: callbacks run in isolated scopes — ALL helpers must be defined INSIDE each callback.

// POST /api/sync/push
routerAdd("POST", "/api/sync/push", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews",motivationEntry:"eating_motivations",customWuxing:"custom_wuxing_maps",fearEntry:"fear_entries",courageEntry:"courage_entries",fearAchievement:"fear_achievements",sutraReading:"sutra_reading_sessions",sleep:"sleep_records",give:"give_entries",bodyGoal:"body_goals",bodyPlan:"body_plans",weightRecord:"weight_records",bodyCheckin:"body_checkins",vision:"visions",visionPractice:"vision_practices",dedication:"dedications",mantraDef:"mantra_defs",mantraSession:"mantra_sessions",zhiguanSession:"zhiguan_sessions",breath:"breath_records"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id",motivationEntry:"motivation_id",customWuxing:"wuxing_id",fearEntry:"fear_id",courageEntry:"courage_id",fearAchievement:"achievement_id",sutraReading:"reading_id",sleep:"sleep_id",give:"give_id",bodyGoal:"goal_id",bodyPlan:"plan_id",weightRecord:"weight_id",bodyCheckin:"checkin_id",vision:"vision_id",visionPractice:"practice_id",dedication:"dedication_id",mantraDef:"mantra_id",mantraSession:"session_id",zhiguanSession:"zhiguan_id",breath:"breath_id"};
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;
    function isValidId(v) { return uuidRe.test(v) || idRe.test(v); }
    function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    if (!isValidId(userId)) return e.json(400, { code: "BAD_REQUEST", message: "Invalid userId" });
    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === "string") { try { body = JSON.parse(rawBody); } catch(pb) { body = {}; } }
    else if (rawBody && typeof rawBody === "object") { body = rawBody; }
    var changes = body.changes || [];
    var applied = [];
    var rejected = [];
    for (var ci = 0; ci < changes.length; ci++) {
      var c = changes[ci];
      var entity = c.entity, entityId = c.entityId, operation = c.operation, payload = c.payload;
      var coll = ENTITY_COLL_MAP[entity], idField = ENTITY_ID_FIELD_MAP[entity];
      if (!coll || !idField) { rejected.push({ entity: entity, entityId: entityId, error: "Unknown entity" }); continue; }
      if (!isValidId(entityId)) { rejected.push({ entity: entity, entityId: entityId, error: "Invalid entityId" }); continue; }
      try {
        if (operation === "delete") {
          var delFilter = idField + " = '" + escapeFilterValue(entityId) + "' && user_id = '" + escapeFilterValue(userId) + "'";
          var delRecs = $app.findRecordsByFilter(coll, delFilter, "", 10);
          for (var dj = 0; dj < delRecs.length; dj++) {
            var curData = delRecs[dj].get("data");
            var curObj = {};
            if (typeof curData === "string") { try { curObj = JSON.parse(curData); } catch(pe) {} }
            else if (curData && typeof curData === "object") { for (var ck in curData) curObj[ck] = curData[ck]; }
            curObj.deleted = true; curObj.updatedAt = Date.now();
            delRecs[dj].set("data", JSON.stringify(curObj));
            $app.save(delRecs[dj]);
          }
          applied.push({ entity: entity, entityId: entityId, operation: "delete" });
        } else {
          var upFilter = idField + " = '" + escapeFilterValue(entityId) + "' && user_id = '" + escapeFilterValue(userId) + "'";
          var upRecs = $app.findRecordsByFilter(coll, upFilter, "", 1);
          var rec = upRecs.length > 0 ? upRecs[0] : null;
          if (rec && payload && payload.updatedAt) {
            var rawD = rec.get("data");
            var existD = {};
            if (typeof rawD === "string") { try { existD = JSON.parse(rawD); } catch(pe) {} }
            else if (rawD && typeof rawD === "object") { for (var ek in rawD) existD[ek] = rawD[ek]; }
            if ((existD.updatedAt || 0) > payload.updatedAt) { rejected.push({ entity: entity, entityId: entityId, error: "conflict", serverData: existD }); continue; }
          }
          if (!rec) { var colObj = $app.findCollectionByNameOrId(coll); rec = new Record(colObj); rec.set(idField, entityId); rec.set("user_id", userId); }
          var existObj = {};
          var rawE = rec.get("data");
          if (typeof rawE === "string") { try { existObj = JSON.parse(rawE); } catch(pe) {} }
          else if (rawE && typeof rawE === "object") { for (var mk in rawE) existObj[mk] = rawE[mk]; }
          if (Object.keys(existObj).length > 500) { existObj = {}; }
          var merged = {};
          for (var pk in existObj) merged[pk] = existObj[pk];
          for (var ik in payload) { if (ik === "updatedAt" || ik === "_clientTs") continue; merged[ik] = payload[ik]; }
          merged.updatedAt = Date.now();
          rec.set("data", JSON.stringify(merged));
          rec.set("updated_at", new Date().toISOString());
          rec.set("deleted", false);
          $app.save(rec);
          applied.push({ entity: entity, entityId: entityId, operation: "upsert" });
        }
      } catch (recErr) { rejected.push({ entity: entity, entityId: entityId, error: recErr.message || String(recErr) }); }
    }
    return e.json(200, { applied: applied, rejected: rejected, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync-push] Error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "Internal error" });
  }
});

// POST /api/sync/pull
routerAdd("POST", "/api/sync/pull", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews",motivationEntry:"eating_motivations",customWuxing:"custom_wuxing_maps",fearEntry:"fear_entries",courageEntry:"courage_entries",fearAchievement:"fear_achievements",sutraReading:"sutra_reading_sessions",sleep:"sleep_records",give:"give_entries",bodyGoal:"body_goals",bodyPlan:"body_plans",weightRecord:"weight_records",bodyCheckin:"body_checkins",vision:"visions",visionPractice:"vision_practices",dedication:"dedications",mantraDef:"mantra_defs",mantraSession:"mantra_sessions",zhiguanSession:"zhiguan_sessions",breath:"breath_records"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id",motivationEntry:"motivation_id",customWuxing:"wuxing_id",fearEntry:"fear_id",courageEntry:"courage_id",fearAchievement:"achievement_id",sutraReading:"reading_id",sleep:"sleep_id",give:"give_id",bodyGoal:"goal_id",bodyPlan:"plan_id",weightRecord:"weight_id",bodyCheckin:"checkin_id",vision:"vision_id",visionPractice:"practice_id",dedication:"dedication_id",mantraDef:"mantra_id",mantraSession:"session_id",zhiguanSession:"zhiguan_id",breath:"breath_id"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview","motivationEntry","customWuxing","fearEntry","courageEntry","fearAchievement","sutraReading","sleep","give","bodyGoal","bodyPlan","weightRecord","bodyCheckin","vision","visionPractice","dedication","mantraDef","mantraSession","zhiguanSession","breath"];
    function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === "string") { try { body = JSON.parse(rawBody); } catch(pb) { body = {}; } }
    else if (rawBody && typeof rawBody === "object") { body = rawBody; }
    var entities = body.entities || ENTITY_LIST;
    var since = parseInt(body.since || "0", 10);
    var sinceDate = since > 0 ? new Date(since).toISOString() : "1970-01-01T00:00:00.000Z";
    // Pagination support for phased initial sync
    var page = parseInt(body.page || "0", 10);
    var pageSize = parseInt(body.pageSize || "0", 10);
    var data = {};
    for (var ei = 0; ei < entities.length; ei++) {
      try {
        var ent = entities[ei];
        var coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        var f = "user_id = '" + escapeFilterValue(userId) + "'";
        // Note: PocketBase system field 'updated' may not be available in all versions
        // For initial sync, we pull all records without timestamp filter
        var allRecs = [];
        var totalCount = 0;
        if (page > 0 && pageSize > 0) {
          // Paginated mode for phased initial sync
          // First get total count
          var countRecs = $app.findRecordsByFilter(coll, f, "", 0);
          totalCount = countRecs ? countRecs.length : 0;
          var offset = (page - 1) * pageSize;
          var batch = $app.findRecordsByFilter(coll, f, "-created", pageSize, offset);
          if (batch) { for (var bi = 0; bi < batch.length; bi++) allRecs.push(batch[bi]); }
        } else {
          // Full pull mode (backward compat)
          var offset = 0;
          var BATCH = 500;
          while (true) {
            var batch = $app.findRecordsByFilter(coll, f, "-created", BATCH, offset);
            if (!batch || batch.length === 0) break;
            for (var bi = 0; bi < batch.length; bi++) allRecs.push(batch[bi]);
            if (batch.length < BATCH) break;
            offset += BATCH;
            if (offset > 50000) break;
          }
          totalCount = allRecs.length;
        }
        var payloads = [];
        for (var ri = 0; ri < allRecs.length; ri++) {
          try {
            var exported = allRecs[ri].publicExport();
            var dd = exported.data;
            if (typeof dd === "string") { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } }
            if (dd && typeof dd === "object") {
              for (var dk in dd) { if (dk === "id" || dk === "created" || dk === "updated" || dk === "user_id") continue; exported[dk] = dd[dk]; }
              if (dd.id !== undefined) exported.id = dd.id;
              if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt;
              exported.deleted = !!dd.deleted;
            } else { exported.deleted = false; }
            if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime();
            delete exported.data;
            var efKeys = Object.keys(exported);
            for (var efi = 0; efi < efKeys.length; efi++) { if (typeof exported[efKeys[efi]] === "function") delete exported[efKeys[efi]]; }
            var idF = ENTITY_ID_FIELD_MAP[ent];
            if (exported.id || exported[idF] || exported.date || exported.name) payloads.push(exported);
          } catch (recErr) {}
        }
        if (payloads.length > 0) data[ent] = payloads;
        // Include total count for paginated requests
        if (page > 0 && pageSize > 0) {
          if (!data._meta) data._meta = {};
          data._meta[ent] = { total: totalCount };
        }
      } catch (qErr) {}
    }
    return e.json(200, { data: data, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync-pull] Error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "Internal error" });
  }
});
