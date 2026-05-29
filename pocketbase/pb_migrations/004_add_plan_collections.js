/// <reference path="../pb_data/types.d.ts" />

// ─── Migration: add plan, plan_items, plan_item_checkins collections ────

const COLLECTIONS = [
  { name: 'plans',             idField: 'plan_id'       },
  { name: 'plan_items',        idField: 'plan_item_id'  },
  { name: 'plan_item_checkins',idField: 'checkin_id'    },
];

migrate((db) => {
  const dao = new Dao(db);

  for (const { name, idField } of COLLECTIONS) {
    // Drop if exists (idempotent)
    try {
      const existing = dao.findCollectionByNameOrId(name);
      if (existing) dao.deleteCollection(existing);
    } catch {}

    const collection = new Collection({
      name,
      type: 'base',
      system: false,
      schema: [
        { name: 'user_id',  type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
        { name: idField,    type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
        { name: 'data',     type: 'json', required: false, options: { maxSize: 5000000 } },
      ],
      indexes: [
        `CREATE INDEX idx_${name}_user ON ${name} (user_id)`,
        `CREATE UNIQUE INDEX idx_${name}_id ON ${name} (user_id, ${idField})`,
      ],
      listRule:   '@request.auth.id = user_id',
      viewRule:   '@request.auth.id = user_id',
      createRule: '@request.auth.id = user_id',
      updateRule: '@request.auth.id = user_id',
      deleteRule: '@request.auth.id = user_id',
      options: {},
    });

    dao.saveCollection(collection);
  }
}, (db) => {
  const dao = new Dao(db);
  for (const { name } of COLLECTIONS) {
    try {
      const c = dao.findCollectionByNameOrId(name);
      if (c) dao.deleteCollection(c);
    } catch {}
  }
});
