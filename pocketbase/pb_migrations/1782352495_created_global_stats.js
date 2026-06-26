/// <reference path="../pb_data/types.d.ts" />
migrate((txApp) => {
  const collection = new Collection({
    "id": "3cmdj7itcm6od4f",
    "created": "2026-06-25 01:54:55.017Z",
    "updated": "2026-06-25 01:54:55.017Z",
    "name": "global_stats",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "brznju11",
        "name": "total_users",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "b7xtkxwy",
        "name": "active_today",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "bgahw2b7",
        "name": "top_streak",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "jfemosvg",
        "name": "countries",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "fxyhcrfz",
        "name": "updated_at",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": null,
    "options": {}
  });

  return txApp.save(collection);
}, (db) => {
  
  const collection = txApp.findCollectionByNameOrId("3cmdj7itcm6od4f");

  return txApp.delete(collection);
})
