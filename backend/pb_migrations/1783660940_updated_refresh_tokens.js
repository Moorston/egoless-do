/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3158807158")

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2879318533",
    "name": "is_revoked",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3158807158")

  // update field
  collection.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2879318533",
    "name": "is_revoked",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
