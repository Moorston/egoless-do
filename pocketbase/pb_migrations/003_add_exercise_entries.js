/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = new Dao(db);

  try {
    const existing = dao.findCollectionByNameOrId('exercise_entries');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const collection = new Collection({
    name: 'exercise_entries',
    type: 'base',
    system: false,
    schema: [
      { name: 'user_id',     type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'exercise_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data',        type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_exercise_entries_user ON exercise_entries (user_id)',
      'CREATE UNIQUE INDEX idx_exercise_entries_id ON exercise_entries (user_id, exercise_id)',
    ],
    listRule:   '@request.auth.id = user_id',
    viewRule:   '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });

  dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  try {
    const c = dao.findCollectionByNameOrId('exercise_entries');
    if (c) dao.deleteCollection(c);
  } catch {}
});
