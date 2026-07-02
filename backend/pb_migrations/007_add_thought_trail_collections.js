/// <reference path="../pb_data/types.d.ts" />

// Migration: Add thought_trails, intents, reflection_links collections

migrate((txApp) => {
  

  // 1. thought_trails collection
  try {
    const existing = txApp.findCollectionByNameOrId('thought_trails');
    if (existing) txApp.delete(existing);
  } catch {}

  const thoughtTrailsCollection = new Collection({
    name: 'thought_trails',
    type: 'base',
    system: false,
    fields: [
      { name: 'user_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'trail_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data', type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_thought_trails_user ON thought_trails (user_id)',
      'CREATE UNIQUE INDEX idx_thought_trails_id ON thought_trails (user_id, trail_id)',
    ],
    listRule: '@request.auth.id = user_id',
    viewRule: '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });
  txApp.save(thoughtTrailsCollection);

  // 2. intents collection
  try {
    const existing = txApp.findCollectionByNameOrId('intents');
    if (existing) txApp.delete(existing);
  } catch {}

  const intentsCollection = new Collection({
    name: 'intents',
    type: 'base',
    system: false,
    fields: [
      { name: 'user_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'intent_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data', type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_intents_user ON intents (user_id)',
      'CREATE UNIQUE INDEX idx_intents_id ON intents (user_id, intent_id)',
    ],
    listRule: '@request.auth.id = user_id',
    viewRule: '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });
  txApp.save(intentsCollection);

  // 3. reflection_links collection
  try {
    const existing = txApp.findCollectionByNameOrId('reflection_links');
    if (existing) txApp.delete(existing);
  } catch {}

  const reflectionLinksCollection = new Collection({
    name: 'reflection_links',
    type: 'base',
    system: false,
    fields: [
      { name: 'user_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'link_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
      { name: 'data', type: 'json', required: false, options: { maxSize: 5000000 } },
    ],
    indexes: [
      'CREATE INDEX idx_reflection_links_user ON reflection_links (user_id)',
      'CREATE UNIQUE INDEX idx_reflection_links_id ON reflection_links (user_id, link_id)',
    ],
    listRule: '@request.auth.id = user_id',
    viewRule: '@request.auth.id = user_id',
    createRule: '@request.auth.id = user_id',
    updateRule: '@request.auth.id = user_id',
    deleteRule: '@request.auth.id = user_id',
    options: {},
  });
  txApp.save(reflectionLinksCollection);

}, (db) => {
  // Rollback: delete the collections
  
  
  try {
    const c = txApp.findCollectionByNameOrId('thought_trails');
    if (c) txApp.delete(c);
  } catch {}

  try {
    const c = txApp.findCollectionByNameOrId('intents');
    if (c) txApp.delete(c);
  } catch {}

  try {
    const c = txApp.findCollectionByNameOrId('reflection_links');
    if (c) txApp.delete(c);
  } catch {}
});
