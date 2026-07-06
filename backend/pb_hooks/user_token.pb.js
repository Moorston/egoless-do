/// <reference path="../pb_data/types.d.ts" />

// ─── POST /api/auth/user-token ───────────────────────────────────
// Internal endpoint: generates a user-scoped PB auth token.
// Called by the auth API (refresh.ts) instead of returning admin tokens.
//
// Security: Validates X-Internal-Secret header matches PB_ENCRYPTION_KEY.
// Only accessible from the auth API server, not from external clients.

routerAdd("POST", "/api/auth/user-token", function(e) {
  try {
    // 1. Verify internal secret
    var secret = e.request.header.get("X-Internal-Secret");
    var expected = $os.getenv("PB_ENCRYPTION_KEY") || "";
    if (!secret || secret !== expected) {
      return e.json(403, { "error": "forbidden" });
    }

    // 2. Parse user ID from request body
    var data = {};
    try {
      var reader = e.request.body;
      var body = reader ? reader.toString() : "{}";
      data = JSON.parse(body || "{}");
    } catch (parseErr) {
      return e.json(400, { "error": "invalid request body" });
    }

    var userId = data.userId;
    if (!userId || typeof userId !== "string") {
      return e.json(400, { "error": "missing userId" });
    }

    // 3. Load user record
    var record;
    try {
      record = $app.findRecordById("users", userId);
    } catch (findErr) {
      return e.json(404, { "error": "user not found" });
    }

    // 4. Generate user-scoped auth token via PB's internal auth
    var token;
    try {
      token = record.newToken();
    } catch (tokenErr) {
      console.error("[user-token] newToken failed: " + (tokenErr.message || String(tokenErr)));
      return e.json(500, { "error": "token generation failed" });
    }

    // 5. Also bump login_epoch (same as auth refresh hook)
    try {
      var escapeFilterValue = function(v) {
        if (typeof v !== "string") return String(v);
        return v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      };
      var filter = "profile_id = 'self' && user_id = '" + escapeFilterValue(userId) + "'";
      var profiles = $app.findRecordsByFilter("user_profiles", filter, "", 1);
      if (profiles.length > 0) {
        var profile = profiles[0];
        var d = profile.get("data");
        if (typeof d === "string") { try { d = JSON.parse(d); } catch(pe) { d = null; } }
        var obj = {};
        if (d && typeof d === "object" && !Array.isArray(d)) { for (var k in d) { obj[k] = d[k]; } }
        var current = obj.login_epoch || 0;
        obj.login_epoch = current + 1;
        profile.set("data", JSON.stringify(obj));
        $app.save(profile);
      }
    } catch (epochErr) {
      // Non-fatal: token generation succeeded, epoch bump is best-effort
      console.error("[user-token] epoch bump failed: " + (epochErr.message || String(epochErr)));
    }

    return e.json(200, { "token": token });
  } catch (err) {
    console.error("[user-token] unexpected error: " + (err.message || String(err)));
    return e.json(500, { "error": "internal error" });
  }
});
