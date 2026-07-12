// ─── PocketBase v0.38.2 — Auto-create required collections on load ───
// Top-level code runs when PB loads this file at startup.
// $app is available as a global in the PB JS runtime.

try {
  // Check if custom_food_presets already exists
  $app.findCollectionByNameOrId("custom_food_presets");
} catch (notFound) {
  // Collection doesn't exist — create it
  try {
    var REQUIRED_COLLECTIONS = [
      {
        name: "custom_food_presets",
        type: "base",
        fields: [
          { name: "user_id",   type: "text", required: true },
          { name: "preset_id", type: "text", required: true },
          { name: "data",      type: "json", required: false, maxSize: 5000000 },
          { name: "updated_at", type: "autodate", onCreate: false, onUpdate: false },
        ],
        listRule:   "@request.auth.id = user_id",
        viewRule:   "@request.auth.id = user_id",
        createRule: "@request.auth.id = user_id",
        updateRule: "@request.auth.id = user_id",
        deleteRule: "@request.auth.id = user_id",
      },
    ];

    for (var ci = 0; ci < REQUIRED_COLLECTIONS.length; ci++) {
      var def = REQUIRED_COLLECTIONS[ci];
      try {
        var dao = $app.dao();
        var col = new DynamicModel(dao.collectionQuery().modelDataType());
        col.set("name", def.name);
        col.set("type", def.type);
        col.set("listRule", def.listRule || null);
        col.set("viewRule", def.viewRule || null);
        col.set("createRule", def.createRule || null);
        col.set("updateRule", def.updateRule || null);
        col.set("deleteRule", def.deleteRule || null);

        for (var fi = 0; fi < def.fields.length; fi++) {
          var fdef = def.fields[fi];
          var field = new DynamicModel(dao.fieldQuery().modelDataType());
          field.set("name", fdef.name);
          field.set("type", fdef.type);
          field.set("required", !!fdef.required);
          if (fdef.maxSize !== undefined) field.set("maxSize", fdef.maxSize);
          if (fdef.onCreate !== undefined) field.set("onCreate", fdef.onCreate);
          if (fdef.onUpdate !== undefined) field.set("onUpdate", fdef.onUpdate);
          col.get("fields").push(field);
        }

        dao.saveCollection(col);
        console.log("[Init] Created collection: " + def.name);
      } catch (createErr) {
        console.error("[Init] Failed to create " + def.name + ":", createErr.name || "Error", createErr.message || "");
      }
    }
  } catch (e) {
    console.error("[Init] Error:", e.name || "Error", e.message || "");
  }
}