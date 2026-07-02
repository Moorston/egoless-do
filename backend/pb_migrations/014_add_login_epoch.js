/// <reference path="../pb_data/types.d.ts" />

// Add login_epoch field to user_profiles for single-device login support.

migrate(function(txApp) {
  try {
    var collection = txApp.findCollectionByNameOrId('user_profiles');
    if (!collection) {
      console.log('[migration 014] user_profiles collection not found, skipping');
      return;
    }

    var fieldNames = collection.fields.map(function(f) { return f.name; });

    if (fieldNames.indexOf('login_epoch') === -1) {
      collection.fields.add(new Field({
        "help": "Incremented on each login for single-device enforcement",
        "hidden": false,
        "id": "num_login_epoch_014",
        "max": null,
        "min": 0,
        "name": "login_epoch",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number",
      }));
      txApp.save(collection);
      console.log('[migration 014] Added login_epoch field to user_profiles');
    }
  } catch (err) {
    console.log('[migration 014] Error: ' + (err.message || String(err)));
  }
}, function(txApp) {
  // Rollback: field removal not easily reversible
});
