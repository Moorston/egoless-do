/// <reference path="../pb_data/types.d.ts" />

// ── Single-device login: embed login_epoch in JWT ─────────────────
// login_epoch is stored inside the `data` JSON blob of user_profiles
// (no top-level field exists in the PB schema).
// sync.pb.js will reject requests whose token epoch doesn't match.

globalThis._getEpochFromData = function(rec) {
  var d = rec.get("data");
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e) { d = null; } }
  return (d && d.login_epoch) || 0;
};

globalThis._setEpochInData = function(rec, epoch) {
  var d = rec.get("data");
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};
  d.login_epoch = epoch;
  rec.set("data", d);
};

// ── Password auth hook (users only, NOT superusers) ───────────────
onRecordAuthWithPasswordRequest(function(e) {
  try {
    var userId = e.record.id;
    var epoch = (function(userId) {
      try {
        var records = $app.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
        if (records.length > 0) {
          var profile = records[0];
          var current = globalThis._getEpochFromData(profile);
          globalThis._setEpochInData(profile, current + 1);
          $app.save(profile);
          return current + 1;
        }
        var collection = $app.findCollectionByNameOrId("user_profiles");
        var record = new Record(collection);
        record.set("profile_id", "self");
        record.set("user_id", userId);
        record.set("data", JSON.stringify({ login_epoch: 1 }));
        $app.save(record);
        return 1;
      } catch (err) {
        console.error("[auth] incrementLoginEpoch error: " + (err.message || String(err)));
        return 0;
      }
    })(userId);
    if (epoch > 0 && e.token) {
      e.tokenClaims["epoch"] = epoch;
      console.log("[auth] login epoch=" + epoch + " userId=" + userId);
    }
  } catch (err) {
    console.error("[auth] password hook error: " + (err.message || String(err)));
  }
}, "users");

// ── Token refresh hook ────────────────────────────────────────────
// Does NOT bump login_epoch — only password login does.
// Embeds the current DB epoch into the new token so concurrent syncs
// using old tokens are NOT invalidated.
onRecordAuthRefreshRequest(function(e) {
  try {
    var userId = e.record.id;
    var epoch = (function(userId) {
      try {
        var records = $app.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
        if (records.length > 0) {
          return globalThis._getEpochFromData(records[0]);
        }
        return 0;
      } catch (err) {
        console.error("[auth] readEpoch error: " + (err.message || String(err)));
        return 0;
      }
    })(userId);
    if (epoch > 0 && e.token) {
      e.tokenClaims["epoch"] = epoch;
      console.log("[auth] refresh epoch=" + epoch + " userId=" + userId);
    }
  } catch (err) {
    console.error("[auth] refresh hook error: " + (err.message || String(err)));
  }
}, "users");
