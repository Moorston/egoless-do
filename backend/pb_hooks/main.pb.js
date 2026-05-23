// ─── PocketBase server-side JS hooks ─────────────────────────────
// Runs inside PocketBase's embedded goja runtime.
// Docs: https://pocketbase.io/docs/js-overview/

/** Blur GPS coords ±500 m before storing map_pins */
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const R = 0.0045; // ~500m at equator
  record.set("lat", record.get("lat") + (Math.random() - 0.5) * R);
  record.set("lng", record.get("lng") + (Math.random() - 0.5) * R);
}, "map_pins");

/** Strip PII from published_minds: replace author info with anon_id */
onRecordBeforeCreateRequest((e) => {
  const record = e.record;
  const authId = e.httpContext.get("authRecord")?.get("id") ?? "";
  // Deterministic anon hash from auth ID
  const anon = $security.md5(authId).slice(0, 8);
  record.set("anon_id", anon);
}, "published_minds");

/** Auto-delete map_pins older than 7 days (keep map fresh) */
cronAdd("cleanup_old_pins", "0 3 * * *", () => {
  const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const records = $app.dao().findRecordsByFilter(
    "map_pins", `pinned_at < "${cutoff}"`, "-pinned_at", 1000, 0
  );
  records.forEach(r => $app.dao().deleteRecord(r));
  console.log(`[Cleanup] Deleted ${records.length} old map pins`);
});

/** Health check endpoint */
routerAdd("GET", "/api/health", (c) => {
  return c.json(200, { status: "ok", ts: new Date().toISOString() });
});
