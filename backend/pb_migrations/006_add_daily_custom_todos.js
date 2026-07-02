/// <reference path="../pb_data/types.d.ts" />

migrate((txApp) => {
  

  // Create daily_custom_todos collection
  try {
    const existing = txApp.findCollectionByNameOrId('daily_custom_todos');
    if (existing) txApp.delete(existing);
  } catch {}

  const customTodosCollection = new Collection({
    name: 'daily_custom_todos',
    type: 'base',
    system: false,
    fields: [
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

  txApp.save(customTodosCollection);

  // Create daily_todo_history collection
  try {
    const existing = txApp.findCollectionByNameOrId('daily_todo_history');
    if (existing) txApp.delete(existing);
  } catch {}

  const todoHistoryCollection = new Collection({
    name: 'daily_todo_history',
    type: 'base',
    system: false,
    fields: [
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

  txApp.save(todoHistoryCollection);
}, (db) => {
  
  try {
    const c = txApp.findCollectionByNameOrId('daily_custom_todos');
    if (c) txApp.delete(c);
  } catch {}
  try {
    const c = txApp.findCollectionByNameOrId('daily_todo_history');
    if (c) txApp.delete(c);
  } catch {}
});
