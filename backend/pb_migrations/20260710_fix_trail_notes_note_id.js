/// <reference path="../pb_data/types.d.ts" />

migrate(function(txApp) {
  const FIXES = [
    { coll: 'trail_notes', field: 'note_id' },
  ];

  for (let fi = 0; fi < FIXES.length; fi++) {
    const fix = FIXES[fi];
    try {
      const c = txApp.findCollectionByNameOrId(fix.coll);
      if (!c) continue;

      // Check if field already exists
      const existing = c.fields || [];
      let found = false;
      for (let i = 0; i < existing.length; i++) {
        if (existing[i].name === fix.field) { found = true; break; }
      }
      if (found) continue;

      // Add the field
      const field = new TextField({
        name: fix.field,
        required: true,
        system: false,
      });
      c.fields.push(field);
      txApp.save(c);
      console.info("[migration] Added " + fix.field + " to " + fix.coll);
    } catch (e) {
      console.error("[migration] Failed to add " + fix.field + " to " + fix.coll + ":", e);
    }
  }
}, null);
