// ─── Auth database (better-sqlite3, server-side only) ─────────────
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'egoless-auth.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE,
    password_hash TEXT,
    name          TEXT NOT NULL,
    avatar        TEXT,
    phone         TEXT,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS oauth_accounts (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider     TEXT NOT NULL,
    provider_id  TEXT NOT NULL,
    UNIQUE(provider, provider_id)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS sync_data (
    user_id    TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT NOT NULL,
    payload    TEXT,
    updated_at INTEGER NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    deleted    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, entity, entity_id)
  );
  CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_data(user_id, updated_at);

  CREATE TABLE IF NOT EXISTS verification_codes (
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_vcode_email ON verification_codes(email);
`);

export default db;
