/// <reference path="../pb_data/types.d.ts" />
migrate((txApp) => {
  
  const collection = txApp.findCollectionByNameOrId("global_checkins");

  // 添加 nickname 字段
  collection.fields.add(new Field({
    "system": false,
    "id": "nickname_field",
    "name": "nickname",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 20,
      "pattern": ""
    }
  }));

  // 添加 city 字段
  collection.fields.add(new Field({
    "system": false,
    "id": "city_field",
    "name": "city",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 50,
      "pattern": ""
    }
  }));

  // Production create rule: require authentication
  collection.createRule = "@request.auth.id != \"\"";

  return txApp.save(collection);
}, (db) => {
  
  const collection = txApp.findCollectionByNameOrId("global_checkins");

  collection.fields.removeByName("nickname_field");
  collection.fields.removeByName("city_field");
  collection.createRule = "@request.auth.id != \"\"";

  return txApp.save(collection);
});
