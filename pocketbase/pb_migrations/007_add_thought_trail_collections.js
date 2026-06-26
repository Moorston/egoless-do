/// <reference path="../pb_data/types.d.ts" />

// Migration: Add thought_trails, intents, reflection_links collections

migrate((db) => {
  const dao = db.dao();

  // 1. thought_trails collection
  try {
    const existing = dao.findCollectionByNameOrId('thought_trails');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const thoughtTrailsCollection = new Collection({
    name: 'thought_trails',
    type: 'base',
    system: false,
    schema: [
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
  dao.saveCollection(thoughtTrailsCollection);

  // 2. intents collection
  try {
    const existing = dao.findCollectionByNameOrId('intents');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const intentsCollection = new Collection({
    name: 'intents',
    type: 'base',
    system: false,
    schema: [
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
  dao.saveCollection(intentsCollection);

  // 3. reflection_links collection
  try {
    const existing = dao.findCollectionByNameOrId('reflection_links');
    if (existing) dao.deleteCollection(existing);
  } catch {}

  const reflectionLinksCollection = new Collection({
    name: 'reflection_links',
    type: 'base',
    system: false,
    schema: [
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
  dao.saveCollection(reflectionLinksCollection);

}, (db) => {
  // Rollback: delete the collections
  const dao = db.dao();
  
  try {
    const c = dao.findCollectionByNameOrId('thought_trails');
    if (c) dao.deleteCollection(c);
  } catch {}

  try {
    const c = dao.findCollectionByNameOrId('intents');
    if (c) dao.deleteCollection(c);
  } catch {}

  try {
    const c = dao.findCollectionByNameOrId('reflection_links');
    if (c) dao.deleteCollection(c);
  } catch {}
});
