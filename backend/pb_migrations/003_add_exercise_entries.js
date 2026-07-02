/// <reference path="../pb_data/types.d.ts" />

migrate((txApp) => {
  

  try {
    const existing = txApp.findCollectionByNameOrId('exercise_entries');
    if (existing) txApp.delete(existing);
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

  txApp.save(collection);
}, (db) => {
  
  try {
    const c = txApp.findCollectionByNameOrId('exercise_entries');
    if (c) txApp.delete(c);
  } catch {}
});
