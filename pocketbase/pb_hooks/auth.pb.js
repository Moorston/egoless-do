/// <reference path="../pb_data/types.d.ts" />

// ── Single-device login: embed login_epoch in JWT ─────────────────
// login_epoch is stored inside the `data` JSON blob of user_profiles
// (no top-level field exists in the PB schema).
// sync.pb.js will reject requests whose token epoch doesn't match.

// ── Password auth hook (users only, NOT superusers) ───────────────
onRecordAuthWithPasswordRequest(function(e) {
  try {
    var userId = e.record.id;
    var epoch = (function(userId) {
      try {
        var records = $app.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
        if (records.length > 0) {
          var profile = records[0];
          if (!profile) return 0;
          var d = profile.get("data");
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch(pe) { d = null; } }
          // Always create a fresh JS object — Go slices/maps can't be mutated
          var obj = {};
          if (d && typeof d === 'object' && !Array.isArray(d)) {
            for (var k in d) { obj[k] = d[k]; }
          }
          var current = obj.login_epoch || 0;
          obj.login_epoch = current + 1;
          profile.set("data", JSON.stringify(obj));
          $app.save(profile);
          return current + 1;
        }
        var collection = $app.findCollectionByNameOrId("user_profiles");
        if (!collection) {
          console.error("[auth] user_profiles collection not found");
          return 0;
        }
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
          var profile = records[0];
          if (!profile) return 0;
          var d = profile.get("data");
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch(pe) { d = null; } }
          return (d && d.login_epoch) || 0;
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
