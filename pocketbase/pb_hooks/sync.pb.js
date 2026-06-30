/// <reference path="../pb_data/types.d.ts" />

// ── PocketBase 0.38.2 JSVM: routerAdd callbacks run in isolated scopes.
//    All helper functions must be defined INSIDE each callback.
//    Top-level vars are NOT accessible from callbacks.

var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id"};
var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview"];

// ═══════════════════════════════════════════════════════════════
// POST /api/sync — Combined push + pull (main sync endpoint)
// ═══════════════════════════════════════════════════════════════
routerAdd("POST", "/api/sync", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview"];
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;
    var isValidId = function(v) { return uuidRe.test(v) || idRe.test(v); };

    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    if (!isValidId(userId)) return e.json(400, { code: "INVALID_INPUT", message: "Invalid userId" });

    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === 'string') { try { body = JSON.parse(rawBody); } catch(pb) { body = {}; } }
    else if (rawBody && typeof rawBody === 'object') { body = rawBody; }
    var lastSyncAt = body.lastSyncAt || 0;
    var changes = body.changes || [];

    var applied = [];
    var rejected = [];

    // ── Push: process each change ──
    for (var ci = 0; ci < changes.length; ci++) {
      var c = changes[ci];
      var entity = c.entity;
      var entityId = c.entityId;
      var operation = c.operation;
      var payload = c.payload;
      var coll = ENTITY_COLL_MAP[entity];
      var idField = ENTITY_ID_FIELD_MAP[entity];
      if (!coll || !idField) { rejected.push({ entity: entity, entityId: entityId, error: "Unknown entity" }); continue; }
      if (!isValidId(entityId)) { rejected.push({ entity: entity, entityId: entityId, error: "Invalid entityId" }); continue; }

      try {
        if (operation === "delete") {
          var delFilter = idField + " = '" + entityId + "' && user_id = '" + userId + "'";
          var delRecs = $app.findRecordsByFilter(coll, delFilter, "", 10);
          for (var dj = 0; dj < delRecs.length; dj++) {
            var curData = delRecs[dj].get("data");
            var curObj = {};
            if (typeof curData === 'string') { try { curObj = JSON.parse(curData); } catch(pe) {} }
            else if (curData && typeof curData === 'object') { for (var ck in curData) curObj[ck] = curData[ck]; }
            curObj.deleted = true;
            curObj.updatedAt = Date.now();
            delRecs[dj].set("data", JSON.stringify(curObj));
            $app.save(delRecs[dj]);
          }
          applied.push({ entity: entity, entityId: entityId, operation: "delete" });
        } else {
          var upFilter = idField + " = '" + entityId + "' && user_id = '" + userId + "'";
          var upRecs = $app.findRecordsByFilter(coll, upFilter, "", 1);
          var rec = upRecs.length > 0 ? upRecs[0] : null;

          // Conflict detection
          if (rec && payload && payload.updatedAt) {
            var rawD = rec.get("data");
            var existD = {};
            if (typeof rawD === 'string') { try { existD = JSON.parse(rawD); } catch(pe) {} }
            else if (rawD && typeof rawD === 'object') { for (var ek in rawD) existD[ek] = rawD[ek]; }
            var srvUpd = existD.updatedAt || 0;
            var srvDel = !!existD.deleted;
            var cliDel = !!payload.deleted;
            var srvWins;
            if (srvDel || cliDel) {
              if (srvUpd > payload.updatedAt) srvWins = true;
              else if (srvUpd < payload.updatedAt) srvWins = false;
              else srvWins = srvDel && !cliDel;
            } else {
              srvWins = srvUpd > payload.updatedAt;
            }
            if (srvWins) {
              var sd = {};
              for (var sdk in existD) sd[sdk] = existD[sdk];
              sd.updatedAt = srvUpd;
              sd.deleted = srvDel;
              rejected.push({ entity: entity, entityId: entityId, error: "conflict", serverData: sd });
              continue;
            }
          }

          if (!rec) {
            var colObj = $app.findCollectionByNameOrId(coll);
            rec = new Record(colObj);
            rec.set(idField, entityId);
            rec.set("user_id", userId);
          }

          // Merge payload
          var existObj = {};
          var rawE = rec.get("data");
          if (typeof rawE === 'string') { try { existObj = JSON.parse(rawE); } catch(pe) {} }
          else if (rawE && typeof rawE === 'object') { for (var mk in rawE) existObj[mk] = rawE[mk]; }
          // Safety: if existing data is corrupted (double-encoded string → numeric keys), reset
          if (Object.keys(existObj).length > 500) {
            console.warn("[sync] Corrupted data blob for " + entity + "/" + entityId + ", resetting");
            existObj = {};
          }

          var merged = {};
          for (var pk in existObj) merged[pk] = existObj[pk];
          for (var ik in payload) {
            if (ik === 'updatedAt' || ik === '_clientTs') continue;
            merged[ik] = payload[ik];
          }
          if (payload._clientTs === undefined) merged._clientTs = payload.updatedAt;
          merged.updatedAt = Date.now();

          rec.set("data", JSON.stringify(merged));
          rec.set("updated_at", new Date().toISOString());
          rec.set("deleted", false);
          $app.save(rec);
          applied.push({ entity: entity, entityId: entityId, operation: "upsert" });
        }
      } catch (recErr) {
        rejected.push({ entity: entity, entityId: entityId, error: recErr.message || String(recErr) });
      }
    }

    // ── Pull: return all records updated since lastSyncAt ──
    var serverData = {};
    var sinceDate = lastSyncAt > 0 ? new Date(lastSyncAt).toISOString() : '1970-01-01T00:00:00.000Z';
    for (var ei = 0; ei < ENTITY_LIST.length; ei++) {
      try {
        var ent = ENTITY_LIST[ei];
        var entColl = ENTITY_COLL_MAP[ent];
        if (!entColl) continue;
        var f = "user_id = '" + userId + "'";
        if (lastSyncAt > 0) f += " && updated > '" + sinceDate + "'";
        var recs = $app.findRecordsByFilter(entColl, f, "-updated", 500);
        var payloads = [];
        for (var ri = 0; ri < recs.length; ri++) {
          try {
            var exported = recs[ri].publicExport();
            var dd = exported.data;
            if (typeof dd === 'string') { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } }
            if (dd && typeof dd === 'object') {
              for (var dk in dd) {
                if (dk === 'id' || dk === 'created' || dk === 'updated' || dk === 'user_id') continue;
                exported[dk] = dd[dk];
              }
              if (dd.id !== undefined) exported.id = dd.id;
              if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt;
              exported.deleted = !!dd.deleted;
            } else { exported.deleted = false; }
            if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime();
            delete exported.data;
            var efKeys = Object.keys(exported);
            for (var efi = 0; efi < efKeys.length; efi++) {
              if (typeof exported[efKeys[efi]] === 'function') delete exported[efKeys[efi]];
            }
            var idFieldPull = ENTITY_ID_FIELD_MAP[ent];
            var hasId = exported.id || exported[idFieldPull] || exported.date || exported.name;
            if (hasId) payloads.push(exported);
          } catch (recErr) { console.error("[sync] record error:", recErr.message || String(recErr)); }
        }
        if (payloads.length > 0) serverData[ent] = payloads;
      } catch (qErr) {}
    }

    return e.json(200, { changes: applied, rejected: rejected, data: serverData, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync] POST error: " + (err.message || String(err)));
    return e.json(500, { code: "INTERNAL_ERROR", message: err.message || "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sync — Incremental pull
// ═══════════════════════════════════════════════════════════════
routerAdd("GET", "/api/sync", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview"];
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;
    var isValidId = function(v) { return uuidRe.test(v) || idRe.test(v); };
    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    if (!isValidId(userId)) return e.json(400, { code: "INVALID_INPUT", message: "Invalid userId" });

    var since = parseInt((info.query || {}).since || "0", 10);
    var sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    var data = {};

    for (var ei = 0; ei < ENTITY_LIST.length; ei++) {
      try {
        var ent = ENTITY_LIST[ei];
        var coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        var f = "user_id = '" + userId + "'";
        if (since > 0) f += " && updated > '" + sinceDate + "'";
        var recs = $app.findRecordsByFilter(coll, f, "-updated", 500);
        var payloads = [];
        for (var ri = 0; ri < recs.length; ri++) {
          try {
            var exported = recs[ri].publicExport();
            var dd = exported.data;
            if (typeof dd === 'string') { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } }
            if (dd && typeof dd === 'object') {
              for (var dk in dd) {
                if (dk === 'id' || dk === 'created' || dk === 'updated' || dk === 'user_id') continue;
                exported[dk] = dd[dk];
              }
              if (dd.id !== undefined) exported.id = dd.id;
              if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt;
              exported.deleted = !!dd.deleted;
            } else { exported.deleted = false; }
            if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime();
            delete exported.data;
            var efKeys = Object.keys(exported);
            for (var efi = 0; efi < efKeys.length; efi++) {
              if (typeof exported[efKeys[efi]] === 'function') delete exported[efKeys[efi]];
            }
            var idF = ENTITY_ID_FIELD_MAP[ent];
            if (exported.id || exported[idF] || exported.date || exported.name) payloads.push(exported);
          } catch (recErr) { console.error("[sync] record error:", recErr.message || String(recErr)); }
        }
        if (payloads.length > 0) data[ent] = payloads;
      } catch (qErr) {}
    }

    return e.json(200, { data: data, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync] GET error: " + (err.message || String(err)));
    return e.json(500, { code: "INTERNAL_ERROR", message: err.message || "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sync/check — Lightweight change detection
// ═══════════════════════════════════════════════════════════════
routerAdd("GET", "/api/sync/check", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
    var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview"];
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;
    var isValidId = function(v) { return uuidRe.test(v) || idRe.test(v); };
    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    if (!isValidId(userId)) return e.json(400, { code: "INVALID_INPUT", message: "Invalid userId" });

    var since = parseInt((info.query || {}).since || "0", 10);
    var sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
    var changed = {};
    var totalChanges = 0;

    for (var ei = 0; ei < ENTITY_LIST.length; ei++) {
      try {
        var ent = ENTITY_LIST[ei];
        var coll = ENTITY_COLL_MAP[ent];
        if (!coll) continue;
        var f = "user_id = '" + userId + "'";
        if (since > 0) f += " && updated > '" + sinceDate + "'";
        var recs = $app.findRecordsByFilter(coll, f, "-updated", 1);
        if (recs.length > 0) { changed[ent] = recs.length; totalChanges++; }
      } catch (qErr) {}
    }

    return e.json(200, { hasChanges: totalChanges > 0, changed: changed, count: totalChanges, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/check] error: " + (err.message || String(err)));
    return e.json(500, { code: "INTERNAL_ERROR", message: err.message || "Internal error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/sync/pull/{entity} — Paginated per-entity pull
// ═══════════════════════════════════════════════════════════════
routerAdd("GET", "/api/sync/pull/{entity}", function(e) {
  try {
    var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
    var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id"};
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;
    var isValidId = function(v) { return uuidRe.test(v) || idRe.test(v); };
    var info = e.requestInfo();
    var userId = info.auth ? info.auth.id : null;
    if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "Unauthorized" });
    if (!isValidId(userId)) return e.json(400, { code: "INVALID_INPUT", message: "Invalid userId" });

    var entity = e.request.pathValue("entity");
    var coll = ENTITY_COLL_MAP[entity];
    if (!coll) return e.json(400, { code: "INVALID_INPUT", message: "Unknown entity: " + entity });

    var query = info.query || {};
    var page = parseInt(query.page || "1", 10);
    var pageSize = parseInt(query.pageSize || "200", 10);
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 1;
    if (pageSize > 500) pageSize = 500;

    var since = parseInt(query.since || "0", 10);
    var f = "user_id = '" + userId + "'";
    if (since > 0) f += " && updated > '" + new Date(since).toISOString() + "'";

    var allRecs = $app.findRecordsByFilter(coll, f, "-updated", page * pageSize);
    var start = (page - 1) * pageSize;
    var pageRecs = allRecs.slice(start, start + pageSize);

    var payloads = [];
    for (var ri = 0; ri < pageRecs.length; ri++) {
      try {
        var exported = pageRecs[ri].publicExport();
        var dd = exported.data;
        if (typeof dd === 'string') { try { dd = JSON.parse(dd); } catch(pe) { dd = null; } }
        if (dd && typeof dd === 'object') {
          for (var dk in dd) {
            if (dk === 'id' || dk === 'created' || dk === 'updated' || dk === 'user_id') continue;
            exported[dk] = dd[dk];
          }
          if (dd.id !== undefined) exported.id = dd.id;
          if (dd.updatedAt !== undefined) exported.updatedAt = dd.updatedAt;
          exported.deleted = !!dd.deleted;
        } else { exported.deleted = false; }
        if (exported.updated_at) exported.updatedAt = new Date(exported.updated_at).getTime();
        delete exported.data;
        var efKeys = Object.keys(exported);
        for (var efi = 0; efi < efKeys.length; efi++) {
          if (typeof exported[efKeys[efi]] === 'function') delete exported[efKeys[efi]];
        }
        var idF = ENTITY_ID_FIELD_MAP[entity];
        if (exported.id || exported[idF] || exported.date || exported.name) payloads.push(exported);
      } catch (recErr) { console.error("[sync] record error:", recErr.message || String(recErr)); }
    }

    return e.json(200, { data: payloads, total: allRecs.length, page: page, pageSize: pageSize, hasMore: pageRecs.length === pageSize, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/pull] error: " + (err.message || String(err)));
    return e.json(500, { code: "INTERNAL_ERROR", message: err.message || "Internal error" });
  }
});
