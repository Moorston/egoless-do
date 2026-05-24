// ─── Auth database (better-sqlite3, server-side only) ─────────────
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'egoless-auth.db');
// NOTE: better-sqlite3 is single-process only. Do NOT run multiple app instances against this file.
const db: DatabaseType = new Database(DB_PATH, { timeout: 5000 });

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS verification_codes (
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
  CREATE INDEX IF NOT EXISTS idx_vcode_email ON verification_codes(email);

  CREATE TABLE IF NOT EXISTS token_blacklist (
    token      TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

export default db;
