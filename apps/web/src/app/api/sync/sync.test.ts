// ─── Sync endpoint tests ──────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Create a test database
const TEST_DB_DIR = path.join(process.cwd(), 'test-data');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test-sync.db');

let db: Database.Database;

beforeAll(() => {
  if (!fs.existsSync(TEST_DB_DIR)) fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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
  `);
});

afterAll(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_DIR)) fs.rmdirSync(TEST_DB_DIR);
});

describe('Sync data storage', () => {
  it('should insert a new sync record', () => {
    const stmt = db.prepare(`
      INSERT INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run('user1', 'habit', 'habit1', JSON.stringify({ name: 'Meditate' }), Date.now(), 1, 0);
    expect(result.changes).toBe(1);
  });

  it('should upsert with higher version', () => {
    const upsert = db.prepare(`
      INSERT INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, entity, entity_id) DO UPDATE SET
        payload = CASE WHEN excluded.version > sync_data.version THEN excluded.payload ELSE sync_data.payload END,
        updated_at = CASE WHEN excluded.version > sync_data.version THEN excluded.updated_at ELSE sync_data.updated_at END,
        version = MAX(excluded.version, sync_data.version),
        deleted = CASE WHEN excluded.version > sync_data.version THEN excluded.deleted ELSE sync_data.deleted END
    `);

    // Insert v1
    upsert.run('user1', 'habit', 'habit2', JSON.stringify({ name: 'Run' }), 1000, 1, 0);

    // Update with v2 (should win)
    upsert.run('user1', 'habit', 'habit2', JSON.stringify({ name: 'Run updated' }), 2000, 2, 0);

    const row = db.prepare('SELECT * FROM sync_data WHERE user_id = ? AND entity_id = ?').get('user1', 'habit2') as any;
    expect(row.version).toBe(2);
    expect(JSON.parse(row.payload).name).toBe('Run updated');
  });

  it('should keep higher version when lower version arrives', () => {
    const upsert = db.prepare(`
      INSERT INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, entity, entity_id) DO UPDATE SET
        payload = CASE WHEN excluded.version > sync_data.version THEN excluded.payload ELSE sync_data.payload END,
        updated_at = CASE WHEN excluded.version > sync_data.version THEN excluded.updated_at ELSE sync_data.updated_at END,
        version = MAX(excluded.version, sync_data.version),
        deleted = CASE WHEN excluded.version > sync_data.version THEN excluded.deleted ELSE sync_data.deleted END
    `);

    // Insert v3
    upsert.run('user1', 'habit', 'habit3', JSON.stringify({ name: 'V3' }), 3000, 3, 0);

    // Try v1 (should NOT overwrite)
    upsert.run('user1', 'habit', 'habit3', JSON.stringify({ name: 'V1 stale' }), 1000, 1, 0);

    const row = db.prepare('SELECT * FROM sync_data WHERE user_id = ? AND entity_id = ?').get('user1', 'habit3') as any;
    expect(row.version).toBe(3);
    expect(JSON.parse(row.payload).name).toBe('V3');
  });

  it('should return incremental changes after timestamp', () => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('user1', 'reflection', 'r1', '{}', 5000, 1, 0);
    insert.run('user1', 'reflection', 'r2', '{}', 8000, 1, 0);
    insert.run('user1', 'reflection', 'r3', '{}', 10000, 1, 0);

    const changes = db.prepare(`
      SELECT entity_id FROM sync_data WHERE user_id = ? AND updated_at > ?
    `).all('user1', 6000) as any[];

    expect(changes.length).toBe(2);
    expect(changes.map((c: any) => c.entity_id)).toContain('r2');
    expect(changes.map((c: any) => c.entity_id)).toContain('r3');
  });

  it('should handle soft delete', () => {
    const upsert = db.prepare(`
      INSERT INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, entity, entity_id) DO UPDATE SET
        payload = CASE WHEN excluded.version > sync_data.version THEN excluded.payload ELSE sync_data.payload END,
        updated_at = CASE WHEN excluded.version > sync_data.version THEN excluded.updated_at ELSE sync_data.updated_at END,
        version = MAX(excluded.version, sync_data.version),
        deleted = CASE WHEN excluded.version > sync_data.version THEN excluded.deleted ELSE sync_data.deleted END
    `);

    // Insert then soft-delete
    upsert.run('user1', 'food', 'f1', JSON.stringify({ name: 'Apple' }), 1000, 1, 0);
    upsert.run('user1', 'food', 'f1', null, 2000, 2, 1);

    const row = db.prepare('SELECT * FROM sync_data WHERE user_id = ? AND entity_id = ?').get('user1', 'f1') as any;
    expect(row.deleted).toBe(1);
    expect(row.payload).toBeNull();

    // Full pull should exclude deleted
    const active = db.prepare(`
      SELECT entity_id FROM sync_data WHERE user_id = ? AND deleted = 0
    `).all('user1') as any[];
    expect(active.find((r: any) => r.entity_id === 'f1')).toBeUndefined();
  });

  it('should group results by entity type', () => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO sync_data(user_id, entity, entity_id, payload, updated_at, version, deleted)
      VALUES(?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('user1', 'habit', 'h1', JSON.stringify({ name: 'H1' }), 1000, 1, 0);
    insert.run('user1', 'habit', 'h2', JSON.stringify({ name: 'H2' }), 2000, 1, 0);
    insert.run('user1', 'reflection', 'r1', JSON.stringify({ content: 'R1' }), 3000, 1, 0);

    const rows = db.prepare(`
      SELECT entity, entity_id, payload, deleted FROM sync_data
      WHERE user_id = ? AND deleted = 0
    `).all('user1') as any[];

    const data: Record<string, any[]> = {};
    for (const row of rows) {
      if (!row.payload) continue;
      if (!data[row.entity]) data[row.entity] = [];
      data[row.entity].push(JSON.parse(row.payload));
    }

    expect(data.habit).toHaveLength(2);
    expect(data.reflection).toHaveLength(1);
  });
});
