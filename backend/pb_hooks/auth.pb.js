/// <reference path="../pb_data/types.d.ts" />

// PB v0.38.2: ALL callbacks run in isolated scopes. Helpers must be INSIDE each callback.

// NOTE: login_epoch is set during token refresh (below).
// We intentionally do NOT hook onRecordAuthRequest because
// $app.save() inside auth hooks interferes with PB v0.38.2's auth response
// (token is lost when the hook writes to the DB during auth).

// Token refresh hook: bumps login_epoch and embeds it in the new token
onRecordAuthRefreshRequest(function(e) {
  function escapeFilterValue(v) { if (typeof v !== 'string') return String(v); return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\0/g, ''); }
  try {
    var userId = e.record.id;
    var epoch = (function(userId) {
      try {
        var refreshFilter = "profile_id = 'self' && user_id = '" + escapeFilterValue(userId) + "'";
        var records = $app.findRecordsByFilter("user_profiles", refreshFilter, "", 1);
        if (records.length > 0) {
          var profile = records[0];
          if (!profile) return 0;
          var d = profile.get("data");
          if (typeof d === 'string') { try { d = JSON.parse(d); } catch(pe) { d = null; } }
          var obj = {};
          if (d && typeof d === 'object' && !Array.isArray(d)) { for (var k in d) { obj[k] = d[k]; } }
          var current = obj.login_epoch || 0;
          obj.login_epoch = current + 1;
          profile.set("data", JSON.stringify(obj));
          $app.save(profile);
          return current + 1;
        }
        var collection = $app.findCollectionByNameOrId("user_profiles");
        if (!collection) return 0;
        var record = new Record(collection);
        record.set("profile_id", "self");
        record.set("user_id", userId);
        record.set("data", JSON.stringify({ login_epoch: 1 }));
        $app.save(record);
        return 1;
      } catch (err) { console.error("[auth] readEpoch error: " + (err.message || String(err))); return 0; }
    })(userId);
    if (epoch > 0 && e.token) {
      e.tokenClaims["epoch"] = epoch;
      console.log("[auth] refresh epoch=" + epoch);
    }
  } catch (err) { console.error("[auth] refresh hook error: " + (err.message || String(err))); }
}, "users");
