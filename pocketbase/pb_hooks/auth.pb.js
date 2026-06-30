/// <reference path="../pb_data/types.d.ts" />

// ── Single-device login: embed login_epoch in JWT ─────────────────

// ── After password login: set epoch in user_profiles ──────────────
// We use afterAuthRequest (not before) to avoid $app.save() breaking PB's auth flow.
// The epoch is written to the profile so the next refresh can read and embed it.
onRecordAuthWithPasswordRequest(function(e) {
  try {
    var userId = e.record.id;
    var collection = $app.findCollectionByNameOrId("user_profiles");
    if (!collection) return;
    var records = $app.findRecordsByFilter("user_profiles", "profile_id = 'self' && user_id = '" + userId + "'", "", 1);
    if (records.length > 0) {
      var profile = records[0];
      var d = profile.get("data");
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch(pe) { d = null; } }
      var obj = {};
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        for (var k in d) { obj[k] = d[k]; }
      }
      obj.login_epoch = (obj.login_epoch || 0) + 1;
      profile.set("data", JSON.stringify(obj));
      $app.save(profile);
    } else {
      var record = new Record(collection);
      record.set("profile_id", "self");
      record.set("user_id", userId);
      record.set("data", JSON.stringify({ login_epoch: 1 }));
      $app.save(record);
    }
  } catch (err) {
    console.error("[auth] afterLogin epoch error: " + (err.message || String(err)));
  }
}, "users");

// ── Token refresh hook ────────────────────────────────────────────
// Bumps login_epoch and embeds it in the new token.
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
          var obj = {};
          if (d && typeof d === 'object' && !Array.isArray(d)) {
            for (var k in d) { obj[k] = d[k]; }
          }
          var current = obj.login_epoch || 0;
          // Bump epoch on each refresh (effectively on each app session)
          obj.login_epoch = current + 1;
          profile.set("data", JSON.stringify(obj));
          $app.save(profile);
          return current + 1;
        }
        // No profile yet — create one with epoch=1
        var collection = $app.findCollectionByNameOrId("user_profiles");
        if (!collection) return 0;
        var record = new Record(collection);
        record.set("profile_id", "self");
        record.set("user_id", userId);
        record.set("data", JSON.stringify({ login_epoch: 1 }));
        $app.save(record);
        return 1;
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
