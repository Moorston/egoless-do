/**
 * Shared type declarations for PocketBase hooks (pb_hooks/*.pb.js)
 *
 * Reference in .pb.js files: /// <reference path="./types.d.ts" />
 *
 * NOTE: PocketBase v0.38.2 runs JS hooks in isolated scopes — all helpers
 * must be defined INSIDE each callback. These types are for documentation
 * and editor autocompletion only.
 */

/**
 * @typedef {Object} EntityConfig
 * @property {string} collection - PocketBase collection name
 * @property {string} table - SQLite table name on mobile
 * @property {string} pk - Primary key field in SQLite
 * @property {string} idField - ID field name for the entity
 */

/**
 * @typedef {Object} SyncPushItem
 * @property {string} entity - Entity type key (e.g. "habit", "checkin")
 * @property {string} entityId - Entity ID
 * @property {Object} payload - Record data
 * @property {'upsert'|'delete'} operation - Sync operation type
 * @property {string[]} [changedFields] - Changed field names
 */

/**
 * @typedef {Object} SyncPushResponse
 * @property {number} serverTime - Server timestamp
 * @property {Array<{entity: string, entityId: string, serverData?: Object}>} [rejected] - Rejected items
 */

/**
 * @typedef {Object} SyncPullResponse
 * @property {number} serverTime - Server timestamp
 * @property {Record<string, Object[]>} data - Entity → records map
 * @property {boolean} [hasMore] - Whether there are more records
 */

/**
 * @typedef {Object} SyncCheckResponse
 * @property {boolean} hasChanges - Whether server has changes
 * @property {Record<string, number>} [changed] - Changed entities with counts
 */

/**
 * @typedef {Object} PullEntityResponse
 * @property {Object[]} data - Records for this entity
 * @property {boolean} hasMore - Whether there are more pages
 * @property {number} total - Total record count
 */

/**
 * Entity type keys used in the sync protocol
 * @type {string[]}
 */
const ENTITY_LIST = [
  "habit","reflection","fasting","food","checkin","exercise","meditation",
  "profile","plan","planItem","planItemCheckin","grace","dailyCustomTodo",
  "dailyTodoHistory","thoughtTrail","trailNote","reflectionLink","aiConfig",
  "checkinReview","motivationEntry","customWuxing","fearEntry","courageEntry",
  "fearAchievement","sutraReading","sleep","give","bodyGoal","bodyPlan",
  "weightRecord","bodyCheckin","vision","visionPractice","dedication",
  "mantraDef","mantraSession","zhiguanSession","breath"
];