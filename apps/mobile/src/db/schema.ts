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
      try {
        console.warn('[DB] Opening database:', DB_NAME);
        const instance = await SQLite.openDatabaseAsync(DB_NAME);
        console.warn('[DB] Database opened successfully');
        await initDatabase(instance);
        console.warn('[DB] Schema initialized');
        await migrateDatabase(instance);
        console.warn('[DB] Migrations complete');
        return instance;
      } catch (err) {
        console.error('[DB] Open failed:', err);
        _dbPromise = null;
        throw err;
      }
    })();
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
CREATE INDEX IF NOT EXISTS idx_mind_del_ts ON mind_reflections(deleted, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_habits_deleted ON habits(deleted);

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

async function migrateSyncQueueColumns(db: SQLite.SQLiteDatabase): Promise<void> {
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

async function migrateMeditationHistory(db: SQLite.SQLiteDatabase): Promise<void> {
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

async function migrateDailyCustomTodosNullable(db: SQLite.SQLiteDatabase): Promise<void> {
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
}

async function migrateDailyTodoHistoryNullable(db: SQLite.SQLiteDatabase): Promise<void> {
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
}

async function migrateFastingSessionsCheck(db: SQLite.SQLiteDatabase): Promise<void> {
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
}

async function migrateCheckinReviewsUniqueIndex(db: SQLite.SQLiteDatabase): Promise<void> {
  // Migrate checkin_reviews: add UNIQUE index on review_id for UPSERT support
  try {
    await db.runAsync(`DELETE FROM checkin_reviews WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM checkin_reviews GROUP BY review_id
    )`);
    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_reviews_review_id ON checkin_reviews(review_id)');
  } catch (e) {
    log.warn('[DB] checkin_reviews unique index migration:', e);
  }
}

// ── Migration helpers ──────────────────────────────────────────────
// 提取自 migrateDatabase 内联逻辑，行为逐字节一致（AC6）。

async function tableExists(db: SQLite.SQLiteDatabase, name: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
  );
  return !!row;
}

async function tryAddCol(db: SQLite.SQLiteDatabase, table: string, column: string, type: string): Promise<void> {
  // Check if column already exists using PRAGMA (robust across SQLite versions)
  const existing = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM pragma_table_info('${table}') WHERE name = '${column}'`
  );
  if (existing) return; // Column already exists, skip
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, type: string): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some(c => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

async function cleanupPresetMantras(db: SQLite.SQLiteDatabase): Promise<void> {
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
}

// ── Table-driven migration step model ──────────────────────────────
// MIGRATION_STEPS 是一个有序数组，逐项对应重构前 migrateDatabase 的执行顺序。
// 重构前后 emitted SQL 序列逐字节一致（AC6）——由 schemaMigrate.test.ts 双快照强制。

type MigrateFn = (db: SQLite.SQLiteDatabase) => Promise<void>;

type MigrationStep =
  | { kind: 'checkTable'; key: string; name: string }
  | { kind: 'ensureTable'; name: string; createSql: string; indexes?: string[]; elseAction?: MigrateFn; afterAction?: MigrateFn }
  | { kind: 'ensureTablesChecked'; key: string; createSqls: string[] }
  | { kind: 'addCol'; table: string; column: string; type: string }
  | { kind: 'ensureColumn'; table: string; column: string; type: string }
  | { kind: 'migrate'; fn: MigrateFn }
  | { kind: 'forAddCol'; tables: string[]; column: string; type: string }
  | { kind: 'createIndex'; sqls: string[] }
  | { kind: 'cleanupPresets' };

const SYNC_TABLES = [
  'habits', 'mind_reflections', 'fasting_sessions', 'food_entries',
  'checkin_records', 'exercise_entries', 'meditation_history', 'user_profiles',
];

const MIGRATION_STEPS: MigrationStep[] = [
  { kind: 'addCol', table: 'habits', column: 'synced', type: 'INTEGER NOT NULL DEFAULT 0' },
  { kind: 'addCol', table: 'mind_reflections', column: 'linked_plan_id', type: 'TEXT' },
  { kind: 'addCol', table: 'mind_reflections', column: 'linked_plan_item_id', type: 'TEXT' },
  { kind: 'addCol', table: 'food_entries', column: 'synced', type: 'INTEGER NOT NULL DEFAULT 0' },
  { kind: 'addCol', table: 'checkin_records', column: 'timestamp', type: 'INTEGER' },
  { kind: 'addCol', table: 'checkin_records', column: 'weight', type: 'REAL' },
  { kind: 'addCol', table: 'checkin_records', column: 'grace', type: 'INTEGER NOT NULL DEFAULT 0' },
  { kind: 'addCol', table: 'checkin_records', column: 'total_days', type: 'INTEGER' },

  { kind: 'ensureTable', name: 'exercise_entries', createSql: `CREATE TABLE IF NOT EXISTS exercise_entries (
      id TEXT PRIMARY KEY, sport_key TEXT NOT NULL, sport_icon TEXT NOT NULL DEFAULT '',
      duration_sec INTEGER NOT NULL DEFAULT 0, distance_km REAL DEFAULT 0,
      calories INTEGER DEFAULT 0, avg_pace REAL DEFAULT 0,
      track_points TEXT DEFAULT '[]', is_gps_sport INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL, synced INTEGER NOT NULL DEFAULT 0
    )` },
  { kind: 'addCol', table: 'exercise_entries', column: 'health_synced', type: 'INTEGER NOT NULL DEFAULT 0' },

  { kind: 'ensureTable', name: 'sync_queue', createSql: `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
      payload TEXT NOT NULL, created_at INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0, last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','syncing','failed','conflict')),
      next_retry_at INTEGER NOT NULL DEFAULT 0
    )`, indexes: [
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
    ], elseAction: migrateSyncQueueColumns },

  { kind: 'ensureTable', name: 'sync_metadata', createSql: `CREATE TABLE IF NOT EXISTS sync_metadata (
      entity TEXT PRIMARY KEY, last_sync_timestamp TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
      last_sync_status TEXT DEFAULT 'success', updated_at TEXT DEFAULT (datetime('now'))
    )` },

  { kind: 'ensureTable', name: 'sync_progress', createSql: `CREATE TABLE IF NOT EXISTS sync_progress (
      entity TEXT PRIMARY KEY, phase INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','downloading','done','failed')),
      pulled_count INTEGER NOT NULL DEFAULT 0, total_count INTEGER NOT NULL DEFAULT 0,
      last_page INTEGER NOT NULL DEFAULT 0, last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0, next_retry_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER
    )` },

  { kind: 'ensureTable', name: 'meditation_history', createSql: `CREATE TABLE IF NOT EXISTS meditation_history (
      date TEXT PRIMARY KEY, dur_min INTEGER NOT NULL DEFAULT 0, track_id TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '', updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`, elseAction: migrateMeditationHistory },

  { kind: 'ensureTable', name: 'user_profiles', createSql: `CREATE TABLE IF NOT EXISTS user_profiles (
      profile_id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'forAddCol', tables: SYNC_TABLES, column: 'updated_at', type: 'INTEGER' },
  { kind: 'forAddCol', tables: SYNC_TABLES, column: 'deleted', type: 'INTEGER NOT NULL DEFAULT 0' },

  { kind: 'addCol', table: 'plan_items', column: 'priority', type: "TEXT NOT NULL DEFAULT 'medium'" },
  { kind: 'addCol', table: 'plan_items', column: 'target_metric', type: "TEXT NOT NULL DEFAULT ''" },
  { kind: 'addCol', table: 'plan_items', column: 'reflection_id', type: 'TEXT' },
  { kind: 'addCol', table: 'plan_items', column: 'frequency', type: 'TEXT' },
  { kind: 'addCol', table: 'mind_reflections', column: 'colors', type: 'TEXT' },
  { kind: 'addCol', table: 'mind_reflections', column: 'link', type: 'TEXT' },
  { kind: 'addCol', table: 'plans', column: 'last_delayed_notify_at', type: 'INTEGER' },

  { kind: 'ensureTable', name: 'thought_trails', createSql: `CREATE TABLE IF NOT EXISTS thought_trails (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
      reflection_ids TEXT NOT NULL DEFAULT '[]', linked_plan_item_ids TEXT,
      source TEXT DEFAULT 'manual', insight_summary TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'addCol', table: 'thought_trails', column: 'source', type: "TEXT DEFAULT 'manual'" },
  { kind: 'addCol', table: 'thought_trails', column: 'insight_summary', type: 'TEXT' },
  { kind: 'addCol', table: 'thought_trails', column: 'note_ids', type: "TEXT NOT NULL DEFAULT '[]'" },
  { kind: 'addCol', table: 'thought_trails', column: 'insight_cache', type: 'TEXT' },
  { kind: 'addCol', table: 'thought_trails', column: 'review_cache', type: 'TEXT' },
  { kind: 'addCol', table: 'thought_trails', column: 'linked_plan_item_ids', type: 'TEXT' },

  { kind: 'addCol', table: 'habits', column: 'alarm_enabled', type: 'INTEGER NOT NULL DEFAULT 0' },
  { kind: 'addCol', table: 'habits', column: 'alarm_hour', type: 'INTEGER NOT NULL DEFAULT 8' },
  { kind: 'addCol', table: 'habits', column: 'alarm_minute', type: 'INTEGER NOT NULL DEFAULT 0' },
  { kind: 'addCol', table: 'habits', column: 'link', type: "TEXT NOT NULL DEFAULT 'none'" },
  { kind: 'addCol', table: 'habits', column: 'link_config', type: "TEXT" },
  { kind: 'addCol', table: 'habits', column: 'vision_id', type: "TEXT DEFAULT ''" },
  { kind: 'addCol', table: 'mind_reflections', column: 'thought_trail_ids', type: 'TEXT' },
  { kind: 'addCol', table: 'plans', column: 'complete_reason', type: 'TEXT' },
  { kind: 'addCol', table: 'plans', column: 'vision_id', type: 'TEXT' },
  { kind: 'addCol', table: 'ai_configs', column: 'local_engine_enabled', type: 'INTEGER NOT NULL DEFAULT 1' },

  { kind: 'addCol', table: 'exercise_entries', column: 'mode', type: "TEXT DEFAULT 'free'" },
  { kind: 'addCol', table: 'exercise_entries', column: 'target', type: 'TEXT' },
  { kind: 'addCol', table: 'exercise_entries', column: 'segment_paces', type: 'TEXT' },
  { kind: 'addCol', table: 'exercise_entries', column: 'elevation_gain', type: 'REAL' },
  { kind: 'addCol', table: 'exercise_entries', column: 'paused_duration', type: 'INTEGER' },
  { kind: 'addCol', table: 'exercise_entries', column: 'reps', type: 'INTEGER' },
  { kind: 'addCol', table: 'exercise_entries', column: 'sets', type: 'TEXT' },
  { kind: 'addCol', table: 'exercise_entries', column: 'met', type: 'REAL' },
  { kind: 'addCol', table: 'exercise_entries', column: 'combo_exercises', type: 'TEXT' },

  { kind: 'addCol', table: 'plan_items', column: 'trail_id', type: 'TEXT' },
  { kind: 'addCol', table: 'plan_items', column: 'tags', type: 'TEXT' },

  { kind: 'ensureTable', name: 'trail_notes', createSql: `CREATE TABLE IF NOT EXISTS trail_notes (
      id TEXT PRIMARY KEY, trail_id TEXT NOT NULL, content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]', mood TEXT, source TEXT NOT NULL DEFAULT 'free',
      guided_question TEXT, note_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, indexes: ['CREATE INDEX IF NOT EXISTS idx_trail_notes_trail ON trail_notes(trail_id)'] },

  { kind: 'ensureTable', name: 'reflection_links', createSql: `CREATE TABLE IF NOT EXISTS reflection_links (
      link_id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL,
      link_type TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, indexes: [
      'CREATE INDEX IF NOT EXISTS idx_reflection_links_from ON reflection_links(from_id)',
      'CREATE INDEX IF NOT EXISTS idx_reflection_links_to   ON reflection_links(to_id)',
    ] },

  { kind: 'ensureTable', name: 'ai_configs', createSql: `CREATE TABLE IF NOT EXISTS ai_configs (
      config_id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT 'hybrid',
      models TEXT NOT NULL DEFAULT '[]', updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'checkin_reviews', createSql: `CREATE TABLE IF NOT EXISTS checkin_reviews (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'self',
      review_id TEXT NOT NULL, period TEXT NOT NULL DEFAULT 'week',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      review_data TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`, indexes: ['CREATE INDEX IF NOT EXISTS idx_checkin_reviews_period ON checkin_reviews(period, start_date)'] },

  // planTableCheck 在原代码中提前 fetch（原 1089 行），延后到原 1133 行使用——
  // 中间夹着 grace_history / daily_custom_todos / daily_todo_history。
  // 用 checkTable + ensureTablesChecked 拆成两步，保持 byte-identical 顺序。
  { kind: 'checkTable', key: 'plans', name: 'plans' },

  { kind: 'ensureTable', name: 'grace_history', createSql: `CREATE TABLE IF NOT EXISTS grace_history (
      date TEXT PRIMARY KEY, restored_at INTEGER NOT NULL,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'daily_custom_todos', createSql: `CREATE TABLE IF NOT EXISTS daily_custom_todos (
      id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
      name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
      todo_order INTEGER NOT NULL DEFAULT 0, recurring INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, afterAction: migrateDailyCustomTodosNullable },

  { kind: 'ensureTable', name: 'daily_todo_history', createSql: `CREATE TABLE IF NOT EXISTS daily_todo_history (
      id TEXT PRIMARY KEY, plan_id TEXT, date TEXT NOT NULL,
      plan_items TEXT NOT NULL DEFAULT '[]', custom_todos TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, afterAction: migrateDailyTodoHistoryNullable },

  { kind: 'ensureTablesChecked', key: 'plans', createSqls: [
    `CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', slogan TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'not_started',
      progress INTEGER NOT NULL DEFAULT 0, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS plan_items (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, content_url TEXT NOT NULL DEFAULT '',
      total_checkin_days INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_started',
      progress INTEGER NOT NULL DEFAULT 0, link TEXT NOT NULL DEFAULT 'manual',
      priority TEXT NOT NULL DEFAULT 'medium', target_metric TEXT NOT NULL DEFAULT '',
      link_config TEXT NOT NULL DEFAULT '{}', item_order INTEGER NOT NULL DEFAULT 0,
      frequency TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS plan_item_checkins (
      id TEXT PRIMARY KEY, plan_item_id TEXT NOT NULL, date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0, note TEXT DEFAULT '', linked_module TEXT DEFAULT '',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`,
  ] },

  { kind: 'migrate', fn: migrateFastingSessionsCheck },

  { kind: 'ensureColumn', table: 'fasting_sessions', column: 'note', type: "TEXT NOT NULL DEFAULT ''" },

  { kind: 'addCol', table: 'mantra_defs', column: 'audio_url', type: 'TEXT' },
  { kind: 'addCol', table: 'mantra_defs', column: 'audio_attribution', type: 'TEXT' },
  { kind: 'addCol', table: 'mantra_defs', column: 'preset', type: 'INTEGER' },
  { kind: 'addCol', table: 'mantra_defs', column: 'pronunciation', type: 'TEXT' },
  { kind: 'addCol', table: 'mantra_defs', column: 'meaning', type: 'TEXT' },
  { kind: 'addCol', table: 'mantra_defs', column: 'full_text', type: 'TEXT' },
  { kind: 'addCol', table: 'mantra_defs', column: 'page_count', type: 'INTEGER' },

  { kind: 'createIndex', sqls: [
    'CREATE INDEX IF NOT EXISTS idx_food_entry_date ON food_entries(entry_date)',
    'CREATE INDEX IF NOT EXISTS idx_exercise_ts ON exercise_entries(ts)',
    'CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id)',
    'CREATE INDEX IF NOT EXISTS idx_plan_item_checkins_lookup ON plan_item_checkins(plan_item_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_daily_custom_todos_lookup ON daily_custom_todos(plan_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_fasting_started ON fasting_sessions(started_at)',
    'CREATE INDEX IF NOT EXISTS idx_body_weight_date ON body_weight_records(date)',
    'CREATE INDEX IF NOT EXISTS idx_body_checkins_date ON body_checkins(date)',
  ] },

  { kind: 'migrate', fn: migrateCheckinReviewsUniqueIndex },

  { kind: 'ensureTable', name: 'body_goals', createSql: `CREATE TABLE IF NOT EXISTS body_goals (
      id TEXT PRIMARY KEY, target_weight REAL, target_body_fat REAL,
      target_date TEXT, strategy TEXT, note TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'body_plans', createSql: `CREATE TABLE IF NOT EXISTS body_plans (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'weekly',
      goal_id TEXT, weekday INTEGER NOT NULL,
      part TEXT NOT NULL, sport_key TEXT, note TEXT,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, indexes: ['CREATE INDEX IF NOT EXISTS idx_body_plans_weekday ON body_plans(weekday)'],
    elseAction: (db) => tryAddCol(db, 'body_plans', 'type', "TEXT NOT NULL DEFAULT 'weekly'") },

  { kind: 'ensureTable', name: 'body_training_plans', createSql: `CREATE TABLE IF NOT EXISTS body_training_plans (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'training',
      name TEXT NOT NULL, start_date TEXT NOT NULL,
      end_date TEXT NOT NULL, strategy TEXT, target_weight REAL,
      target_body_fat REAL, goal_note TEXT, tasks TEXT NOT NULL DEFAULT '[]',
      overrides TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, elseAction: async (db) => {
      await tryAddCol(db, 'body_training_plans', 'overrides', 'TEXT');
      await tryAddCol(db, 'body_training_plans', 'type', "TEXT NOT NULL DEFAULT 'training'");
    } },

  { kind: 'ensureTable', name: 'body_weight_records', createSql: `CREATE TABLE IF NOT EXISTS body_weight_records (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, weight REAL NOT NULL,
      body_fat REAL, updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'body_checkins', createSql: `CREATE TABLE IF NOT EXISTS body_checkins (
      id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, energy INTEGER NOT NULL,
      pain INTEGER NOT NULL, comfort INTEGER NOT NULL, sleep INTEGER NOT NULL,
      tags TEXT, note TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'visions', createSql: `CREATE TABLE IF NOT EXISTS visions (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, text TEXT NOT NULL,
      time_frame TEXT, start_date TEXT, deadline TEXT, status TEXT NOT NULL DEFAULT 'active',
      achieved_at INTEGER, sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },
  { kind: 'addCol', table: 'visions', column: 'start_date', type: 'TEXT' },

  { kind: 'ensureTable', name: 'vision_practices', createSql: `CREATE TABLE IF NOT EXISTS vision_practices (
      id TEXT PRIMARY KEY, vision_id TEXT NOT NULL, ref_type TEXT NOT NULL,
      ref_id TEXT NOT NULL, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'dedications', createSql: `CREATE TABLE IF NOT EXISTS dedications (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, period_label TEXT NOT NULL,
      type TEXT NOT NULL, practice_days INTEGER NOT NULL, total_days INTEGER NOT NULL,
      habit_stats TEXT, plan_progress TEXT, vision_progress TEXT,
      insight TEXT, adjustment TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'mantra_defs', createSql: `CREATE TABLE IF NOT EXISTS mantra_defs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, subtitle TEXT,
      category TEXT NOT NULL DEFAULT 'custom', sort_order INTEGER NOT NULL DEFAULT 0,
      target_count INTEGER, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'mantra_sessions', createSql: `CREATE TABLE IF NOT EXISTS mantra_sessions (
      id TEXT PRIMARY KEY, mantra_id TEXT NOT NULL, date TEXT NOT NULL,
      count INTEGER NOT NULL, rounds INTEGER NOT NULL, duration_sec INTEGER NOT NULL,
      started_at INTEGER NOT NULL, completed_at INTEGER NOT NULL,
      target_rounds INTEGER, dedication TEXT, updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'ensureTable', name: 'zhiguan_sessions', createSql: `CREATE TABLE IF NOT EXISTS zhiguan_sessions (
      id TEXT PRIMARY KEY, user_id TEXT, status TEXT NOT NULL DEFAULT 'completed',
      start_ts INTEGER NOT NULL, end_ts INTEGER, sankalpa TEXT,
      preliminary_level TEXT, chosen_method TEXT,
      samatha_ratio_avg REAL, vipassana_ratio_avg REAL,
      total_breaths INTEGER, closing_notes TEXT,
      self_reported_stage TEXT, self_reported_stage_text TEXT,
      dedication_id TEXT, five_hindrances TEXT, eight_tactile TEXT, meta TEXT,
      updated_at INTEGER,
      deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )` },

  { kind: 'addCol', table: 'zhiguan_sessions', column: 'end_ts', type: 'INTEGER' },
  { kind: 'addCol', table: 'zhiguan_sessions', column: 'five_hindrances', type: 'TEXT' },
  { kind: 'addCol', table: 'zhiguan_sessions', column: 'eight_tactile', type: 'TEXT' },
  { kind: 'addCol', table: 'zhiguan_sessions', column: 'meta', type: 'TEXT' },

  { kind: 'ensureTable', name: 'breath_records', createSql: `CREATE TABLE IF NOT EXISTS breath_records (
      id TEXT PRIMARY KEY, date TEXT NOT NULL, preset_key TEXT NOT NULL DEFAULT '',
      duration_sec INTEGER NOT NULL DEFAULT 0, cycles INTEGER NOT NULL DEFAULT 0,
      pre_distress INTEGER NOT NULL DEFAULT 5, post_distress INTEGER NOT NULL DEFAULT 5,
      reflection TEXT NOT NULL DEFAULT '', guide_style TEXT NOT NULL DEFAULT 'scientific',
      updated_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, synced INTEGER NOT NULL DEFAULT 0
    )`, indexes: ['CREATE INDEX IF NOT EXISTS idx_breath_records_date ON breath_records(date)'] },
  { kind: 'addCol', table: 'breath_records', column: 'synced', type: 'INTEGER NOT NULL DEFAULT 0' },

  { kind: 'cleanupPresets' },
];

// ensureTable 分支体抽出为独立函数，避免 dispatcher switch 内的决策点堆积。
async function handleEnsureTable(db: SQLite.SQLiteDatabase, step: Extract<MigrationStep, { kind: 'ensureTable' }>): Promise<void> {
  const existed = await tableExists(db, step.name);
  if (!existed) {
    await db.execAsync(step.createSql);
    for (const idx of step.indexes ?? []) {
      await db.execAsync(idx);
    }
  } else if (step.elseAction) {
    await step.elseAction(db);
  }
  if (step.afterAction) {
    await step.afterAction(db);
  }
}

async function handleEnsureTablesChecked(db: SQLite.SQLiteDatabase, step: Extract<MigrationStep, { kind: 'ensureTablesChecked' }>, checks: Record<string, boolean>): Promise<void> {
  if (!checks[step.key]) {
    for (const sql of step.createSqls) {
      await db.execAsync(sql);
    }
  }
}

async function handleForAddCol(db: SQLite.SQLiteDatabase, step: Extract<MigrationStep, { kind: 'forAddCol' }>): Promise<void> {
  for (const table of step.tables) {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${step.column} ${step.type}`);
    } catch {
      // Column already exists — ignore
    }
  }
}

async function handleCreateIndex(db: SQLite.SQLiteDatabase, step: Extract<MigrationStep, { kind: 'createIndex' }>): Promise<void> {
  for (const sql of step.sqls) {
    await db.execAsync(sql);
  }
}

async function runMigrationStep(db: SQLite.SQLiteDatabase, step: MigrationStep, checks: Record<string, boolean>): Promise<void> {
  switch (step.kind) {
    case 'checkTable':
      checks[step.key] = await tableExists(db, step.name);
      return;
    case 'ensureTable':
      await handleEnsureTable(db, step);
      return;
    case 'ensureTablesChecked':
      await handleEnsureTablesChecked(db, step, checks);
      return;
    case 'addCol':
      await tryAddCol(db, step.table, step.column, step.type);
      return;
    case 'ensureColumn':
      await ensureColumn(db, step.table, step.column, step.type);
      return;
    case 'migrate':
      await step.fn(db);
      return;
    case 'forAddCol':
      await handleForAddCol(db, step);
      return;
    case 'createIndex':
      await handleCreateIndex(db, step);
      return;
    case 'cleanupPresets':
      await cleanupPresetMantras(db);
      return;
  }
}

export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Outer guard: a failure in any single migration block must NOT abort the
  // entire openDatabase() chain — otherwise one bad migration bricks the app
  // on next cold start. Each block also has its own inner try-catch; this is
  // a last-resort safety net so the DB still opens and the app remains usable.
  try {
    const checks: Record<string, boolean> = {};
    for (const step of MIGRATION_STEPS) {
      await runMigrationStep(db, step, checks);
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

