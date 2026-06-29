/// <reference path="../pb_data/types.d.ts" />

// Add login_epoch field to user_profiles for single-device login support.
// This field is incremented on each login and embedded in the JWT,
// allowing the sync endpoint to detect when a token belongs to a previous session.

migrate((txApp) => {
  try {
    const collection = txApp.findCollectionByNameOrId('user_profiles');
    if (!collection) {
      console.log('[migration 014] user_profiles collection not found, skipping');
      return;
    }

    const fields = collection.fields;
    const fieldNames = fields.map(f => f.name);

    if (!fieldNames.includes('login_epoch')) {
      fields.push({
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
      });
      collection.fields = fields;
      txApp.save(collection);
      console.log('[migration 014] Added login_epoch field to user_profiles');
    }
  } catch (err) {
    console.log('[migration 014] Error: ' + (err.message || String(err)));
  }
}, (txApp) => {
  // Rollback: field removal not easily reversible
});
