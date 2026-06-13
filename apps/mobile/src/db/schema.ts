// ─── SQLite schema & queries (expo-sqlite v15 API) ───────────────
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'egoless_do.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  const instance = await SQLite.openDatabaseAsync(DB_NAME);
  await initDatabase(instance);
  await migrateDatabase(instance);
  _db = instance;
  return instance;
}

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS mind_reflections (
  id              TEXT PRIMARY KEY,
  created_at      INTEGER NOT NULL,
  content         TEXT    NOT NULL,
  tags            TEXT    NOT NULL DEFAULT '[]',
  mood            TEXT,
  card_theme      TEXT,
  link            TEXT,
  linked_habit_id TEXT,
  linked_plan_id  TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mind_ts   ON mind_reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_tags ON mind_reflections(tags);

CREATE TABLE IF NOT EXISTS fasting_sessions (
  id             TEXT PRIMARY KEY,
  target_hours   INTEGER NOT NULL,
  started_at     INTEGER NOT NULL,
  ended_at       INTEGER,
  estimated_kcal INTEGER,
  insight        TEXT CHECK(length(insight) <= 20),
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habits (
  id             TEXT PRIMARY KEY,
  name           TEXT    NOT NULL,
  start_date     TEXT    NOT NULL,
  target_days    INTEGER NOT NULL,
  goal           TEXT    DEFAULT '',
  insight        TEXT    DEFAULT '',
  create_tag     INTEGER NOT NULL DEFAULT 1,
  done_days      INTEGER NOT NULL DEFAULT 0,
  streak         INTEGER NOT NULL DEFAULT 0,
  interrupted    INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'notStarted',
  checked_dates  TEXT    NOT NULL DEFAULT '[]',
  pause_reason   TEXT    DEFAULT '',
  abandon_reason TEXT    DEFAULT '',
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_entries (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  cal        INTEGER NOT NULL DEFAULT 0,
  note       TEXT    DEFAULT '',
  entry_date TEXT    NOT NULL,
  ts         INTEGER NOT NULL,
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkin_records (
  date       TEXT PRIMARY KEY,
  done       INTEGER NOT NULL DEFAULT 0,
  note       TEXT    DEFAULT '',
  streak     INTEGER NOT NULL DEFAULT 0,
  timestamp  INTEGER,
  weight     REAL,
  grace      INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercise_entries (
  id            TEXT PRIMARY KEY,
  sport_key     TEXT    NOT NULL,
  sport_icon    TEXT    NOT NULL DEFAULT '',
  duration_sec  INTEGER NOT NULL DEFAULT 0,
  distance_km   REAL    DEFAULT 0,
  calories      INTEGER DEFAULT 0,
  avg_pace      REAL    DEFAULT 0,
  track_points  TEXT    DEFAULT '[]',
  is_gps_sport  INTEGER NOT NULL DEFAULT 0,
  ts            INTEGER NOT NULL,
  updated_at    INTEGER,
  deleted       INTEGER NOT NULL DEFAULT 0,
  synced        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  operation  TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
  payload    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity, entity_id);

CREATE TABLE IF NOT EXISTS meditation_history (
  date       TEXT PRIMARY KEY,
  dur        TEXT NOT NULL,
  mood       TEXT DEFAULT '',
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plans (
  id                      TEXT PRIMARY KEY,
  name                    TEXT    NOT NULL,
  goal                    TEXT    NOT NULL DEFAULT '',
  slogan                  TEXT    NOT NULL DEFAULT '',
  start_date              TEXT    NOT NULL,
  end_date                TEXT    NOT NULL,
  status                  TEXT    NOT NULL DEFAULT 'not_started',
  progress                INTEGER NOT NULL DEFAULT 0,
  last_delayed_notify_at  INTEGER,
  updated_at              INTEGER,
  deleted                 INTEGER NOT NULL DEFAULT 0,
  synced                  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan_items (
  id                TEXT PRIMARY KEY,
  plan_id           TEXT    NOT NULL,
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL DEFAULT '',
  start_date        TEXT    NOT NULL,
  end_date          TEXT    NOT NULL,
  content_url       TEXT    NOT NULL DEFAULT '',
  total_checkin_days INTEGER NOT NULL DEFAULT 0,
  status            TEXT    NOT NULL DEFAULT 'not_started',
  progress          INTEGER NOT NULL DEFAULT 0,
  link              TEXT    NOT NULL DEFAULT 'manual',
  priority          TEXT    NOT NULL DEFAULT 'medium',
  target_metric     TEXT    NOT NULL DEFAULT '',
  link_config       TEXT    NOT NULL DEFAULT '{}',
  item_order        INTEGER NOT NULL DEFAULT 0,
  frequency         TEXT,
  updated_at        INTEGER,
  deleted           INTEGER NOT NULL DEFAULT 0,
  synced            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan_item_checkins (
  id              TEXT PRIMARY KEY,
  plan_item_id    TEXT    NOT NULL,
  date            TEXT    NOT NULL,
  done            INTEGER NOT NULL DEFAULT 0,
  note            TEXT    DEFAULT '',
  linked_module   TEXT    DEFAULT '',
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grace_history (
  date        TEXT PRIMARY KEY,
  restored_at INTEGER NOT NULL,
  updated_at  INTEGER,
  deleted     INTEGER NOT NULL DEFAULT 0,
  synced      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_custom_todos (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  todo_order  INTEGER NOT NULL DEFAULT 0,
  recurring   INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER,
  deleted     INTEGER NOT NULL DEFAULT 0,
  synced      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_todo_history (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  plan_items  TEXT    NOT NULL DEFAULT '[]',
  custom_todos TEXT   NOT NULL DEFAULT '[]',
  updated_at  INTEGER,
  deleted     INTEGER NOT NULL DEFAULT 0,
  synced      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS thought_trails (
  id              TEXT PRIMARY KEY,
  name            TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  reflection_ids  TEXT    NOT NULL DEFAULT '[]',
  note_ids        TEXT    NOT NULL DEFAULT '[]',
  source          TEXT    DEFAULT 'manual',
  insight_summary TEXT,
  insight_cache   TEXT,
  review_cache    TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trail_notes (
  id               TEXT PRIMARY KEY,
  trail_id         TEXT    NOT NULL,
  content          TEXT    NOT NULL,
  tags             TEXT    NOT NULL DEFAULT '[]',
  mood             TEXT,
  source           TEXT    NOT NULL DEFAULT 'free',
  guided_question  TEXT,
  note_order       INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER,
  deleted          INTEGER NOT NULL DEFAULT 0,
  synced           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trail_notes_trail ON trail_notes(trail_id);

CREATE TABLE IF NOT EXISTS ai_configs (
  config_id  TEXT PRIMARY KEY,
  mode       TEXT NOT NULL DEFAULT 'hybrid',
  models     TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkin_reviews (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'self',
  review_id   TEXT NOT NULL,
  period      TEXT NOT NULL DEFAULT 'week',
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  review_data TEXT NOT NULL DEFAULT '{}',
  updated_at  INTEGER,
  deleted     INTEGER NOT NULL DEFAULT 0,
  synced      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_checkin_reviews_period ON checkin_reviews(period, start_date);
`;

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const tryAddCol = async (table: string, column: string, type: string) => {
    try { await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`); } catch {}
  };

  await tryAddCol('habits', 'synced', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('mind_reflections', 'linked_plan_id', 'TEXT');
  await tryAddCol('food_entries', 'synced', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('checkin_records', 'timestamp', 'INTEGER');
  await tryAddCol('checkin_records', 'weight', 'REAL');
  await tryAddCol('checkin_records', 'grace', 'INTEGER NOT NULL DEFAULT 0');

  // Ensure exercise_entries table exists
  const exerciseTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='exercise_entries'"
  );
  if (!exerciseTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS exercise_entries (
      id TEXT PRIMARY KEY, sport_key TEXT NOT NULL, sport_icon TEXT NOT NULL DEFAULT '',
      duration_sec INTEGER NOT NULL DEFAULT 0, distance_km REAL DEFAULT 0,
      calories INTEGER DEFAULT 0, avg_pace REAL DEFAULT 0,
      track_points TEXT DEFAULT '[]', is_gps_sport INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Add health_synced column to exercise_entries for HealthKit/Health Connect tracking
  await tryAddCol('exercise_entries', 'health_synced', 'INTEGER NOT NULL DEFAULT 0');

  // Ensure sync_queue table exists
  const syncQueueCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_queue'"
  );
  if (!syncQueueCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
      payload TEXT NOT NULL, created_at INTEGER NOT NULL
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity, entity_id)');
  }

  // Ensure meditation_history table exists
  const medTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='meditation_history'"
  );
  if (!medTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS meditation_history (
      date TEXT PRIMARY KEY, dur TEXT NOT NULL, mood TEXT DEFAULT '', synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure user_profiles table exists
  const profileTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'"
  );
  if (!profileTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS user_profiles (
      profile_id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Add updated_at column to tables that lack it (for sync conflict resolution)
  const tablesNeedingUpdatedAt = [
    'habits', 'mind_reflections', 'fasting_sessions', 'food_entries',
    'checkin_records', 'exercise_entries', 'meditation_history', 'user_profiles',
  ];
  for (const table of tablesNeedingUpdatedAt) {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN updated_at INTEGER`);
    } catch {
      // Column already exists — ignore
    }
  }

  // Add deleted column to tables that lack it (for soft delete)
  const tablesNeedingDeleted = [
    'habits', 'mind_reflections', 'fasting_sessions', 'food_entries',
    'checkin_records', 'exercise_entries', 'meditation_history', 'user_profiles',
  ];
  for (const table of tablesNeedingDeleted) {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Column already exists — ignore
    }
  }

  // Add columns to plan_items if missing
  await tryAddCol('plan_items', 'priority', "TEXT NOT NULL DEFAULT 'medium'");
  await tryAddCol('plan_items', 'target_metric', "TEXT NOT NULL DEFAULT ''");
  await tryAddCol('plan_items', 'reflection_id', 'TEXT');
  await tryAddCol('plan_items', 'frequency', 'TEXT');

  // Ensure mind_reflections.colors column exists
  await tryAddCol('mind_reflections', 'colors', 'TEXT');

  // Ensure mind_reflections.link column exists
  await tryAddCol('mind_reflections', 'link', 'TEXT');

  // Ensure plans.last_delayed_notify_at column exists
  await tryAddCol('plans', 'last_delayed_notify_at', 'INTEGER');

  // Ensure thought_trails table exists
  const thoughtTrailTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='thought_trails'"
  );
  if (!thoughtTrailTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS thought_trails (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
      reflection_ids TEXT NOT NULL DEFAULT '[]',
      source TEXT DEFAULT 'manual', insight_summary TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Add source and insight_summary columns to thought_trails if missing
  await tryAddCol('thought_trails', 'source', "TEXT DEFAULT 'manual'");
  await tryAddCol('thought_trails', 'insight_summary', 'TEXT');
  await tryAddCol('thought_trails', 'note_ids', "TEXT NOT NULL DEFAULT '[]'");
  await tryAddCol('thought_trails', 'insight_cache', 'TEXT');
  await tryAddCol('thought_trails', 'review_cache', 'TEXT');

  // Add trail_id column to plan_items if missing
  await tryAddCol('plan_items', 'trail_id', 'TEXT');

  // Ensure trail_notes table exists
  const trailNotesTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='trail_notes'"
  );
  if (!trailNotesTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS trail_notes (
      id TEXT PRIMARY KEY, trail_id TEXT NOT NULL, content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]', mood TEXT, source TEXT NOT NULL DEFAULT 'free',
      guided_question TEXT, note_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_trail_notes_trail ON trail_notes(trail_id)');
  }

  // Ensure ai_configs table exists
  const aiConfigsTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_configs'"
  );
  if (!aiConfigsTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS ai_configs (
      config_id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT 'hybrid',
      models TEXT NOT NULL DEFAULT '[]', updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure checkin_reviews table exists
  const checkinReviewsTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='checkin_reviews'"
  );
  if (!checkinReviewsTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS checkin_reviews (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'self',
      review_id TEXT NOT NULL, period TEXT NOT NULL DEFAULT 'week',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      review_data TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_checkin_reviews_period ON checkin_reviews(period, start_date)');
  }

  // Ensure plan tables exist
  const planTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='plans'"
  );
  // Ensure grace_history table exists
  const graceTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='grace_history'"
  );
  if (!graceTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS grace_history (
      date TEXT PRIMARY KEY, restored_at INTEGER NOT NULL,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure daily_custom_todos table exists
  const dailyCustomTodoTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_custom_todos'"
  );
  if (!dailyCustomTodoTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_custom_todos (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, date TEXT NOT NULL,
      name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
      todo_order INTEGER NOT NULL DEFAULT 0, recurring INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure daily_todo_history table exists
  const dailyTodoHistoryTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_todo_history'"
  );
  if (!dailyTodoHistoryTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_todo_history (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, date TEXT NOT NULL,
      plan_items TEXT NOT NULL DEFAULT '[]', custom_todos TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  if (!planTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', slogan TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'not_started',
      progress INTEGER NOT NULL DEFAULT 0, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS plan_items (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, content_url TEXT NOT NULL DEFAULT '',
      total_checkin_days INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_started',
      progress INTEGER NOT NULL DEFAULT 0, link TEXT NOT NULL DEFAULT 'manual',
      priority TEXT NOT NULL DEFAULT 'medium', target_metric TEXT NOT NULL DEFAULT '',
      link_config TEXT NOT NULL DEFAULT '{}', item_order INTEGER NOT NULL DEFAULT 0,
      frequency TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS plan_item_checkins (
      id TEXT PRIMARY KEY, plan_item_id TEXT NOT NULL, date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '', linked_module TEXT DEFAULT '',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Remove CHECK(length(insight) <= 20) constraint from fasting_sessions
  // by recreating the table (SQLite doesn't support ALTER TABLE DROP CHECK)
  const hasInsightCheck = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='fasting_sessions'"
  );
  if (hasInsightCheck?.sql?.includes('CHECK(length(insight)')) {
    await db.execAsync(`CREATE TABLE fasting_sessions_new (
      id TEXT PRIMARY KEY, target_hours REAL NOT NULL, started_at INTEGER NOT NULL,
      ended_at INTEGER, estimated_kcal INTEGER, insight TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync(`INSERT INTO fasting_sessions_new SELECT * FROM fasting_sessions`);
    await db.execAsync(`DROP TABLE fasting_sessions`);
    await db.execAsync(`ALTER TABLE fasting_sessions_new RENAME TO fasting_sessions`);
  }

  // Add missing indexes for frequently queried columns
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_food_entry_date ON food_entries(entry_date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_exercise_ts ON exercise_entries(ts)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_plan_item_checkins_lookup ON plan_item_checkins(plan_item_id, date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_daily_custom_todos_lookup ON daily_custom_todos(plan_id, date)');
}

// ── Generic helpers ───────────────────────────────────────────────
export async function getState(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?', [key]
  );
  return row?.value ?? null;
}

export async function setState(db: SQLite.SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_state(key,value) VALUES(?,?)', [key, value]
  );
}

