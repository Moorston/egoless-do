/// <reference path="../pb_data/types.d.ts" />

migrate((db) => {
  const dao = db.dao();

  // Create daily_custom_todos collection
  try {
    const existing = dao.findCollectionByNameOrId('daily_custom_todos');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const customTodosCollection = new Collection({
    name: 'daily_custom_todos',
    type: 'base',
    system: false,
    schema: [
      { name: 'user_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'todo_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data',    type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_daily_custom_todos_user ON daily_custom_todos (user_id)',
      'CREATE UNIQUE INDEX idx_daily_custom_todos_id ON daily_custom_todos (user_id, todo_id)',
    ],
    listRule:   '@request.auth.id = user_id',
    viewRule:   '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });

  dao.saveCollection(customTodosCollection);

  // Create daily_todo_history collection
  try {
    const existing = dao.findCollectionByNameOrId('daily_todo_history');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const todoHistoryCollection = new Collection({
    name: 'daily_todo_history',
    type: 'base',
    system: false,
    schema: [
      { name: 'user_id',    type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'history_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data',       type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_daily_todo_history_user ON daily_todo_history (user_id)',
      'CREATE UNIQUE INDEX idx_daily_todo_history_id ON daily_todo_history (user_id, history_id)',
    ],
    listRule:   '@request.auth.id = user_id',
    viewRule:   '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });

  dao.saveCollection(todoHistoryCollection);
}, (db) => {
  const dao = db.dao();
  try {
    const c = dao.findCollectionByNameOrId('daily_custom_todos');
    if (c) dao.deleteCollection(c);
  } catch {}
  try {
    const c = dao.findCollectionByNameOrId('daily_todo_history');
    if (c) dao.deleteCollection(c);
  } catch {}
});
