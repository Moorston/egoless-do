// ─── Init + One-time Migration ───────────────────────────────────
// PB 0.38.2 JS API 不支持从 hook 创建 collection（DynamicModel 不可用）。
// 请使用以下方式创建 collection：
//
// 方式 A: 运行 .\backend\create-collection.ps1
// 方式 B: Admin UI → Collections → New collection → 从 pb_schema.json 复制字段定义

// ─── P0-4 Migration: backfill body_plans.type ───────────────────
// One-time migration: existing body_plans records (created before P0-4)
// lack the 'type' field. Infer from data shape and write back.
// Idempotent: skips records that already have type set.
(function migrateBodyPlanType() {
  try {
    var markerPath = require("path").join(__dirname, ".migration-body-plan-type-done");
    var fs = require("fs");
    if (fs.existsSync(markerPath)) {
      console.log("[Init] P0-4 bodyPlan type migration already applied, skipping.");
      return;
    }

    console.log("[Init] Running P0-4 bodyPlan type migration...");
    var collection = $app.findCollectionByNameOrId("body_plans");
    if (!collection) {
      console.log("[Init] body_plans collection not found, skipping migration.");
      return;
    }

    var migrated = 0;
    var skipped = 0;
    var errors = 0;
    var BATCH = 500;
    var offset = 0;

    while (true) {
      try {
        var records = $app.findRecordsByFilter("body_plans", "", "-created", BATCH, offset);
        if (!records || records.length === 0) break;

        for (var i = 0; i < records.length; i++) {
          try {
            var rec = records[i];
            var raw = rec.get("data");
            var data = {};
            if (typeof raw === 'string') { try { data = JSON.parse(raw); } catch (e) { data = {}; } }
            else if (raw && typeof raw === 'object') { for (var k in raw) data[k] = raw[k]; }

            // Skip if type already set
            if (data.type === 'weekly' || data.type === 'training') {
              skipped++;
              continue;
            }

            // Infer type from data shape
            var inferredType = (data.weekday !== undefined || data.part !== undefined) ? 'weekly' : 'training';
            data.type = inferredType;
            rec.set("data", JSON.stringify(data));
            $app.save(rec);
            migrated++;
          } catch (recErr) {
            errors++;
            console.warn("[Init] Migration error for record " + (rec ? rec.id : '?') + ": " + (recErr.message || String(recErr)));
          }
        }

        if (records.length < BATCH) break;
        offset += BATCH;
        if (offset > 50000) { console.warn("[Init] Migration hit 50000 cap, stopping."); break; }
      } catch (batchErr) {
        console.error("[Init] Migration batch error: " + (batchErr.message || String(batchErr)));
        break;
      }
    }

    console.log("[Init] P0-4 migration complete: " + migrated + " migrated, " + skipped + " skipped, " + errors + " errors.");

    // Write marker file to prevent re-run
    try { fs.writeFileSync(markerPath, new Date().toISOString()); } catch (e) {
      console.warn("[Init] Could not write migration marker: " + (e.message || String(e)));
    }
  } catch (err) {
    console.error("[Init] P0-4 migration failed: " + (err.message || String(err)));
  }
})();

console.log("[Init] Init hook loaded.");
