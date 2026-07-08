/// <reference path="../pb_data/types.d.ts" />

// PB v0.38.2: callbacks run in isolated scopes — ALL helpers must be defined INSIDE each callback.

// ═══════════════════════════════════════════════════════════════
// POST /api/sync — Combined push + pull
// ═══════════════════════════════════════════════════════════════
routerAdd("POST", "/api/sync", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews",motivationEntry:"eating_motivations",customWuxing:"custom_wuxing_maps",fearEntry:"fear_entries",courageEntry:"courage_entries",fearAchievement:"fear_achievements",sutraReading:"sutra_reading_sessions",sleep:"sleep_records",give:"give_entries",bodyGoal:"body_goals",bodyPlan:"body_plans",weightRecord:"weight_records",bodyCheckin:"body_checkins",vision:"visions",visionPractice:"vision_practices",dedication:"dedications",mantraDef:"mantra_defs",mantraSession:"mantra_sessions",zhiguanSession:"zhiguan_sessions",breath:"breath_records"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id",motivationEntry:"motivation_id",customWuxing:"wuxing_id",fearEntry:"fear_id",courageEntry:"courage_id",fearAchievement:"achievement_id",sutraReading:"reading_id",sleep:"sleep_id",give:"give_id",bodyGoal:"goal_id",bodyPlan:"plan_id",weightRecord:"weight_id",bodyCheckin:"checkin_id",vision:"vision_id",visionPractice:"practice_id",dedication:"dedication_id",mantraDef:"mantra_id",mantraSession:"session_id",zhiguanSession:"zhiguan_id",breath:"breath_id"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview","motivationEntry","customWuxing","fearEntry","courageEntry","fearAchievement","sutraReading","sleep","give","bodyGoal","bodyPlan","weightRecord","bodyCheckin","vision","visionPractice","dedication","mantraDef","mantraSession","zhiguanSession","breath"];
    function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\0/g, ''); }
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_-]{1,128}$/;
    function isValidId(v) { return typeof v === 'string' && (uuidRe.test(v) || idRe.test(v)); }
    function buildUserFilter(userId, sinceDate) {
      return "user_id = '" + escapeFilterValue(userId) + "'";
    }
    function buildFilter(field, value, userId) { return field + " = '" + escapeFilterValue(value) + "' && user_id = '" + escapeFilterValue(userId) + "'"; }
    function safeFindRecords(app, coll, filter, limit, offset) {
      try { return app.findRecordsByFilter(coll, filter, "-created", limit, offset || 0); } catch (e1) {
        try { return app.findRecordsByFilter(coll, filter, "-updated", limit, offset || 0); } catch (e2) {
          try { return app.findRecordsByFilter(coll, filter, "-updated_at", limit, offset || 0); } catch (e3) {
            return app.findRecordsByFilter(coll, filter, "", limit, offset || 0);
          }
        }
      }
    }
    function parseRecordData(rec) { var raw = rec.get("data"); var obj = {}; if (typeof raw === 'string') { try { obj = JSON.parse(raw); } catch(pe) { obj = {}; } } else if (raw && typeof raw === 'object') { for (var k in raw) obj[k] = raw[k]; } return obj; }
    function exportRecord(rec) { var exported = rec.publicExport(); var dd = exported.data; if (typeof dd === 'string') { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } } if (dd && typeof dd === 'object') { for (var dk in dd) { if (dk === 'id' || dk === 'created' || dk === 'updated' || dk === 'user_id') continue; exported[dk] = dd[dk]; } if (dd.id !== undefined) exported.id = dd.id; if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt; exported.deleted = !!dd.deleted; } else { exported.deleted = false; } if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime(); delete exported.data; var efKeys = Object.keys(exported); for (var efi = 0; efi < efKeys.length; efi++) { if (typeof exported[efKeys[efi]] === 'function') delete exported[efKeys[efi]]; } return exported; }

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });

    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === 'string') { try { body = JSON.parse(rawBody); } catch(pb) { body = {}; } }
    else if (rawBody && typeof rawBody === 'object') { body = rawBody; }
    var lastSyncAt = body.lastSyncAt || 0;
    var changes = body.changes || [];
    var skipPull = !!body.skipPull;
    var pullEntities = Array.isArray(body.entities) && body.entities.length > 0 ? body.entities : null;

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
          var delRecs = $app.findRecordsByFilter(coll, buildFilter(idField, entityId, userId), "", 10);
          for (var dj = 0; dj < delRecs.length; dj++) {
            var curObj = parseRecordData(delRecs[dj]);
            curObj.deleted = true; curObj.updatedAt = Date.now();
            delRecs[dj].set("data", JSON.stringify(curObj));
            delRecs[dj].set("deleted", true);
            $app.save(delRecs[dj]);
          }
          applied.push({ entity: entity, entityId: entityId, operation: "delete" });
        } else {
          var upRecs = $app.findRecordsByFilter(coll, buildFilter(idField, entityId, userId), "", 1);
          var rec = upRecs.length > 0 ? upRecs[0] : null;
          if (rec && payload && payload.updatedAt) {
            var existD = parseRecordData(rec);
            if ((existD.updatedAt || 0) > payload.updatedAt) { rejected.push({ entity: entity, entityId: entityId, error: "conflict" }); continue; }
          }
          if (!rec) { var colObj = $app.findCollectionByNameOrId(coll); rec = new Record(colObj); rec.set(idField, entityId); rec.set("user_id", userId); }
          var existObj = parseRecordData(rec);
          if (Object.keys(existObj).length > 500) { existObj = {}; }
          var merged = {};
          for (var pk in existObj) merged[pk] = existObj[pk];
          for (var ik in payload) { if (ik === 'updatedAt' || ik === '_clientTs') continue; merged[ik] = payload[ik]; }
          merged.updatedAt = Date.now();
          rec.set("data", JSON.stringify(merged));
          rec.set("updated_at", new Date().toISOString());
          rec.set("deleted", merged.deleted === true ? true : false);
          $app.save(rec);
          applied.push({ entity: entity, entityId: entityId, operation: "upsert" });
        }
      } catch (recErr) { rejected.push({ entity: entity, entityId: entityId, error: "Operation failed" }); }
    }

    var serverData = {};
    if (!skipPull) {
      var sinceDate = lastSyncAt > 0 ? new Date(lastSyncAt).toISOString() : '1970-01-01T00:00:00.000Z';
      var entitiesToPull = pullEntities || ENTITY_LIST;
      for (var ei = 0; ei < entitiesToPull.length; ei++) {
        try {
          var ent = entitiesToPull[ei];
          var entColl = ENTITY_COLL_MAP[ent];
          if (!entColl) continue;
          var recs = safeFindRecords($app, entColl, buildUserFilter(userId, lastSyncAt > 0 ? sinceDate : null), 500);
          var payloads = [];
          for (var ri = 0; ri < recs.length; ri++) {
            try {
              var exported = exportRecord(recs[ri]);
              var hasId = exported.id || exported[ENTITY_ID_FIELD_MAP[ent]] || exported.date || exported.name;
              if (hasId) payloads.push(exported);
            } catch (recErr) { console.warn("[sync] pull record error for " + ent + ": " + (recErr.message || String(recErr))); }
          }
          if (payloads.length > 0) serverData[ent] = payloads;
        } catch (qErr) { console.error("[sync] pull error for " + ent + ":", qErr.message || String(qErr)); }
      }
    }

    return e.json(200, { changes: applied, rejected: rejected, data: serverData, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync-combined] Error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sync — Incremental pull
// ═══════════════════════════════════════════════════════════════
routerAdd("GET", "/api/sync", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews",motivationEntry:"eating_motivations",customWuxing:"custom_wuxing_maps",fearEntry:"fear_entries",courageEntry:"courage_entries",fearAchievement:"fear_achievements",sutraReading:"sutra_reading_sessions",sleep:"sleep_records",give:"give_entries",bodyGoal:"body_goals",bodyPlan:"body_plans",weightRecord:"weight_records",bodyCheckin:"body_checkins",vision:"visions",visionPractice:"vision_practices",dedication:"dedications",mantraDef:"mantra_defs",mantraSession:"mantra_sessions",zhiguanSession:"zhiguan_sessions",breath:"breath_records"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id",motivationEntry:"motivation_id",customWuxing:"wuxing_id",fearEntry:"fear_id",courageEntry:"courage_id",fearAchievement:"achievement_id",sutraReading:"reading_id",sleep:"sleep_id",give:"give_id",bodyGoal:"goal_id",bodyPlan:"plan_id",weightRecord:"weight_id",bodyCheckin:"checkin_id",vision:"vision_id",visionPractice:"practice_id",dedication:"dedication_id",mantraDef:"mantra_id",mantraSession:"session_id",zhiguanSession:"zhiguan_id",breath:"breath_id"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview","motivationEntry","customWuxing","fearEntry","courageEntry","fearAchievement","sutraReading","sleep","give","bodyGoal","bodyPlan","weightRecord","bodyCheckin","vision","visionPractice","dedication","mantraDef","mantraSession","zhiguanSession","breath"];
    function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\0/g, ''); }
    function buildUserFilter(userId, sinceDate) {
      return "user_id = '" + escapeFilterValue(userId) + "'";
    }
    function exportRecord(rec) { var exported = rec.publicExport(); var dd = exported.data; if (typeof dd === 'string') { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } } if (dd && typeof dd === 'object') { for (var dk in dd) { if (dk === 'id' || dk === 'created' || dk === 'updated' || dk === 'user_id') continue; exported[dk] = dd[dk]; } if (dd.id !== undefined) exported.id = dd.id; if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt; exported.deleted = !!dd.deleted; } else { exported.deleted = false; } if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime(); delete exported.data; var efKeys = Object.keys(exported); for (var efi = 0; efi < efKeys.length; efi++) { if (typeof exported[efKeys[efi]] === 'function') delete exported[efKeys[efi]]; } return exported; }

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });

    var since = parseInt((info.query || {}).since || "0", 10);
    var sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    var page = parseInt((info.query || {}).page || "0", 10);
    var pageSize = parseInt((info.query || {}).pageSize || "0", 10);
    var data = {};

    for (var ei = 0; ei < ENTITY_LIST.length; ei++) {
      try {
        var ent = ENTITY_LIST[ei];
        var coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        var allRecs = [];
        var totalCount = 0;
        if (page > 0 && pageSize > 0) {
          // Paginated mode
          var countRecs = $app.findRecordsByFilter(coll, buildUserFilter(userId, since > 0 ? sinceDate : null), "", 0);
          totalCount = countRecs ? countRecs.length : 0;
          var offset = (page - 1) * pageSize;
          var batch = safeFindRecords($app, coll, buildUserFilter(userId, since > 0 ? sinceDate : null), pageSize, offset);
          if (batch) { for (var bi = 0; bi < batch.length; bi++) allRecs.push(batch[bi]); }
        } else {
          // Full pull with safety cap
          var recs = safeFindRecords($app, coll, buildUserFilter(userId, since > 0 ? sinceDate : null), 5000);
          if (recs) { for (var bi = 0; bi < recs.length; bi++) allRecs.push(recs[bi]); }
        }
        var payloads = [];
        for (var ri = 0; ri < allRecs.length; ri++) {
          try {
            var exported = exportRecord(allRecs[ri]);
            var idF = ENTITY_ID_FIELD_MAP[ent];
            if (exported.id || exported[idF] || exported.date || exported.name) payloads.push(exported);
          } catch (recErr) { console.warn("[sync-get] record error for " + ent + ": " + (recErr.message || String(recErr))); }
        }
        if (payloads.length > 0) data[ent] = payloads;
        if (page > 0 && pageSize > 0) {
          if (!data._meta) data._meta = {};
          data._meta[ent] = { page: page, pageSize: pageSize, totalItems: totalCount, totalPages: Math.ceil(totalCount / pageSize) };
        }
      } catch (qErr) { console.error("[sync-get] entity error for " + (ENTITY_LIST[ei] || '?') + ": " + (qErr.message || String(qErr))); }
    }

    return e.json(200, { data: data, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync-get] Error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sync/check — Lightweight change detection
// ═══════════════════════════════════════════════════════════════
routerAdd("GET", "/api/sync/check", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews",motivationEntry:"eating_motivations",customWuxing:"custom_wuxing_maps",fearEntry:"fear_entries",courageEntry:"courage_entries",fearAchievement:"fear_achievements",sutraReading:"sutra_reading_sessions",sleep:"sleep_records",give:"give_entries",bodyGoal:"body_goals",bodyPlan:"body_plans",weightRecord:"weight_records",bodyCheckin:"body_checkins",vision:"visions",visionPractice:"vision_practices",dedication:"dedications",mantraDef:"mantra_defs",mantraSession:"mantra_sessions",zhiguanSession:"zhiguan_sessions",breath:"breath_records"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview","motivationEntry","customWuxing","fearEntry","courageEntry","fearAchievement","sutraReading","sleep","give","bodyGoal","bodyPlan","weightRecord","bodyCheckin","vision","visionPractice","dedication","mantraDef","mantraSession","zhiguanSession","breath"];
    function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\0/g, ''); }
    function buildUserFilter(userId, sinceDate) {
      return "user_id = '" + escapeFilterValue(userId) + "'";
    }
    function safeFindRecords(app, coll, filter, limit, offset) {
      try { return app.findRecordsByFilter(coll, filter, "-created", limit, offset || 0); } catch (e1) {
        try { return app.findRecordsByFilter(coll, filter, "-updated", limit, offset || 0); } catch (e2) {
          try { return app.findRecordsByFilter(coll, filter, "-updated_at", limit, offset || 0); } catch (e3) {
            return app.findRecordsByFilter(coll, filter, "", limit, offset || 0);
          }
        }
      }
    }

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });

    var since = parseInt((info.query || {}).since || "0", 10);
    var sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    var changed = {};
    var totalChanges = 0;

    for (var ei = 0; ei < ENTITY_LIST.length; ei++) {
      try {
        var ent = ENTITY_LIST[ei];
        var coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        var recs = safeFindRecords($app, coll, buildUserFilter(userId, since > 0 ? sinceDate : null), 1);
        if (recs.length > 0) { changed[ent] = recs.length; totalChanges++; }
      } catch (qErr) { console.error("[sync-check] entity error for " + (ENTITY_LIST[ei] || '?') + ": " + (qErr.message || String(qErr))); }
    }

    return e.json(200, { hasChanges: totalChanges > 0, changed: changed, count: totalChanges, serverTime: Date.now() });
  } catch (err) {
    return e.json(500, { code: "INTERNAL_ERROR", message: "Internal error" });
  }
});
