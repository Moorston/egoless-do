/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const dao = app.dao();

  try {
    const existing = dao.findCollectionByNameOrId('grace_history');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const collection = new Collection({
    name: 'grace_history',
    type: 'base',
    system: false,
    schema: [
      { name: 'user_id',  type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'date',     type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data',     type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_grace_history_user ON grace_history (user_id)',
      'CREATE UNIQUE INDEX idx_grace_history_id ON grace_history (user_id, date)',
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
  const dao = app.dao();
  try {
    const c = dao.findCollectionByNameOrId('grace_history');
    if (c) dao.deleteCollection(c);
  } catch {}
});
