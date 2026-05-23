// ─── Migration: ensure all sync collections match route.ts expectations ──────
// PocketBase v0.38+ migration API using Dao + Collection

const OLD_NAMES = ['sync_data'];
const COLLECTIONS = [
  { name: 'habits',            idField: 'habit_id'      },
  { name: 'reflections',       idField: 'reflection_id' },
  { name: 'fasting_sessions',  idField: 'session_id'    },
  { name: 'food_entries',      idField: 'food_id'       },
  { name: 'checkin_records',   idField: 'date'          },
  { name: 'meditation_history',idField: 'date'          },
  { name: 'user_profiles',     idField: 'profile_id'    },
];

migrate((db) => {
  const dao = new Dao(db);

  // 1. Drop orphaned collections
  for (const name of OLD_NAMES) {
    try {
      const c = dao.findCollectionByNameOrId(name);
      if (c) dao.deleteCollection(c);
    } catch {}
  }

  // 2. Drop old entity collections if they exist (created by 001_init.js with wrong schema)
  for (const { name } of COLLECTIONS) {
    try {
      const c = dao.findCollectionByNameOrId(name);
      if (c) dao.deleteCollection(c);
    } catch {}
  }

  // 3. Recreate with correct schema
  for (const { name, idField } of COLLECTIONS) {
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
  // rollback — delete all created collections
  const dao = new Dao(db);
  for (const { name } of COLLECTIONS) {
    try {
      const c = dao.findCollectionByNameOrId(name);
      if (c) dao.deleteCollection(c);
    } catch {}
  }
});
