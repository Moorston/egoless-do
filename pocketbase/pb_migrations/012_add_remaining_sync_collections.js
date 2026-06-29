/// <reference path="../pb_data/types.d.ts" />

const COLLECTIONS = [
  { name: 'exercise_entries',     idField: 'exercise_id'     },
  { name: 'plans',                idField: 'plan_id'         },
  { name: 'plan_items',           idField: 'plan_item_id'    },
  { name: 'plan_item_checkins',   idField: 'checkin_id'      },
  { name: 'daily_custom_todos',   idField: 'todo_id'         },
  { name: 'daily_todo_history',   idField: 'history_id'      },
  { name: 'grace_history',        idField: 'date'            },
  { name: 'thought_trails',       idField: 'trail_id'        },
  { name: 'trail_notes',          idField: 'note_id'         },
  { name: 'reflection_links',     idField: 'link_id'         },
  { name: 'ai_configs',           idField: 'config_id'       },
  { name: 'checkin_reviews',      idField: 'review_id'       },
];

migrate((txApp) => {
  for (const { name, idField } of COLLECTIONS) {
    try {
      txApp.findCollectionByNameOrId(name);
      continue;
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
      listRule:   null,
      viewRule:   null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {},
    });
    txApp.save(collection);
  }

  // Set auth rules after creation
  for (const { name } of COLLECTIONS) {
    try {
      const c = txApp.findCollectionByNameOrId(name);
      c.listRule   = '@request.auth.id != ""';
      c.viewRule   = '@request.auth.id != ""';
      c.createRule = '@request.auth.id != ""';
      c.updateRule = '@request.auth.id != ""';
      c.deleteRule = '@request.auth.id != ""';
      txApp.save(c);
    } catch {}
  }
}, (txApp) => {
  for (const { name } of COLLECTIONS) {
    try {
      const c = txApp.findCollectionByNameOrId(name);
      if (c) txApp.delete(c);
    } catch {}
  }
});
