/// <reference path="../pb_data/types.d.ts" />

// ── Shared constants ──────────────────────────────────────────────
var ENTITY_COLL_MAP = {habit:"habits",reflection:"reflections",fasting:"fasting_sessions",food:"food_entries",checkin:"checkin_records",meditation:"meditation_history",profile:"user_profiles",exercise:"exercise_entries",plan:"plans",planItem:"plan_items",planItemCheckin:"plan_item_checkins",dailyCustomTodo:"daily_custom_todos",dailyTodoHistory:"daily_todo_history",grace:"grace_history",thoughtTrail:"thought_trails",trailNote:"trail_notes",reflectionLink:"reflection_links",aiConfig:"ai_configs",checkinReview:"checkin_reviews"};
var ENTITY_REV_MAP = {}; for (var k in ENTITY_COLL_MAP) ENTITY_REV_MAP[ENTITY_COLL_MAP[k]] = k;
var ENTITY_ID_FIELD_MAP = {habit:"habit_id",reflection:"reflection_id",fasting:"session_id",food:"food_id",checkin:"date",meditation:"date",profile:"profile_id",exercise:"exercise_id",plan:"plan_id",planItem:"plan_item_id",planItemCheckin:"checkin_id",dailyCustomTodo:"todo_id",dailyTodoHistory:"history_id",grace:"date",thoughtTrail:"trail_id",trailNote:"note_id",reflectionLink:"link_id",aiConfig:"config_id",checkinReview:"review_id"};
var ENTITY_LIST = ["habit","reflection","fasting","food","checkin","exercise","meditation","profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo","dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig","checkinReview"];
var PAGE_SIZE = 500;
var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var idRe = /^[a-zA-Z0-9_\-]{1,128}$/;

function isValidId(val) { return uuidRe.test(val) || idRe.test(val); }

function getUserId(e) { var info = e.requestInfo(); return info.auth ? info.auth.id : null; }

function getDataEpoch(rec) {
  var d = rec.get("data");
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e) { d = null; } }
  return (d && d.login_epoch) || 0;
}

// ── Epoch cache (5s TTL, avoids DB read on every request) ────────
var _epochCache = {};
var EPOCH_CACHE_TTL = 5000;

function checkEpoch(info, userId) {
  try {
    var authRec = info.auth;
    var tokenEpoch = (authRec && authRec.epoch !== undefined) ? parseInt(authRec.epoch, 10) || 0 : 0;
    if (tokenEpoch === 0) return false;
    // Check cache first
    var cached = _epochCache[userId];
    if (cached && (Date.now() - cached.ts) < EPOCH_CACHE_TTL) {
      return cached.epoch !== tokenEpoch;
    }
    // Cache miss — query DB
    var epRec = $app.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
    if (epRec.length > 0) {
      var curEpoch = getDataEpoch(epRec[0]);
      _epochCache[userId] = { epoch: curEpoch, ts: Date.now() };
      return curEpoch > 0 && tokenEpoch !== curEpoch;
    }
  } catch (epErr) { /* fail open */ }
  return false;
}

function hasIdentity(exp) {
  return !!(exp.id || exp.date || exp.profileId || exp.profile_id || exp.habitId || exp.habit_id
    || exp.sessionId || exp.session_id || exp.foodId || exp.food_id || exp.exerciseId || exp.exercise_id
    || exp.planId || exp.plan_id || exp.planItemId || exp.plan_item_id || exp.checkinId || exp.checkin_id
    || exp.todoId || exp.todo_id || exp.historyId || exp.history_id || exp.trailId || exp.trail_id
    || exp.noteId || exp.note_id || exp.linkId || exp.link_id || exp.configId || exp.config_id
    || exp.reviewId || exp.review_id || exp.name);
}

function recordToPayload(r) {
  var exported = r.publicExport();
  var d = exported.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch(pe) { d = null; } }
  if (d && typeof d === 'object') {
    var ks = Object.keys(d);
    for (var k = 0; k < ks.length; k++) {
      if (ks[k] === 'id' || ks[k] === 'created' || ks[k] === 'updated' || ks[k] === 'user_id') continue;
      exported[ks[k]] = d[ks[k]];
    }
    if (d.id !== undefined) exported.id = d.id;
    if (d.updatedAt !== undefined) exported.updatedAt = d.updatedAt;
    exported.deleted = !!d.deleted;
  } else { exported.deleted = false; }
  delete exported.data;
  var eKeys = Object.keys(exported);
  for (var ek = 0; ek < eKeys.length; ek++) {
    if (typeof exported[eKeys[ek]] === 'function') delete exported[eKeys[ek]];
  }
  return exported;
}

function pullAll(entity, userId, since) {
  var coll = ENTITY_COLL_MAP[entity];
  if (!coll) return [];
  var sinceDate = since > 0 ? new Date(since).toISOString() : '1970-01-01T00:00:00.000Z';
  var f = "user_id = '" + userId + "'";
  if (since > 0) f += " && updated > '" + sinceDate + "'";
  var result = [];
  var page = 1;
  while (true) {
    var batch;
    try {
      batch = $app.dao().findRecordsByFilter(coll, f, "-updated", PAGE_SIZE, (page - 1) * PAGE_SIZE);
    } catch (fbErr) {
      // Fallback for PB versions without offset param: use older limit-based approach
      // Limit to 2000 records max to avoid OOM
      var capped = $app.findRecordsByFilter(coll, f, "-updated", 2000);
      var pageStart = (page - 1) * PAGE_SIZE;
      if (!capped || pageStart >= capped.length) break;
      batch = capped.slice(pageStart, pageStart + PAGE_SIZE);
    }
    if (!batch || batch.length === 0) break;
    for (var i = 0; i < batch.length; i++) {
      try { var payload = recordToPayload(batch[i]); if (hasIdentity(payload)) result.push(payload); } catch (recErr) { console.error("[sync] record flatten error:", recErr.message || String(recErr)); }
    }
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  return result;
}

function buildServerData(record) {
  try { return recordToPayload(record); } catch(exportErr) { return {}; }
}

function mergePayload(existing, incoming) {
  var merged = (existing && typeof existing === 'object') ? JSON.parse(JSON.stringify(existing)) : {};
  for (var k in incoming) {
    if (k === 'updatedAt' || k === '_clientTs') continue;
    merged[k] = incoming[k];
  }
  if (incoming && incoming._clientTs !== undefined) merged._clientTs = incoming._clientTs;
  merged.updatedAt = Date.now();
  return merged;
}

// ── CDC: Batch-write to sync_cdc table ─────────────────────────
var CDC_COLLECTION = "sync_cdc";

function ensureCdcCollection() {
  try { $app.findCollectionByNameOrId(CDC_COLLECTION); } catch (e) {
    var col = new Collection({ name: CDC_COLLECTION, schema: [
      { name: "user_id", type: "text", required: true },
      { name: "collection", type: "text", required: true },
      { name: "entity", type: "text", required: true },
      { name: "entity_id", type: "text", required: true },
      { name: "record_id", type: "text", required: true },
      { name: "operation", type: "text", required: true },
      { name: "timestamp", type: "number", required: true },
    ]});
    $app.dao().saveCollection(col);
  }
}

// CDC buffer: accumulate entries and flush in batch
var _cdcBuffer = [];
var _cdcFlushTimer = null;
var CDC_FLUSH_LIMIT = 50;
var CDC_FLUSH_INTERVAL = 500;

function flushCdcBuffer() {
  if (_cdcFlushTimer) { clearTimeout(_cdcFlushTimer); _cdcFlushTimer = null; }
  var buffer = _cdcBuffer;
  _cdcBuffer = [];
  if (buffer.length === 0) return;
  try {
    ensureCdcCollection();
    $app.runInTransaction(function(txApp) {
      var col = txApp.findCollectionByNameOrId(CDC_COLLECTION);
      for (var i = 0; i < buffer.length; i++) {
        var entry = buffer[i];
        var rec = new Record(col);
        rec.set("user_id", entry.user_id);
        rec.set("collection", entry.collection);
        rec.set("entity", entry.entity);
        rec.set("entity_id", entry.entity_id);
        rec.set("record_id", entry.record_id);
        rec.set("operation", entry.operation);
        rec.set("timestamp", entry.timestamp);
        txApp.save(rec);
      }
    });
  } catch (nr) {}
}

function logCdc(collection, record, operation) {
  try {
    var userId = record.getString("user_id");
    if (!userId) return;
    var entity = ENTITY_REV_MAP[collection] || collection;
    var entityId = null;
    var idField = ENTITY_ID_FIELD_MAP[entity];
    if (idField) {
      var d = record.get("data");
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e) { d = null; } }
      entityId = (d && d[idField]) || record.id;
    } else { entityId = record.id; }

    _cdcBuffer.push({
      user_id: userId, collection: collection, entity: entity,
      entity_id: String(entityId), record_id: record.id,
      operation: operation, timestamp: Date.now(),
    });

    // Flush immediately if buffer is full, otherwise schedule
    if (_cdcBuffer.length >= CDC_FLUSH_LIMIT) {
      flushCdcBuffer();
    } else if (!_cdcFlushTimer) {
      _cdcFlushTimer = setTimeout(flushCdcBuffer, CDC_FLUSH_INTERVAL);
    }
  } catch (nr) {}
}

// ── Auth guard ────────────────────────────────────────────────
function requireAuth(e) {
  var userId = getUserId(e);
  if (!userId) return e.json(401, { code: "UNAUTHORIZED", message: "请先登录" });
  if (!isValidId(userId)) return e.json(400, { code: "INVALID_INPUT", message: "Invalid userId format" });
  var info = e.requestInfo();
  if (checkEpoch(info, userId)) return e.json(401, { code: "KICKED_OUT", message: "您的账号已在其他设备登录" });
  return userId;
}

// ── Bulk push processing (batch DB preload, single transaction) ──
function processChangesBulk(changes, userId, tokenEpoch) {
  // 1. Collect changes by collection for batch preload
  var byColl = {}; // coll -> [{entity, entityId, operation, payload, idField, changedFields}]
  for (var i = 0; i < changes.length; i++) {
    var c = changes[i];
    var coll = ENTITY_COLL_MAP[c.entity];
    var idField = ENTITY_ID_FIELD_MAP[c.entity];
    if (!coll || !idField) continue;
    if (!isValidId(c.entityId)) continue;
    if (!byColl[coll]) byColl[coll] = [];
    byColl[coll].push({ entity: c.entity, entityId: c.entityId, operation: c.operation, payload: c.payload, idField: idField, changedFields: c.changedFields });
  }

  // 2. Pre-load existing records per collection (one query per collection vs one per change)
  var existingCache = {}; // "coll:id" -> Record
  for (var coll in byColl) {
    var items = byColl[coll];
    var idField = items[0].idField;
    var ids = items.map(function(it) { return "'" + it.entityId + "'"; }).join(',');
    var recs = $app.findRecordsByFilter(coll, idField + " IN (" + ids + ") && user_id = '" + userId + "'", "", 0);
    for (var j = 0; j < recs.length; j++) {
      var rec = recs[j];
      var d = rec.get("data");
      var dataObj = (typeof d === 'string' ? JSON.parse(d) : (d || {}));
      var eid = dataObj[idField] || rec.id;
      existingCache[coll + ':' + eid] = rec;
    }
  }

  // 3. Single transaction for all changes
  var applied = [];
  var rejected = [];

  $app.runInTransaction(function(txApp) {
    // Check epoch once at the start
    if (tokenEpoch > 0) {
      try {
        var epRecs = txApp.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
        if (epRecs.length > 0) { var curEp = getDataEpoch(epRecs[0]); if (curEp > 0 && tokenEpoch !== curEp) { /* session expired — reject all */ for (var xi = 0; xi < changes.length; xi++) { rejected.push({ entity: changes[xi].entity, entityId: changes[xi].entityId, error: "session_expired" }); } return; } }
      } catch (epErr) {}
    }

    for (var coll in byColl) {
      var items = byColl[coll];
      var colObj = txApp.findCollectionByNameOrId(coll);

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var entity = item.entity;
        var entityId = item.entityId;
        var operation = item.operation;
        var payload = item.payload;
        var idField = item.idField;
        var changedFields = item.changedFields;

        var cacheKey = coll + ':' + entityId;
        var existingRec = existingCache[cacheKey];
        var pbRec = existingRec || null;

        if (operation === "delete") {
          var delRecs = [];
          if (pbRec) delRecs = [pbRec];
          else {
            var delFilter = idField + " = '" + entityId + "' && user_id = '" + userId + "'";
            delRecs = txApp.findRecordsByFilter(coll, delFilter, "", 10);
          }
          for (var j = 0; j < delRecs.length; j++) {
            var curData = delRecs[j].get("data"); var curObj = (typeof curData === 'string' ? JSON.parse(curData) : (curData || {}));
            curObj.deleted = true; curObj.updatedAt = Date.now();
            delRecs[j].set("data", curObj);
            txApp.save(delRecs[j]);
          }
          applied.push({ entity: entity, entityId: entityId, operation: operation });
        } else {
          if (pbRec) {
            if (payload && payload.updatedAt) {
              var existingData = typeof pbRec.get("data") === 'string' ? JSON.parse(pbRec.get("data")) : (pbRec.get("data") || {});
              var serverUpdatedAt = existingData.updatedAt || 0;
              var serverWins = (existingData.deleted || payload.deleted)
                ? (serverUpdatedAt > payload.updatedAt || (serverUpdatedAt === payload.updatedAt && existingData.deleted && !payload.deleted))
                : serverUpdatedAt >= payload.updatedAt;
              if (serverWins) {
                rejected.push({ entity: entity, entityId: entityId, error: "conflict", serverData: buildServerData(pbRec) });
                continue;
              }
            }
          } else {
            pbRec = new Record(colObj);
            pbRec.set(idField, entityId); pbRec.set("user_id", userId);
          }
          var existingObj = typeof pbRec.get("data") === 'string' ? JSON.parse(pbRec.get("data")) : (pbRec.get("data") || {});
          if (payload && payload._clientTs === undefined) payload._clientTs = payload.updatedAt;

          // Field-level merge: only apply changedFields if provided
          if (changedFields && Array.isArray(changedFields) && changedFields.length > 0 && existingObj && typeof existingObj === 'object') {
            for (var fi = 0; fi < changedFields.length; fi++) {
              var fk = changedFields[fi];
              if (fk === 'updatedAt' || fk === '_clientTs') continue;
              existingObj[fk] = payload[fk];
            }
            existingObj.updatedAt = Date.now();
            pbRec.set("data", existingObj);
          } else {
            pbRec.set("data", mergePayload(existingObj, payload));
          }
          txApp.save(pbRec);
          applied.push({ entity: entity, entityId: entityId, operation: operation });
        }
      }
    }
  });

  return { applied: applied, rejected: rejected };
}

// ── POST /api/sync/push ────────────────────────────────────────────
routerAdd("POST", "/api/sync/push", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var info = e.requestInfo();
    var tokenEpoch = (info.auth && info.auth.epoch !== undefined) ? parseInt(info.auth.epoch, 10) || 0 : 0;
    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === 'string') { try { body = JSON.parse(rawBody); } catch (pb) { body = {}; } }
    else if (rawBody && typeof rawBody === 'object') { body = rawBody; }
    var changes = body.changes || [];

    var result = processChangesBulk(changes, userId, tokenEpoch);

    return e.json(200, { applied: result.applied, rejected: result.rejected, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/push] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── POST /api/sync/pull ────────────────────────────────────────────
routerAdd("POST", "/api/sync/pull", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var info = e.requestInfo();
    var rawBody = info.body;
    var body = {};
    if (typeof rawBody === 'string') { try { body = JSON.parse(rawBody); } catch (pb) { body = {}; } }
    else if (rawBody && typeof rawBody === 'object') { body = rawBody; }
    var entities = body.entities || ENTITY_LIST;
    var since = parseInt(body.since || (info.query || {}).since || "0", 10);
    var data = {};
    for (var i = 0; i < entities.length; i++) {
      try {
        var records = pullAll(entities[i], userId, since);
        if (records.length > 0) data[entities[i]] = records;
      } catch (qErr) { console.error("[sync/pull] failed for", entities[i] + ":", qErr.message || String(qErr)); }
    }
    return e.json(200, { data: data, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/pull] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── GET /api/sync (backward compat) ──────────────────────────────
routerAdd("GET", "/api/sync", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var since = parseInt((e.requestInfo().query || {}).since || "0", 10);
    var data = {};
    for (var i = 0; i < ENTITY_LIST.length; i++) {
      try { var records = pullAll(ENTITY_LIST[i], userId, since); if (records.length > 0) data[ENTITY_LIST[i]] = records; } catch (qErr) { console.error("[sync] pull failed for", ENTITY_LIST[i] + ":", qErr.message || String(qErr)); }
    }
    return e.json(200, { data: data, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync] GET error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── POST /api/realtime/ping — SSE heartbeat check ─────────────────
routerAdd("POST", "/api/realtime/ping", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    return e.json(204, null);
  } catch (err) {
    return e.json(401, { code: "UNAUTHORIZED", message: "请先登录" });
  }
});

// ── GET /api/sync/check — CDC-based (faster than per-collection scan) ──
routerAdd("GET", "/api/sync/check", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var since = parseInt((e.requestInfo().query || {}).since || "0", 10);
    var changed = {};

    // Prefer CDC table for fast check (single query vs 19 queries)
    try {
      $app.findCollectionByNameOrId(CDC_COLLECTION);
      var cdcFilter = "user_id = '" + userId + "' && timestamp > " + since;
      var cdcEntries = $app.findRecordsByFilter(CDC_COLLECTION, cdcFilter, "", 0);
      for (var ci = 0; ci < cdcEntries.length; ci++) {
        try {
          var ent = cdcEntries[ci].getString("entity");
          changed[ent] = (changed[ent] || 0) + 1;
        } catch(ce) {}
      }
    } catch (ce) {
      // CDC collection doesn't exist — fallback to per-collection scan
      for (var i = 0; i < ENTITY_LIST.length; i++) {
        try {
          var coll = ENTITY_COLL_MAP[ENTITY_LIST[i]]; if (!coll) continue;
          var sinceDate = new Date(since).toISOString();
          var n = $app.findRecordsByFilter(coll, "user_id = '" + userId + "' && updated > '" + sinceDate + "'", "", 1).length;
          if (n > 0) changed[ENTITY_LIST[i]] = n;
        } catch (e2) { console.error("[sync/check] failed for", ENTITY_LIST[i] + ":", e2.message || String(e2)); }
      }
    }

    return e.json(200, { hasChanges: Object.keys(changed).length > 0, changed: changed, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/check] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── GET /api/sync/pull/:entity ────────────────────────────────────
routerAdd("GET", "/api/sync/pull/{entity}", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var entity = e.request.pathValue("entity");
    if (!ENTITY_COLL_MAP[entity]) return e.json(400, { code: "INVALID_INPUT", message: "Unknown entity: " + entity });
    var query = e.requestInfo().query || {};
    var page = parseInt(query.page || "1", 10); if (page < 1) page = 1;
    var pageSize = parseInt(query.pageSize || "200", 10); if (pageSize < 1) pageSize = 1; if (pageSize > 500) pageSize = 500;
    var collection = ENTITY_COLL_MAP[entity];
    var offset = (page - 1) * pageSize;
    var allRecords = $app.findRecordsByFilter(collection, "user_id = '" + userId + "'", "-updated", 0);
    var total = allRecords ? allRecords.length : 0;
    var data = [];
    if (total > offset) {
      var pageRecords = allRecords.slice(offset, offset + pageSize);
      for (var i = 0; i < pageRecords.length; i++) {
        try { var payload = recordToPayload(pageRecords[i]); if (hasIdentity(payload)) data.push(payload); } catch (recErr) { console.error("[sync/pull] record flatten error:", recErr.message || String(recErr)); }
      }
    }
    return e.json(200, { data: data, total: total, page: page, pageSize: pageSize, hasMore: (offset + pageSize) < total, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/pull] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── GET /api/sync/reconcile ──────────────────────────────────────
routerAdd("GET", "/api/sync/reconcile", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var snapshot = {};
    for (var i = 0; i < ENTITY_LIST.length; i++) {
      try {
        var coll = ENTITY_COLL_MAP[ENTITY_LIST[i]];
        var allRecs = $app.findRecordsByFilter(coll, "user_id = '" + userId + "'", "-updated", 0);
        var total = allRecs ? allRecs.length : 0;
        var latestUpdatedAt = 0;
        if (total > 0 && allRecs[0]) { var recUpdated = allRecs[0].get("updated"); if (recUpdated) latestUpdatedAt = new Date(recUpdated).getTime(); }
        snapshot[ENTITY_LIST[i]] = { total: total, latestUpdatedAt: latestUpdatedAt };
      } catch (qErr) { snapshot[ENTITY_LIST[i]] = { total: 0, latestUpdatedAt: 0 }; }
    }
    return e.json(200, { snapshot: snapshot, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/reconcile] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── GET /api/sync/cdc — Pull CDC entries for a user ──────────
routerAdd("GET", "/api/sync/cdc", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var query = e.requestInfo().query || {};
    var since = parseInt(query.since || "0", 10);
    var filter = "user_id = '" + userId + "'";
    if (since > 0) filter += " && timestamp > " + since;
    var cdcCol;
    try { cdcCol = $app.findCollectionByNameOrId(CDC_COLLECTION); } catch (ce) { return e.json(200, { entries: [], serverTime: Date.now() }); }
    var entries = $app.findRecordsByFilter(CDC_COLLECTION, filter, "-timestamp", 200);
    var result = [];
    for (var i = 0; i < entries.length; i++) {
      try {
        var e = entries[i]; result.push({
          id: e.id, collection: e.getString("collection"), entity: e.getString("entity"),
          entityId: e.getString("entity_id"), operation: e.getString("operation"),
          timestamp: e.get("timestamp"),
        });
      } catch (ce2) {}
    }
    return e.json(200, { entries: result, serverTime: Date.now() });
  } catch (err) {
    console.error("[sync/cdc] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── POST /api/sync/cdc/cleanup — Remove old CDC entries ─────────
routerAdd("POST", "/api/sync/cdc/cleanup", function(e) {
  try {
    var userId = requireAuth(e);
    if (typeof userId === 'object') return userId;
    var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    try { $app.findCollectionByNameOrId(CDC_COLLECTION); } catch (ce) { return e.json(200, { removed: 0 }); }
    var old = $app.findRecordsByFilter(CDC_COLLECTION, "user_id = '" + userId + "' && timestamp < " + cutoff, "", 0);
    var count = old ? old.length : 0;
    for (var i = 0; i < count; i++) { try { $app.dao().deleteRecord(old[i]); } catch(de) {} }
    return e.json(200, { removed: count });
  } catch (err) {
    console.error("[sync/cdc/cleanup] error:", err.message || String(err));
    return e.json(500, { code: "INTERNAL_ERROR", message: "服务器内部错误" });
  }
});

// ── Automated CDC cleanup (runs every hour) ─────────────────────
function cleanupOldCdcEntries() {
  try {
    var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    try { $app.findCollectionByNameOrId(CDC_COLLECTION); } catch (ce) { return; }
    var oldRecords = $app.dao().findRecordsByFilter(CDC_COLLECTION, "timestamp < " + cutoff, "", 200);
    var removed = 0;
    while (oldRecords && oldRecords.length > 0) {
      for (var i = 0; i < oldRecords.length; i++) { try { $app.dao().deleteRecord(oldRecords[i]); removed++; } catch(de) {} }
      if (oldRecords.length < 200) break;
      oldRecords = $app.dao().findRecordsByFilter(CDC_COLLECTION, "timestamp < " + cutoff, "", 200);
    }
    if (removed > 0) console.log("[sync/cdc] Cleaned up " + removed + " old CDC entries");
  } catch (nr) {}
}

// Run CDC cleanup every hour
$app.cron().add("cdc-cleanup", "0 * * * *", function() {
  console.log("[sync/cdc] Running hourly cleanup...");
  cleanupOldCdcEntries();
});

// ── SSE batch notification merging ──────────────────────────────
var _sseBatchBuffer = {};
var _sseBatchTimer = null;
var SSE_BATCH_INTERVAL = 50;

function flushSseBatch() {
  var buffer = _sseBatchBuffer;
  _sseBatchBuffer = {};
  _sseBatchTimer = null;
  for (var userId in buffer) {
    try {
      var items = buffer[userId];
      if (items.length === 1) {
        var single = items[0];
        $app.realtime().broadcast(userId, single.eventType, { entity: single.entity, collection: single.collection, recordId: single.recordId, payload: single.payload });
      } else if (items.length > 1) {
        $app.realtime().broadcast(userId, "sync_batch", { items: items });
      }
    } catch (nr) {}
  }
}

function broadcastChange(collection, record, eventType) {
  try {
    var userId = record.getString("user_id");
    if (!userId) return;
    var entity = ENTITY_REV_MAP[collection] || collection;
    var payload = recordToPayload(record);

    // Buffer into batch (single events also go through buffer for ordering)
    if (!_sseBatchBuffer[userId]) _sseBatchBuffer[userId] = [];
    _sseBatchBuffer[userId].push({ eventType: eventType, entity: entity, collection: collection, recordId: record.id, payload: payload });

    if (!_sseBatchTimer) _sseBatchTimer = setTimeout(flushSseBatch, SSE_BATCH_INTERVAL);

    logCdc(collection, record, eventType === "record_created" ? "upsert" : eventType === "record_updated" ? "upsert" : "delete");
  } catch (nr) {}
}

var COLLECTION_NAMES = Object.keys(ENTITY_COLL_MAP).map(function(k) { return ENTITY_COLL_MAP[k]; });

onRecordAfterCreateSuccess(function(e) { broadcastChange(e.collection.name, e.record, "record_created"); e.next(); }, ...COLLECTION_NAMES);
onRecordAfterUpdateSuccess(function(e) { broadcastChange(e.collection.name, e.record, "record_updated"); e.next(); }, ...COLLECTION_NAMES);
onRecordAfterDeleteSuccess(function(e) { broadcastChange(e.collection.name, e.record, "record_deleted"); e.next(); }, ...COLLECTION_NAMES);
