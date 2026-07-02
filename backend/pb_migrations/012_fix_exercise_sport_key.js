// ─── PocketBase migration: fix empty sport_key in exercise_entries ───
// This migration scans all exercise_entries records and fixes those
// with empty or missing sport_key in the JSON data field.

migrate((db) => {
  const collection = db.findCollectionByNameOrId("exercise_entries");

  if (!collection) {
    console.log("[Migration] exercise_entries collection not found, skipping");
    return;
  }

  // Get all exercise_entries records
  const records = db.findAllRecords(collection);
  let fixedCount = 0;

  for (const record of records) {
    const raw = record.get("data");
    if (!raw) continue;

    let data;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn(`[Migration] Failed to parse data for record ${record.id}:`, e);
      continue;
    }

    // Check if sportKey is missing or empty
    if (!data.sportKey || (typeof data.sportKey === "string" && data.sportKey.trim() === "")) {
      data.sportKey = "unknown";
      record.set("data", data);
      db.saveNoValidate(record);
      fixedCount++;
      console.log(`[Migration] Fixed sport_key for exercise ${record.id}`);
    }
  }

  console.log(`[Migration] Fixed ${fixedCount} exercise records with empty sport_key`);
}, (db) => {
  // Rollback: no-op, we can't undo the fix
  console.log("[Migration] Rollback for fix_exercise_sport_key is a no-op");
});
