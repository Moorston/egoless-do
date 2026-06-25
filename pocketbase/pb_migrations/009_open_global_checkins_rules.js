/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("global_checkins");

  // 开放所有规则（测试用）
  collection.createRule = "";
  collection.updateRule = "";
  collection.deleteRule = "";

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("global_checkins");

  collection.createRule = "@request.auth.id != \"\"";
  collection.updateRule = "@request.auth.id != \"\" && user_hash = @request.auth.id";
  collection.deleteRule = "@request.auth.id != \"\" && user_hash = @request.auth.id";

  return dao.saveCollection(collection);
});
