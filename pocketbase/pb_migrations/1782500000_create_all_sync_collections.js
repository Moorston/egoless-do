/// <reference path="../pb_data/types.d.ts" />

// Creates all collections required by the sync endpoint and global pulse system.
// Uses "fields" (not "schema") per PocketBase v0.38.2 Collection constructor.

migrate((txApp) => {
  function ensureCollection(name, config) {
    try {
      txApp.findCollectionByNameOrId(name);
      return;
    } catch {}
    const safeConfig = Object.assign({}, config, {
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    const collection = new Collection(safeConfig);
    txApp.save(collection);
  }

  function setRules(name, rules) {
    try {
      const c = txApp.findCollectionByNameOrId(name);
      c.listRule = rules.listRule;
      c.viewRule = rules.viewRule;
      c.createRule = rules.createRule;
      c.updateRule = rules.updateRule;
      c.deleteRule = rules.deleteRule;
      txApp.save(c);
    } catch {}
  }

  // Standard fields for sync collections: user_id + entity_id + data + deleted + updated_at
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

  // ── global_checkins ─────────────────────────────────────────────
  ensureCollection("global_checkins", {
    name: "global_checkins",
    type: "base",
    system: false,
    fields: [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_gc_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_gc_c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_gc_u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_gc_cid", "max": 36, "min": 1, "name": "checkin_id", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_gc_uh", "max": 64, "min": 8, "name": "user_hash", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "help": "", "hidden": false, "id": "number_gc_lat", "max": 90, "min": -90, "name": "lat", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_gc_lng", "max": 180, "min": -180, "name": "lng", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "select_gc_type", "maxSelect": 1, "name": "type", "presentable": false, "required": true, "system": false, "type": "select", "values": ["exercise", "fasting", "meditation"] },
      { "help": "", "hidden": false, "id": "number_gc_str", "max": 99999, "min": 0, "name": "streak", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_gc_td", "max": 99999, "min": 0, "name": "total_days", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_gc_ca", "max": "", "min": "", "name": "created_at", "presentable": false, "required": true, "system": false, "type": "date" },
      { "help": "", "hidden": false, "id": "bool_gc_oo", "name": "opted_out", "presentable": false, "required": false, "system": false, "type": "bool" },
    ],
    indexes: [
      "CREATE INDEX idx_global_checkins_user_hash ON `global_checkins` (`user_hash`)",
      "CREATE INDEX idx_global_checkins_created_at ON `global_checkins` (`created_at`)",
      "CREATE INDEX idx_global_checkins_type ON `global_checkins` (`type`)",
      "CREATE INDEX idx_global_checkins_lat_lng ON `global_checkins` (`lat`, `lng`)",
    ],
    options: {},
  });

  // ── global_stats ────────────────────────────────────────────────
  ensureCollection("global_stats", {
    name: "global_stats",
    type: "base",
    system: false,
    fields: [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_gs_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_gs_c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_gs_u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "help": "", "hidden": false, "id": "number_gs_tu", "max": null, "min": 0, "name": "total_users", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_gs_at", "max": null, "min": 0, "name": "active_today", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_gs_ts", "max": null, "min": 0, "name": "top_streak", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_gs_co", "max": null, "min": 0, "name": "countries", "noDecimal": false, "onlyInt": false, "presentable": false, "required": true, "system": false, "type": "number" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_gs_ua", "max": "", "min": "", "name": "updated_at", "presentable": false, "required": true, "system": false, "type": "date" },
    ],
    indexes: [],
    options: {},
  });

  // ── active_sessions ─────────────────────────────────────────────
  ensureCollection("active_sessions", {
    name: "active_sessions",
    type: "base",
    system: false,
    fields: [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_as_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_as_c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_as_u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_sid", "max": 36, "min": 1, "name": "session_id", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_uh", "max": 64, "min": 8, "name": "user_hash", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_nn", "max": 20, "min": 0, "name": "nickname", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "help": "", "hidden": false, "id": "select_as_tp", "maxSelect": 1, "name": "type", "presentable": false, "required": true, "system": false, "type": "select", "values": ["exercise", "meditation", "fasting"] },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_as_sa", "max": "", "min": "", "name": "started_at", "presentable": false, "required": true, "system": false, "type": "date" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_as_lh", "max": "", "min": "", "name": "last_heartbeat", "presentable": false, "required": true, "system": false, "type": "date" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_gl", "max": 100, "min": 0, "name": "goal", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_in", "max": 200, "min": 0, "name": "insight", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_sk", "max": 50, "min": 0, "name": "sport_key", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_as_si", "max": 10, "min": 0, "name": "sport_icon", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "help": "", "hidden": false, "id": "number_as_lat", "max": 90, "min": -90, "name": "lat", "noDecimal": false, "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_as_lng", "max": 180, "min": -180, "name": "lng", "noDecimal": false, "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
    ],
    indexes: [
      "CREATE INDEX idx_active_sessions_user_hash ON `active_sessions` (`user_hash`)",
      "CREATE INDEX idx_active_sessions_last_heartbeat ON `active_sessions` (`last_heartbeat`)",
      "CREATE INDEX idx_active_sessions_type ON `active_sessions` (`type`)",
    ],
    options: {},
  });

  // ── leaderboard ─────────────────────────────────────────────────
  ensureCollection("leaderboard", {
    name: "leaderboard",
    type: "base",
    system: false,
    fields: [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_lb_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_lb_c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_lb_u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_lb_uh", "max": 64, "min": 8, "name": "user_hash", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "help": "", "hidden": false, "id": "number_lb_bs", "max": 99999, "min": 0, "name": "best_streak", "noDecimal": false, "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "help": "", "hidden": false, "id": "number_lb_td", "max": 99999, "min": 0, "name": "total_days", "noDecimal": false, "onlyInt": false, "presentable": false, "required": false, "system": false, "type": "number" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "date_lb_la", "max": "", "min": "", "name": "last_active_at", "presentable": false, "required": false, "system": false, "type": "date" },
    ],
    indexes: [],
    options: {},
  });

  // ── Sync collections ────────────────────────────────────────────
  ensureCollection("exercise_entries", {
    name: "exercise_entries", type: "base", system: false,
    fields: syncFields("exercise_id"),
    indexes: syncIndexes("exercise_entries", "exercise_id"),
    options: {},
  });
  ensureCollection("plans", {
    name: "plans", type: "base", system: false,
    fields: syncFields("plan_id"),
    indexes: syncIndexes("plans", "plan_id"),
    options: {},
  });
  ensureCollection("plan_items", {
    name: "plan_items", type: "base", system: false,
    fields: syncFields("plan_item_id"),
    indexes: syncIndexes("plan_items", "plan_item_id"),
    options: {},
  });
  ensureCollection("plan_item_checkins", {
    name: "plan_item_checkins", type: "base", system: false,
    fields: syncFields("checkin_id"),
    indexes: syncIndexes("plan_item_checkins", "checkin_id"),
    options: {},
  });
  ensureCollection("daily_custom_todos", {
    name: "daily_custom_todos", type: "base", system: false,
    fields: syncFields("todo_id"),
    indexes: syncIndexes("daily_custom_todos", "todo_id"),
    options: {},
  });
  ensureCollection("daily_todo_history", {
    name: "daily_todo_history", type: "base", system: false,
    fields: syncFields("history_id"),
    indexes: syncIndexes("daily_todo_history", "history_id"),
    options: {},
  });
  ensureCollection("grace_history", {
    name: "grace_history", type: "base", system: false,
    fields: syncFields("date"),
    indexes: syncIndexes("grace_history", "date"),
    options: {},
  });
  ensureCollection("thought_trails", {
    name: "thought_trails", type: "base", system: false,
    fields: syncFields("trail_id"),
    indexes: syncIndexes("thought_trails", "trail_id"),
    options: {},
  });
  ensureCollection("trail_notes", {
    name: "trail_notes", type: "base", system: false,
    fields: syncFields("note_id"),
    indexes: syncIndexes("trail_notes", "note_id"),
    options: {},
  });
  ensureCollection("reflection_links", {
    name: "reflection_links", type: "base", system: false,
    fields: syncFields("link_id"),
    indexes: syncIndexes("reflection_links", "link_id"),
    options: {},
  });
  ensureCollection("meditation_history", {
    name: "meditation_history", type: "base", system: false,
    fields: syncFields("date"),
    indexes: syncIndexes("meditation_history", "date"),
    options: {},
  });
  ensureCollection("user_profiles", {
    name: "user_profiles", type: "base", system: false,
    fields: syncFields("profile_id"),
    indexes: syncIndexes("user_profiles", "profile_id"),
    options: {},
  });
  ensureCollection("ai_configs", {
    name: "ai_configs", type: "base", system: false,
    fields: syncFields("config_id"),
    indexes: syncIndexes("ai_configs", "config_id"),
    options: {},
  });
  ensureCollection("checkin_reviews", {
    name: "checkin_reviews", type: "base", system: false,
    fields: syncFields("review_id"),
    indexes: syncIndexes("checkin_reviews", "review_id"),
    options: {},
  });

  // ── push_tokens ─────────────────────────────────────────────────
  ensureCollection("push_tokens", {
    name: "push_tokens",
    type: "base",
    system: false,
    fields: [
      { "autogeneratePattern": "[a-z0-9]{15}", "help": "", "hidden": false, "id": "text_pt_id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "hidden": false, "id": "autodate_pt_c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate_pt_u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_pt_uid", "max": 0, "min": 0, "name": "user_id", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_pt_plat", "max": 0, "min": 0, "name": "platform", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "help": "", "hidden": false, "id": "text_pt_tok", "max": 0, "min": 0, "name": "token", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
    ],
    indexes: [
      "CREATE INDEX idx_push_tokens_user ON `push_tokens` (`user_id`)",
      "CREATE UNIQUE INDEX idx_push_tokens_token ON `push_tokens` (`token`)",
    ],
    options: {},
  });

  // ── Set auth rules after all collections are created ────────────
  setRules("global_checkins", {
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && user_hash = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user_hash = @request.auth.id',
  });
  setRules("global_stats", {
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
  });
  setRules("active_sessions", {
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  });
  setRules("leaderboard", {
    listRule: "",
    viewRule: "",
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: null,
  });

  const AUTH_RULES = {
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
  };
  for (const name of [
    "exercise_entries", "plans", "plan_items", "plan_item_checkins",
    "daily_custom_todos", "daily_todo_history", "grace_history",
    "thought_trails", "trail_notes", "reflection_links",
    "meditation_history", "user_profiles", "ai_configs", "checkin_reviews",
  ]) {
    setRules(name, AUTH_RULES);
  }

  setRules("push_tokens", {
    listRule: '@request.auth.id = user_id',
    viewRule: '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
  });
}, (txApp) => {
  for (const name of [
    "global_checkins", "global_stats", "active_sessions", "leaderboard",
    "exercise_entries", "plans", "plan_items", "plan_item_checkins",
    "daily_custom_todos", "daily_todo_history", "grace_history",
    "thought_trails", "trail_notes", "reflection_links",
    "meditation_history", "user_profiles", "ai_configs", "checkin_reviews",
    "push_tokens",
  ]) {
    try {
      const c = txApp.findCollectionByNameOrId(name);
      if (c) txApp.delete(c);
    } catch {}
  }
});
