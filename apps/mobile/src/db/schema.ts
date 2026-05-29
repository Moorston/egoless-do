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

CREATE TABLE IF NOT EXISTS habit_records (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK(type IN ('fasting','meditation','running','custom')),
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,
  duration_s   INTEGER,
  insight      TEXT CHECK(length(insight) <= 20),
  linked_mind_id TEXT,
  synced       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mind_reflections (
  id              TEXT PRIMARY KEY,
  created_at      INTEGER NOT NULL,
  content         TEXT    NOT NULL,
  tags            TEXT    NOT NULL DEFAULT '[]',
  mood            TEXT,
  card_theme      TEXT,
  linked_habit_id TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER,
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
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkin_records (
  date       TEXT PRIMARY KEY,
  done       INTEGER NOT NULL DEFAULT 0,
  note       TEXT    DEFAULT '',
  streak     INTEGER NOT NULL DEFAULT 0,
  timestamp  INTEGER,
  weight     REAL,
  updated_at INTEGER,
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
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL,
  goal        TEXT    NOT NULL DEFAULT '',
  slogan      TEXT    NOT NULL DEFAULT '',
  start_date  TEXT    NOT NULL,
  end_date    TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'not_started',
  progress    INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER,
  deleted     INTEGER NOT NULL DEFAULT 0,
  synced      INTEGER NOT NULL DEFAULT 0
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
  link_config       TEXT    NOT NULL DEFAULT '{}',
  item_order        INTEGER NOT NULL DEFAULT 0,
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
`;

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const habitsInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(habits)');
  if (!habitsInfo.some(col => col.name === 'synced')) {
    await db.execAsync('ALTER TABLE habits ADD COLUMN synced INTEGER NOT NULL DEFAULT 0');
  }
  const foodInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(food_entries)');
  if (!foodInfo.some(col => col.name === 'synced')) {
    await db.execAsync('ALTER TABLE food_entries ADD COLUMN synced INTEGER NOT NULL DEFAULT 0');
  }
  const checkinInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(checkin_records)');
  if (!checkinInfo.some(col => col.name === 'timestamp')) {
    await db.execAsync('ALTER TABLE checkin_records ADD COLUMN timestamp INTEGER');
  }
  if (!checkinInfo.some(col => col.name === 'weight')) {
    await db.execAsync('ALTER TABLE checkin_records ADD COLUMN weight REAL');
  }

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
  const exerciseColInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercise_entries)');
  if (!exerciseColInfo.some(col => col.name === 'health_synced')) {
    await db.execAsync('ALTER TABLE exercise_entries ADD COLUMN health_synced INTEGER NOT NULL DEFAULT 0');
  }

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

  // Ensure plan tables exist
  const planTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='plans'"
  );
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
      link_config TEXT NOT NULL DEFAULT '{}', item_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS plan_item_checkins (
      id TEXT PRIMARY KEY, plan_item_id TEXT NOT NULL, date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '', linked_module TEXT DEFAULT '',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }
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

// ── Sync helpers ─────────────────────────────────────────────────
export async function getUnsynced(db: SQLite.SQLiteDatabase): Promise<{
  habits: unknown[]; reflections: unknown[]; fastingSessions: unknown[];
}> {
  const [habits, reflections, fastingSessions] = await Promise.all([
    db.getAllAsync('SELECT * FROM habits WHERE synced = 0'),
    db.getAllAsync('SELECT * FROM mind_reflections WHERE synced = 0'),
    db.getAllAsync('SELECT * FROM fasting_sessions WHERE ended_at IS NOT NULL'),
  ]);
  return { habits, reflections, fastingSessions };
}

// ── Plan SQLite helpers ──────────────────────────────────────────
export async function dbUpsertPlan(db: SQLite.SQLiteDatabase, p: {
  id: string; name: string; goal: string; slogan: string;
  startDate: string; endDate: string; status: string; progress: number;
  updatedAt?: number; deleted?: boolean;
}): Promise<void> {
  await db.runAsync(`
    INSERT OR REPLACE INTO plans (id,name,goal,slogan,start_date,end_date,status,progress,updated_at,deleted,synced)
    VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
    [p.id, p.name, p.goal, p.slogan, p.startDate, p.endDate, p.status, p.progress, p.updatedAt ?? null, p.deleted ? 1 : 0]
  );
}

export async function dbDeletePlan(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE plans SET synced = 2, deleted = 1 WHERE id = ?', [id]);
}

export async function dbUpsertPlanItem(db: SQLite.SQLiteDatabase, i: {
  id: string; planId: string; name: string; description: string;
  startDate: string; endDate: string; contentUrl: string;
  totalCheckinDays: number; status: string; progress: number;
  link: string; linkConfig?: Record<string, unknown>; order: number;
  updatedAt?: number; deleted?: boolean;
}): Promise<void> {
  await db.runAsync(`
    INSERT OR REPLACE INTO plan_items
    (id,plan_id,name,description,start_date,end_date,content_url,total_checkin_days,
     status,progress,link,link_config,item_order,updated_at,deleted,synced)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    [i.id, i.planId, i.name, i.description, i.startDate, i.endDate, i.contentUrl,
     i.totalCheckinDays, i.status, i.progress, i.link, JSON.stringify(i.linkConfig ?? {}),
     i.order, i.updatedAt ?? null, i.deleted ? 1 : 0]
  );
}

export async function dbDeletePlanItem(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE plan_items SET synced = 2, deleted = 1 WHERE id = ?', [id]);
}

export async function dbUpsertPlanItemCheckin(db: SQLite.SQLiteDatabase, c: {
  id: string; planItemId: string; date: string; done: boolean;
  note?: string; linkedModule?: string; updatedAt?: number; deleted?: boolean;
}): Promise<void> {
  await db.runAsync(`
    INSERT OR REPLACE INTO plan_item_checkins
    (id,plan_item_id,date,done,note,linked_module,updated_at,deleted,synced)
    VALUES (?,?,?,?,?,?,?,?,0)`,
    [c.id, c.planItemId, c.date, c.done ? 1 : 0, c.note ?? '', c.linkedModule ?? '', c.updatedAt ?? null, c.deleted ? 1 : 0]
  );
}

export async function dbDeletePlanItemCheckin(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE plan_item_checkins SET synced = 2, deleted = 1 WHERE id = ?', [id]);
}

export async function dbDeletePlanItemsByPlanId(db: SQLite.SQLiteDatabase, planId: string): Promise<void> {
  await db.runAsync('UPDATE plan_items SET synced = 2, deleted = 1 WHERE plan_id = ?', [planId]);
}

export async function dbDeletePlanItemCheckinsByPlanId(db: SQLite.SQLiteDatabase, planId: string): Promise<void> {
  await db.runAsync(
    'UPDATE plan_item_checkins SET synced = 2, deleted = 1 WHERE plan_item_id IN (SELECT id FROM plan_items WHERE plan_id = ?)',
    [planId]
  );
}

export async function markSynced(
  db: SQLite.SQLiteDatabase, table: string, ids: string[]
): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`, ids
  );
}
