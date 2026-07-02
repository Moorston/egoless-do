/// <reference path="../pb_data/types.d.ts" />

// ─── Migration: add plan, plan_items, plan_item_checkins collections ────

const COLLECTIONS = [
  { name: 'plans',             idField: 'plan_id'       },
  { name: 'plan_items',        idField: 'plan_item_id'  },
  { name: 'plan_item_checkins',idField: 'checkin_id'    },
];

migrate((txApp) => {
  

  for (const { name, idField } of COLLECTIONS) {
    // Drop if exists (idempotent)
    try {
      const existing = txApp.findCollectionByNameOrId(name);
      if (existing) txApp.delete(existing);
    } catch {}

    const collection = new Collection({
      name,
      type: 'base',
      system: false,
      fields: [
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

    txApp.save(collection);
  }
}, (db) => {
  
  for (const { name } of COLLECTIONS) {
    try {
      const c = txApp.findCollectionByNameOrId(name);
      if (c) txApp.delete(c);
    } catch {}
  }
});
