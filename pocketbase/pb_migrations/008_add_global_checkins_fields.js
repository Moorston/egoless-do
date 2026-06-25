/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("global_checkins");

  // 添加 nickname 字段
  collection.schema.addField(new SchemaField({
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
  collection.schema.addField(new SchemaField({
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

  // 允许公开创建（测试用）
  collection.createRule = "";

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("global_checkins");

  collection.schema.removeField("nickname_field");
  collection.schema.removeField("city_field");
  collection.createRule = "@request.auth.id != \"\"";

  return dao.saveCollection(collection);
});
