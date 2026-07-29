// ─── SQLite schema & queries (expo-sqlite v15 API) ───────────────
import { createLogger } from '@egoless-do/core';
import * as SQLite from 'expo-sqlite';

const log = createLogger('DB');

export const DB_NAME = 'egoless_do.db';

/** Global write mutex — prevents concurrent SQLite transactions. */
let _writeMutex: Promise<void> = Promise.resolve();

/**
 * Run an async function with exclusive write access to the database.
 * Serializes all calls so only one transaction executes at a time.
 */
export async function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = _writeMutex;
  let resolve!: () => void;
  _writeMutex = new Promise<void>(r => { resolve = r; });
  await release;
  try {
    return await fn();
  } finally {
    resolve();
  }
}

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const instance = await SQLite.openDatabaseAsync(DB_NAME);
      await initDatabase(instance);
      await migrateDatabase(instance);
      return instance;
    })().catch(err => {
      _dbPromise = null;
      throw err;
    });
  }
  return _dbPromise;
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
  linked_plan_item_id TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mind_ts   ON mind_reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mind_tags ON mind_reflections(tags);
// 性能优化：复合索引（deleted + 排序字段）
CREATE INDEX IF NOT EXISTS idx_mind_del_ts ON mind_reflections(deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_del_date ON checkin_records(deleted, date DESC);
CREATE INDEX IF NOT EXISTS idx_trails_del ON thought_trails(deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habits_deleted ON habits(deleted, rowid);

CREATE TABLE IF NOT EXISTS fasting_sessions (
  id             TEXT PRIMARY KEY,
  target_hours   REAL NOT NULL,
  started_at     INTEGER NOT NULL,
  ended_at       INTEGER,
  estimated_kcal INTEGER,
  insight        TEXT CHECK(length(insight) <= 20),
  note           TEXT NOT NULL DEFAULT '',
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
  synced         INTEGER NOT NULL DEFAULT 0,
  vision_id      TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_habits_status ON habits(status, deleted);

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
  total_days INTEGER,
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
  created_at INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','failed','conflict')),
  next_retry_at INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_drain ON sync_queue(status, next_retry_at, id);

CREATE TABLE IF NOT EXISTS sync_metadata (
  entity               TEXT PRIMARY KEY,
  last_sync_timestamp  TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
  last_sync_status     TEXT DEFAULT 'success',
  updated_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_progress (
  entity        TEXT PRIMARY KEY,
  phase         INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','downloading','done','failed')),
  pulled_count  INTEGER NOT NULL DEFAULT 0,
  total_count   INTEGER NOT NULL DEFAULT 0,
  last_page     INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER
);

CREATE TABLE IF NOT EXISTS meditation_history (
  date       TEXT PRIMARY KEY,
  dur_min    INTEGER NOT NULL DEFAULT 0,
  track_id   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
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
  vision_id               TEXT,
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
  tags              TEXT,
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
  plan_id     TEXT,
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
  plan_id     TEXT,
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
  linked_plan_item_ids TEXT,
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

CREATE TABLE IF NOT EXISTS reflection_links (
  link_id      TEXT PRIMARY KEY,
  from_id      TEXT NOT NULL,
  to_id        TEXT NOT NULL,
  link_type    TEXT NOT NULL,
  note         TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER,
  deleted      INTEGER NOT NULL DEFAULT 0,
  synced       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reflection_links_from ON reflection_links(from_id);
CREATE INDEX IF NOT EXISTS idx_reflection_links_to   ON reflection_links(to_id);

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

CREATE TABLE IF NOT EXISTS body_weight_records (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, weight REAL NOT NULL,
  body_fat REAL, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS body_checkins (
  id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, energy INTEGER NOT NULL,
  pain INTEGER NOT NULL, comfort INTEGER NOT NULL, sleep INTEGER NOT NULL,
  tags TEXT, note TEXT, updated_at INTEGER,
  deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sleep_records (
  id            TEXT PRIMARY KEY,
  date          TEXT NOT NULL,
  bedtime_at    INTEGER,
  wake_at       INTEGER,
  duration_min  INTEGER,
  quality       INTEGER,
  barrier_done  INTEGER NOT NULL DEFAULT 0,
  barrier_min   INTEGER,
  away_min      INTEGER,
  practice      TEXT NOT NULL DEFAULT '[]',
  work_state    TEXT,
  body_state    TEXT NOT NULL DEFAULT '[]',
  mind_state    TEXT NOT NULL DEFAULT '[]',
  gratitude     TEXT NOT NULL DEFAULT '[]',
  note          TEXT,
  updated_at    INTEGER,
  deleted       INTEGER NOT NULL DEFAULT 0,
  synced        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sleep_date ON sleep_records(date);

CREATE TABLE IF NOT EXISTS give_entries (
  id            TEXT PRIMARY KEY,
  ts            INTEGER NOT NULL,
  give_type     TEXT NOT NULL DEFAULT 'material',
  content       TEXT NOT NULL DEFAULT '',
  motivation    TEXT,
  anonymous     INTEGER NOT NULL DEFAULT 0,
  amount        REAL,
  reflection_id TEXT,
  updated_at    INTEGER,
  deleted       INTEGER NOT NULL DEFAULT 0,
  synced        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_give_ts ON give_entries(ts);

CREATE TABLE IF NOT EXISTS eating_motivations (
  id             TEXT PRIMARY KEY,
  food_id        TEXT NOT NULL,
  date           TEXT NOT NULL,
  motivation     TEXT NOT NULL,
  hunger_level   INTEGER,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_motivation_date ON eating_motivations(date);
CREATE INDEX IF NOT EXISTS idx_motivation_food ON eating_motivations(food_id);

CREATE TABLE IF NOT EXISTS custom_wuxing_maps (
  id             TEXT PRIMARY KEY,
  food_name      TEXT NOT NULL,
  flavor         TEXT NOT NULL,
  element        TEXT NOT NULL,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fear_entries (
  id                    TEXT PRIMARY KEY,
  date                  TEXT NOT NULL,
  timestamp             INTEGER NOT NULL,
  content               TEXT NOT NULL,
  trigger_context       TEXT NOT NULL DEFAULT '',
  category              TEXT NOT NULL DEFAULT 'unknown',
  classification        TEXT NOT NULL DEFAULT 'mixed',
  classification_answers TEXT NOT NULL DEFAULT '{}',
  worst_outcome         TEXT,
  probability           INTEGER,
  coping_ability        INTEGER,
  fear_index            INTEGER,
  body_locations        TEXT NOT NULL DEFAULT '[]',
  occurrence_count      INTEGER NOT NULL DEFAULT 1,
  updated_at            INTEGER,
  deleted               INTEGER NOT NULL DEFAULT 0,
  synced                INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fear_date ON fear_entries(date);

CREATE TABLE IF NOT EXISTS courage_entries (
  id             TEXT PRIMARY KEY,
  date           TEXT NOT NULL,
  timestamp      INTEGER NOT NULL,
  fear_id        TEXT,
  action         TEXT NOT NULL,
  fear_before    INTEGER NOT NULL,
  feeling        TEXT,
  feeling_tags   TEXT NOT NULL DEFAULT '[]',
  streak         INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_courage_date ON courage_entries(date);

CREATE TABLE IF NOT EXISTS fear_achievements (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  unlocked_at    INTEGER NOT NULL,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sutra_reading_sessions (
  id             TEXT PRIMARY KEY,
  mantra_id      TEXT NOT NULL,
  date           TEXT NOT NULL,
  pages_read     INTEGER NOT NULL DEFAULT 0,
  duration_sec   INTEGER NOT NULL DEFAULT 0,
  completed      INTEGER NOT NULL DEFAULT 0,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sutra_reading_date ON sutra_reading_sessions(date);

CREATE TABLE IF NOT EXISTS breath_records (
  id             TEXT PRIMARY KEY,
  date           TEXT NOT NULL,
  preset_key     TEXT NOT NULL DEFAULT '',
  duration_sec   INTEGER NOT NULL DEFAULT 0,
  cycles         INTEGER NOT NULL DEFAULT 0,
  pre_distress   INTEGER NOT NULL DEFAULT 5,
  post_distress  INTEGER NOT NULL DEFAULT 5,
  reflection     TEXT NOT NULL DEFAULT '',
  guide_style    TEXT NOT NULL DEFAULT 'scientific',
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_breath_records_date ON breath_records(date);

CREATE TABLE IF NOT EXISTS custom_food_presets (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL DEFAULT '',
  calories   INTEGER NOT NULL DEFAULT 0,
  note       TEXT    DEFAULT '',
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visions (
  id              TEXT PRIMARY KEY,
  type            TEXT    NOT NULL,
  text            TEXT    NOT NULL,
  time_frame      TEXT,
  start_date      TEXT,
  deadline        TEXT,
  status          TEXT    NOT NULL DEFAULT 'active',
  achieved_at     INTEGER,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vision_practices (
  id         TEXT PRIMARY KEY,
  vision_id  TEXT NOT NULL,
  ref_type   TEXT NOT NULL,
  ref_id     TEXT NOT NULL,
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dedications (
  id             TEXT PRIMARY KEY,
  date           TEXT    NOT NULL,
  period_label   TEXT    NOT NULL,
  type           TEXT    NOT NULL,
  practice_days  INTEGER NOT NULL,
  total_days     INTEGER NOT NULL,
  habit_stats    TEXT,
  plan_progress  TEXT,
  vision_progress TEXT,
  insight        TEXT,
  adjustment     TEXT,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mantra_defs (
  id               TEXT PRIMARY KEY,
  name             TEXT    NOT NULL,
  subtitle         TEXT,
  category         TEXT    NOT NULL DEFAULT 'custom',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  target_count     INTEGER,
  audio_url        TEXT,
  audio_attribution TEXT,
  preset           INTEGER,
  pronunciation    TEXT,
  meaning          TEXT,
  full_text        TEXT,
  page_count       INTEGER,
  updated_at       INTEGER,
  deleted          INTEGER NOT NULL DEFAULT 0,
  synced           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mantra_sessions (
  id             TEXT PRIMARY KEY,
  mantra_id      TEXT NOT NULL,
  date           TEXT NOT NULL,
  count          INTEGER NOT NULL,
  rounds         INTEGER NOT NULL,
  duration_sec   INTEGER NOT NULL,
  started_at     INTEGER NOT NULL,
  completed_at   INTEGER NOT NULL,
  target_rounds  INTEGER,
  dedication     TEXT,
  updated_at     INTEGER,
  deleted        INTEGER NOT NULL DEFAULT 0,
  synced         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS body_goals (
  id              TEXT PRIMARY KEY,
  target_weight   REAL,
  target_body_fat REAL,
  target_date     TEXT,
  strategy        TEXT,
  note            TEXT,
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS body_plans (
  id         TEXT PRIMARY KEY,
  type       TEXT    NOT NULL DEFAULT 'weekly',
  goal_id    TEXT,
  weekday    INTEGER NOT NULL,
  part       TEXT    NOT NULL,
  sport_key  TEXT,
  note       TEXT,
  updated_at INTEGER,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_body_plans_weekday ON body_plans(weekday);

CREATE TABLE IF NOT EXISTS body_training_plans (
  id              TEXT PRIMARY KEY,
  type            TEXT    NOT NULL DEFAULT 'training',
  name            TEXT    NOT NULL,
  start_date      TEXT    NOT NULL,
  end_date        TEXT    NOT NULL,
  strategy        TEXT,
  target_weight   REAL,
  target_body_fat REAL,
  goal_note       TEXT,
  tasks           TEXT    NOT NULL DEFAULT '[]',
  overrides       TEXT,
  status          TEXT    NOT NULL DEFAULT 'active',
  updated_at      INTEGER,
  deleted         INTEGER NOT NULL DEFAULT 0,
  synced          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zhiguan_sessions (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT,
  status                  TEXT NOT NULL DEFAULT 'completed',
  start_ts                INTEGER NOT NULL,
  end_ts                  INTEGER,
  sankalpa                TEXT,
  preliminary_level       TEXT,
  chosen_method           TEXT,
  samatha_ratio_avg       REAL,
  vipassana_ratio_avg     REAL,
  total_breaths           INTEGER,
  closing_notes           TEXT,
  self_reported_stage     TEXT,
  self_reported_stage_text TEXT,
  dedication_id           TEXT,
  five_hindrances         TEXT,
  eight_tactile           TEXT,
  meta                    TEXT,
  updated_at              INTEGER,
  deleted                 INTEGER NOT NULL DEFAULT 0,
  synced                  INTEGER NOT NULL DEFAULT 0
);
`;

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Outer guard: a failure in any single migration block must NOT abort the
  // entire openDatabase() chain — otherwise one bad migration bricks the app
  // on next cold start. Each block also has its own inner try-catch; this is
  // a last-resort safety net so the DB still opens and the app remains usable.
  try {
  const tryAddCol = async (table: string, column: string, type: string) => {
    // Check if column already exists using PRAGMA (robust across SQLite versions)
    const existing = await db.getFirstAsync<{ name: string }>(
      `SELECT name FROM pragma_table_info('${table}') WHERE name = '${column}'`
    );
    if (existing) return; // Column already exists, skip
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };

  await tryAddCol('habits', 'synced', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('mind_reflections', 'linked_plan_id', 'TEXT');
  await tryAddCol('mind_reflections', 'linked_plan_item_id', 'TEXT');
  await tryAddCol('food_entries', 'synced', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('checkin_records', 'timestamp', 'INTEGER');
  await tryAddCol('checkin_records', 'weight', 'REAL');
  await tryAddCol('checkin_records', 'grace', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('checkin_records', 'total_days', 'INTEGER');

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

  // Ensure sync_queue table exists with retry/status fields
  const syncQueueCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_queue'"
  );
  if (!syncQueueCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
      payload TEXT NOT NULL, created_at INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0, last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','failed','conflict')),
      next_retry_at INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity, entity_id)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)');
  } else {
    // Migrate existing sync_queue: check each column by pragma before adding
    const sqCols = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(sync_queue)"
    );
    const sqColNames = new Set(sqCols.map(c => c.name));
    if (!sqColNames.has('retry_count')) {
      await db.execAsync("ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0");
    }
    if (!sqColNames.has('last_error')) {
      await db.execAsync("ALTER TABLE sync_queue ADD COLUMN last_error TEXT");
    }
    if (!sqColNames.has('status')) {
      await db.execAsync("ALTER TABLE sync_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
    }
    if (!sqColNames.has('next_retry_at')) {
      await db.execAsync("ALTER TABLE sync_queue ADD COLUMN next_retry_at INTEGER NOT NULL DEFAULT 0");
    }
    try {
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)');
    } catch (e) { const msg = String(e instanceof Error ? e.message : e ?? ''); if (!msg.includes('already exists')) log.warn('[DB] index failed:', msg); }
    try {
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_sync_queue_drain ON sync_queue(status, next_retry_at, id)');
    } catch (e) { const msg = String(e instanceof Error ? e.message : e ?? ''); if (!msg.includes('already exists')) log.warn('[DB] index failed:', msg); }
    // Migrate entity index to UNIQUE for UPSERT support
    try {
      // Remove duplicate entries before creating unique index
      await db.runAsync(`DELETE FROM sync_queue WHERE id NOT IN (
        SELECT MIN(id) FROM sync_queue GROUP BY entity, entity_id
      )`);
      await db.execAsync('DROP INDEX IF EXISTS idx_sync_queue_entity');
      await db.execAsync('CREATE UNIQUE INDEX idx_sync_queue_entity ON sync_queue(entity, entity_id)');
    } catch (e) {
      log.warn('[DB] sync_queue unique index migration:', e);
    }
  }

  // Ensure sync_metadata table exists
  const syncMetaCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_metadata'"
  );
  if (!syncMetaCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS sync_metadata (
      entity TEXT PRIMARY KEY, last_sync_timestamp TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
      last_sync_status TEXT DEFAULT 'success', updated_at TEXT DEFAULT (datetime('now'))
    )`);
  }

  // Ensure sync_progress table exists
  const syncProgressCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_progress'"
  );
  if (!syncProgressCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS sync_progress (
      entity TEXT PRIMARY KEY, phase INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','downloading','done','failed')),
      pulled_count INTEGER NOT NULL DEFAULT 0, total_count INTEGER NOT NULL DEFAULT 0,
      last_page INTEGER NOT NULL DEFAULT 0, last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0, next_retry_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER
    )`);
  }

  // Ensure meditation_history table exists with new schema
  const medTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='meditation_history'"
  );
  if (!medTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS meditation_history (
      date TEXT PRIMARY KEY, dur_min INTEGER NOT NULL DEFAULT 0, track_id TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '', updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`);
  } else {
    // Migrate old columns: add dur_min, track_id, note if missing
    const medCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(meditation_history)");
    const medColNames = new Set(medCols.map(c => c.name));
    if (!medColNames.has('dur_min')) {
      await db.execAsync('ALTER TABLE meditation_history ADD COLUMN dur_min INTEGER NOT NULL DEFAULT 0');
      // Migrate dur string to dur_min number
      await db.runAsync("UPDATE meditation_history SET dur_min = CAST(REPLACE(dur, 'min', '') AS INTEGER) WHERE dur IS NOT NULL");
    }
    if (!medColNames.has('track_id')) {
      await db.execAsync("ALTER TABLE meditation_history ADD COLUMN track_id TEXT NOT NULL DEFAULT ''");
    }
    if (!medColNames.has('note')) {
      await db.execAsync("ALTER TABLE meditation_history ADD COLUMN note TEXT NOT NULL DEFAULT ''");
    }
    // Drop old dur column (replaced by dur_min) to avoid NOT NULL constraint on INSERT
    if (medColNames.has('dur')) {
      await db.execAsync('ALTER TABLE meditation_history DROP COLUMN dur');
    }
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
      reflection_ids TEXT NOT NULL DEFAULT '[]', linked_plan_item_ids TEXT,
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
  await tryAddCol('thought_trails', 'linked_plan_item_ids', 'TEXT');

  // Add alarm columns to habits if missing
  await tryAddCol('habits', 'alarm_enabled', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('habits', 'alarm_hour', 'INTEGER NOT NULL DEFAULT 8');
  await tryAddCol('habits', 'alarm_minute', 'INTEGER NOT NULL DEFAULT 0');
  await tryAddCol('habits', 'link', "TEXT NOT NULL DEFAULT 'none'");
  await tryAddCol('habits', 'link_config', "TEXT");
  await tryAddCol('habits', 'vision_id', "TEXT DEFAULT ''");

  // Add thought_trail_ids to mind_reflections
  await tryAddCol('mind_reflections', 'thought_trail_ids', 'TEXT');

  // Add complete_reason to plans
  await tryAddCol('plans', 'complete_reason', 'TEXT');
  await tryAddCol('plans', 'vision_id', 'TEXT');

  // Add local_engine_enabled to ai_configs
  await tryAddCol('ai_configs', 'local_engine_enabled', 'INTEGER NOT NULL DEFAULT 1');

  // Add exercise metadata columns if missing
  await tryAddCol('exercise_entries', 'mode', "TEXT DEFAULT 'free'");
  await tryAddCol('exercise_entries', 'target', 'TEXT');
  await tryAddCol('exercise_entries', 'segment_paces', 'TEXT');
  await tryAddCol('exercise_entries', 'elevation_gain', 'REAL');
  await tryAddCol('exercise_entries', 'paused_duration', 'INTEGER');
  await tryAddCol('exercise_entries', 'reps', 'INTEGER');
  await tryAddCol('exercise_entries', 'sets', 'TEXT');
  await tryAddCol('exercise_entries', 'met', 'REAL');
  await tryAddCol('exercise_entries', 'combo_exercises', 'TEXT');

  // Add trail_id column to plan_items if missing
  await tryAddCol('plan_items', 'trail_id', 'TEXT');

  // Add tags column to plan_items if missing
  await tryAddCol('plan_items', 'tags', 'TEXT');

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

  // Ensure reflection_links table exists
  const reflectionLinksTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='reflection_links'"
  );
  if (!reflectionLinksTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS reflection_links (
      link_id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL,
      link_type TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_reflection_links_from ON reflection_links(from_id)');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_reflection_links_to   ON reflection_links(to_id)');
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
      id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
      name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
      todo_order INTEGER NOT NULL DEFAULT 0, recurring INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Relax plan_id constraint (server data may have null plan_id for standalone todos)
  // Only run if plan_id still has NOT NULL (migration not yet applied)
  const planIdCol = await db.getFirstAsync<{ notnull: number }>(
    'SELECT "notnull" FROM pragma_table_info(\'daily_custom_todos\') WHERE name = \'plan_id\''
  );
  const planIdNotNull = planIdCol?.notnull ?? 1;
  if (planIdNotNull === 1) {
    // Wrapped in explicit transaction so DROP+RENAME is atomic
    try {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_custom_todos_new (
        id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
        name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
        todo_order INTEGER NOT NULL DEFAULT 0, recurring INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
      )`);
      await db.execAsync(`INSERT OR IGNORE INTO daily_custom_todos_new SELECT * FROM daily_custom_todos`);
      await db.execAsync(`DROP TABLE daily_custom_todos`);
      await db.execAsync(`ALTER TABLE daily_custom_todos_new RENAME TO daily_custom_todos`);
      await db.execAsync('COMMIT');
    } catch (e) {
      try { await db.execAsync('ROLLBACK'); } catch { /* best effort rollback */ }
      log.warn('[DB] daily_custom_todos migration transaction failed:', e);
    }
  }

  // Ensure daily_todo_history table exists
  const dailyTodoHistoryTableCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_todo_history'"
  );
  if (!dailyTodoHistoryTableCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_todo_history (
      id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
      plan_items TEXT NOT NULL DEFAULT '[]', custom_todos TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Migrate daily_todo_history: make plan_id nullable for existing databases
  try {
    const colInfo = await db.getAllAsync<{ name: string; notnull: number }>(
      "PRAGMA table_info(daily_todo_history)"
    );
    const planIdCol = colInfo.find(c => c.name === 'plan_id');
    if (planIdCol && planIdCol.notnull === 1) {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_todo_history_new (
        id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
        plan_items TEXT NOT NULL DEFAULT '[]', custom_todos TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
      )`);
      await db.execAsync(`INSERT OR IGNORE INTO daily_todo_history_new SELECT * FROM daily_todo_history`);
      await db.execAsync(`DROP TABLE daily_todo_history`);
      await db.execAsync(`ALTER TABLE daily_todo_history_new RENAME TO daily_todo_history`);
      await db.execAsync('COMMIT');
    }
  } catch (e) {
    try { await db.execAsync('ROLLBACK'); } catch { /* best effort rollback */ }
    log.warn('[DB] daily_todo_history plan_id nullable migration failed:', e);
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
  // Wrapped in explicit transaction so INSERT+DROP+RENAME is atomic
  const hasInsightCheck = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='fasting_sessions'"
  );
  if (hasInsightCheck?.sql?.includes('CHECK(length(insight)')) {
    try {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(`CREATE TABLE fasting_sessions_new (
        id TEXT PRIMARY KEY, target_hours REAL NOT NULL, started_at INTEGER NOT NULL,
        ended_at INTEGER, estimated_kcal INTEGER, insight TEXT, note TEXT NOT NULL DEFAULT '',
        updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
      )`);
      await db.execAsync(`INSERT INTO fasting_sessions_new SELECT * FROM fasting_sessions`);
      await db.execAsync(`DROP TABLE fasting_sessions`);
      await db.execAsync(`ALTER TABLE fasting_sessions_new RENAME TO fasting_sessions`);
      await db.execAsync('COMMIT');
    } catch (e) {
      try { await db.execAsync('ROLLBACK'); } catch { /* best effort rollback */ }
      log.warn('[DB] fasting_sessions CHECK removal transaction failed:', e);
    }
  }

  // Add note column to fasting_sessions if missing
  const fastingCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(fasting_sessions)");
  if (!fastingCols.some(c => c.name === 'note')) {
    await db.execAsync("ALTER TABLE fasting_sessions ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  }

  // Add audio columns to mantra_defs
  await tryAddCol('mantra_defs', 'audio_url', 'TEXT');
  await tryAddCol('mantra_defs', 'audio_attribution', 'TEXT');
  // Add missing mantra fields for full sync support
  await tryAddCol('mantra_defs', 'preset', 'INTEGER');
  await tryAddCol('mantra_defs', 'pronunciation', 'TEXT');
  await tryAddCol('mantra_defs', 'meaning', 'TEXT');
  await tryAddCol('mantra_defs', 'full_text', 'TEXT');
  await tryAddCol('mantra_defs', 'page_count', 'INTEGER');

  // Add missing indexes for frequently queried columns
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_food_entry_date ON food_entries(entry_date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_exercise_ts ON exercise_entries(ts)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_plan_item_checkins_lookup ON plan_item_checkins(plan_item_id, date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_daily_custom_todos_lookup ON daily_custom_todos(plan_id, date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_fasting_started ON fasting_sessions(started_at)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_body_weight_date ON body_weight_records(date)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_body_checkins_date ON body_checkins(date)');

  // Migrate checkin_reviews: add UNIQUE index on review_id for UPSERT support
  try {
    await db.runAsync(`DELETE FROM checkin_reviews WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM checkin_reviews GROUP BY review_id
    )`);
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_reviews_review_id ON checkin_reviews(review_id)');
  } catch (e) {
    log.warn('[DB] checkin_reviews unique index migration:', e);
  }

  // Ensure body_goals table exists
  const bodyGoalsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='body_goals'"
  );
  if (!bodyGoalsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS body_goals (
      id TEXT PRIMARY KEY, target_weight REAL, target_body_fat REAL,
      target_date TEXT, strategy TEXT, note TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure body_plans table exists
  const bodyPlansCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='body_plans'"
  );
  if (!bodyPlansCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS body_plans (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'weekly',
      goal_id TEXT, weekday INTEGER NOT NULL,
      part TEXT NOT NULL, sport_key TEXT, note TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_body_plans_weekday ON body_plans(weekday)');
  } else {
    // Add type column if missing (P0-4 migration)
    await tryAddCol('body_plans', 'type', 'TEXT NOT NULL DEFAULT \'weekly\'');
  }

  // Ensure body_training_plans table exists
  const trainingPlanCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='body_training_plans'"
  );
  if (!trainingPlanCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS body_training_plans (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'training',
      name TEXT NOT NULL, start_date TEXT NOT NULL,
      end_date TEXT NOT NULL, strategy TEXT, target_weight REAL,
      target_body_fat REAL, goal_note TEXT, tasks TEXT NOT NULL DEFAULT '[]',
      overrides TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  } else {
    // Add overrides column if missing (migration)
    await tryAddCol('body_training_plans', 'overrides', 'TEXT');
    // Add type column if missing (P0-4 migration)
    await tryAddCol('body_training_plans', 'type', 'TEXT NOT NULL DEFAULT \'training\'');
  }

  // Ensure body_weight_records table exists
  const bodyWeightCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='body_weight_records'"
  );
  if (!bodyWeightCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS body_weight_records (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, weight REAL NOT NULL,
      body_fat REAL, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure body_checkins table exists
  const bodyCheckinsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='body_checkins'"
  );
  if (!bodyCheckinsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS body_checkins (
      id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, energy INTEGER NOT NULL,
      pain INTEGER NOT NULL, comfort INTEGER NOT NULL, sleep INTEGER NOT NULL,
      tags TEXT, note TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure visions table exists
  const visionsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='visions'"
  );
  if (!visionsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS visions (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, text TEXT NOT NULL,
      time_frame TEXT, start_date TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'active',
      achieved_at INTEGER, sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Add start_date column to visions if missing
  await tryAddCol('visions', 'start_date', 'TEXT');

  // Ensure vision_practices table exists
  const visionPracticesCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='vision_practices'"
  );
  if (!visionPracticesCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS vision_practices (
      id TEXT PRIMARY KEY, vision_id TEXT NOT NULL, ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure dedications table exists
  const dedicationsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='dedications'"
  );
  if (!dedicationsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS dedications (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, period_label TEXT NOT NULL,
      type TEXT NOT NULL, practice_days INTEGER NOT NULL, total_days INTEGER NOT NULL,
      habit_stats TEXT, plan_progress TEXT, vision_progress TEXT,
      insight TEXT, adjustment TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure mantra_defs table exists
  const mantraDefsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='mantra_defs'"
  );
  if (!mantraDefsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS mantra_defs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, subtitle TEXT,
      category TEXT NOT NULL DEFAULT 'custom', sort_order INTEGER NOT NULL DEFAULT 0,
      target_count INTEGER, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure mantra_sessions table exists
  const mantraSessionsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='mantra_sessions'"
  );
  if (!mantraSessionsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS mantra_sessions (
      id TEXT PRIMARY KEY, mantra_id TEXT NOT NULL, date TEXT NOT NULL,
      count INTEGER NOT NULL, rounds INTEGER NOT NULL, duration_sec INTEGER NOT NULL,
      started_at INTEGER NOT NULL, completed_at INTEGER NOT NULL,
      target_rounds INTEGER, dedication TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Ensure zhiguan_sessions table exists
  const zhiguanSessionsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='zhiguan_sessions'"
  );
  if (!zhiguanSessionsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS zhiguan_sessions (
      id TEXT PRIMARY KEY, user_id TEXT, status TEXT NOT NULL DEFAULT 'completed',
      start_ts INTEGER NOT NULL, end_ts INTEGER, sankalpa TEXT,
      preliminary_level TEXT, chosen_method TEXT,
      samatha_ratio_avg REAL, vipassana_ratio_avg REAL,
      total_breaths INTEGER, closing_notes TEXT,
      self_reported_stage TEXT, self_reported_stage_text TEXT,
      dedication_id TEXT, five_hindrances TEXT, eight_tactile TEXT, meta TEXT,
      updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
  }

  // Add missing zhiguan_sessions columns
  await tryAddCol('zhiguan_sessions', 'end_ts', 'INTEGER');
  await tryAddCol('zhiguan_sessions', 'five_hindrances', 'TEXT');
  await tryAddCol('zhiguan_sessions', 'eight_tactile', 'TEXT');
  await tryAddCol('zhiguan_sessions', 'meta', 'TEXT');

  // Ensure breath_records table exists
  const breathRecordsCheck = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='breath_records'"
  );
  if (!breathRecordsCheck) {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS breath_records (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, preset_key TEXT NOT NULL DEFAULT '',
      duration_sec INTEGER NOT NULL DEFAULT 0, cycles INTEGER NOT NULL DEFAULT 0,
      pre_distress INTEGER NOT NULL DEFAULT 5, post_distress INTEGER NOT NULL DEFAULT 5,
      reflection TEXT NOT NULL DEFAULT '', guide_style TEXT NOT NULL DEFAULT 'scientific',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`);
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_breath_records_date ON breath_records(date)');
  }
  // Ensure synced column exists (for devices that had breath_records before synced was added)
  await tryAddCol('breath_records', 'synced', 'INTEGER NOT NULL DEFAULT 0');

  // Cleanup: remove auto-added preset mantras from old versions (before auto-init was removed)
  // Only delete presets that have NO associated sessions (user never actually used them)
  const PRESET_NAMES = [
    '六字大明咒','大悲咒','准提神咒','往生净土神咒','楞严咒','药师灌顶真言',
    '地藏菩萨灭定业真言','文殊心咒','如意宝轮王陀罗尼','消灾吉祥神咒','功德宝山神咒',
    '圣无量寿决定光明王陀罗尼','观音灵感真言','七佛灭罪真言','大吉祥天女咒','大随求心咒',
    '绿度母心咒','白度母心咒','莲师心咒','金刚萨埵心咒','百字明咒','阿弥陀佛心咒',
    '释迦牟尼佛心咒','不动佛心咒','南无阿弥陀佛','南无本师释迦牟尼佛','南无药师琉璃光如来',
    '南无大日如来','南无不动如来','南无观世音菩萨','南无大势至菩萨','南无地藏王菩萨',
    '南无文殊师利菩萨','南无普贤菩萨','南无弥勒菩萨','南无虚空藏菩萨',
  ];
  try {
    const existingPresets = await db.getAllAsync<{ id: string; name: string }>(
      `SELECT id, name FROM mantra_defs WHERE name IN (${PRESET_NAMES.map(() => '?').join(',')}) AND deleted = 0 AND preset = 1`,
      [...PRESET_NAMES]
    );
    for (const preset of existingPresets) {
      const session = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM mantra_sessions WHERE mantra_id = ? AND deleted = 0',
        [preset.id]
      );
      if (!session || session.cnt === 0) {
        await db.runAsync('DELETE FROM mantra_defs WHERE id = ?', [preset.id]);
      }
    }
  } catch (e) {
    log.warn('[DB] Preset cleanup migration failed:', e);
  }
  } catch (e) {
    // Migration failed — log and continue. The DB is still usable; missing
    // columns/tables are handled by rehydrateFromDb's per-entity try-catch.
    log.error(e, { message: 'migrateDatabase failed (non-fatal) — some migrations may be incomplete' });
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

/**
 * Force WAL pages back into the main database file.
 *
 * On Android (esp. MIUI) a process kill between a SQLite COMMIT and the OS's
 * own checkpoint can discard the un-checkpointed WAL tail, silently losing
 * recently-written rows. Call this when the app transitions to the background
 * so the next cold start reads a consistent DB. Best-effort: failures are
 * non-fatal (e.g. DB not yet opened, or mid-transaction contention).
 */
export async function checkpointDatabase(): Promise<void> {
  try {
    const db = await openDatabase();
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (err) {
    log.warn('checkpointDatabase failed (non-fatal)', err instanceof Error ? err.message : String(err));
  }
}

