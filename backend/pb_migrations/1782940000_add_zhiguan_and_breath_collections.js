/// <reference path="../pb_data/types.d.ts" />

// Creates zhiguan_sessions and breath_records collections for sync.

migrate(function(txApp) {
  function ensureCollection(name, config) {
    try { txApp.findCollectionByNameOrId(name); return; } catch (e) {}
    // Extract indexes (must be added after table exists)
    var indexes = config.indexes || [];
    var safeConfig = Object.assign({}, config, {
      indexes: [],
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    });
    var collection = new Collection(safeConfig);
    txApp.save(collection);
    // Add indexes after table exists
    if (indexes.length > 0) {
      var c = txApp.findCollectionByNameOrId(name);
      c.indexes = indexes;
      txApp.save(c);
    }
  }
  function setRules(name, rules) {
    try {
      var c = txApp.findCollectionByNameOrId(name);
      c.listRule = rules.listRule; c.viewRule = rules.viewRule;
      c.createRule = rules.createRule; c.updateRule = rules.updateRule;
      c.deleteRule = rules.deleteRule;
      txApp.save(c);
    } catch (e) {}
  }
  function syncFields(idFieldName) {
    return [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_sync_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_created", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_updated", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_sync_uid", "max": 0, "min": 0, "name": "user_id", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_sync_eid", "max": 0, "min": 0, "name": idFieldName, "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "json_sync_data", "maxSize": 5000000, "name": "data", "presentable": false, "system": false, "type": "json" },
      { "help": "", "hidden": false, "id": "bool_sync_del", "name": "deleted", "presentable": false, "required": false, "system": false, "type": "bool" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_sync_uat", "max": "", "min": "", "name": "updated_at", "presentable": false, "required": false, "system": false, "type": "date" },
    ];
  }
  function syncIndexes(name, idFieldName) {
    return [
      "CREATE INDEX idx_" + name + "_user ON `" + name + "` (`user_id`)",
      "CREATE UNIQUE INDEX idx_" + name + "_eid ON `" + name + "` (`" + idFieldName + "`, `user_id`)",
    ];
  }

  ensureCollection("zhiguan_sessions", {
    name: "zhiguan_sessions", type: "base", system: false,
    fields: syncFields("zhiguan_id"),
    indexes: syncIndexes("zhiguan_sessions", "zhiguan_id"),
    options: {},
  });
  ensureCollection("breath_records", {
    name: "breath_records", type: "base", system: false,
    fields: syncFields("breath_id"),
    indexes: syncIndexes("breath_records", "breath_id"),
    options: {},
  });

  var AUTH_RULES = {
    listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  };
  setRules("zhiguan_sessions", AUTH_RULES);
  setRules("breath_records", AUTH_RULES);
}, function(txApp) {
  for (var i = 0; i < ["zhiguan_sessions", "breath_records"].length; i++) {
    var name = ["zhiguan_sessions", "breath_records"][i];
    try {
      var c = txApp.findCollectionByNameOrId(name);
      if (c) txApp.deleteCollection(c);
    } catch (e) {}
  }
});
