/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "fa7i032y4xbn58z",
    "created": "2026-06-25 01:54:38.315Z",
    "updated": "2026-06-25 01:54:38.315Z",
    "name": "global_checkins",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "d8fospx0",
        "name": "checkin_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": 1,
          "max": 36,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "uyr9r316",
        "name": "user_hash",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 8,
          "max": 64,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "qbloeoyj",
        "name": "lat",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": -90,
          "max": 90,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "pygvddmv",
        "name": "lng",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": -180,
          "max": 180,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "slaf60sh",
        "name": "type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "exercise",
            "fasting",
            "meditation"
          ]
        }
      },
      {
        "system": false,
        "id": "nzblnj6e",
        "name": "streak",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 99999,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "2elgdrby",
        "name": "total_days",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": 99999,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "yc9uh3qn",
        "name": "created_at",
        "type": "date",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "x1dhifsh",
        "name": "opted_out",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [
      "CREATE INDEX `idx_global_checkins_user_hash` ON `global_checkins` (`user_hash`)",
      "CREATE INDEX `idx_global_checkins_created_at` ON `global_checkins` (`created_at`)",
      "CREATE INDEX `idx_global_checkins_type` ON `global_checkins` (`type`)",
      "CREATE INDEX `idx_global_checkins_lat_lng` ON `global_checkins` (\n  `lat`,\n  `lng`\n)"
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\" && user_hash = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && user_hash = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = db.dao();
  const collection = dao.findCollectionByNameOrId("fa7i032y4xbn58z");

  return dao.deleteCollection(collection);
})
