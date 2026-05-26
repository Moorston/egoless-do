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
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_entries (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  cal        INTEGER NOT NULL DEFAULT 0,
  note       TEXT    DEFAULT '',
  entry_date TEXT    NOT NULL,
  ts         INTEGER NOT NULL,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checkin_records (
  date      TEXT PRIMARY KEY,
  done      INTEGER NOT NULL DEFAULT 0,
  note      TEXT    DEFAULT '',
  streak    INTEGER NOT NULL DEFAULT 0,
  timestamp INTEGER,
  weight    REAL,
  synced    INTEGER NOT NULL DEFAULT 0
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
  synced        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
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

export async function markSynced(
  db: SQLite.SQLiteDatabase, table: string, ids: string[]
): Promise<void> {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`, ids
  );
}
