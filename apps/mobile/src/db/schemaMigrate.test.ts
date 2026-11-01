// ─── migrateDatabase 表征测试基线 (R1) ─────────────────────────────
// 目的：在重构 migrateDatabase 之前，用纯 JS fake SQLite 锁定其 emitted
// SQL 序列。两个场景：
//   S1 fresh        — 空 DB，所有 ensureTable 走 CREATE 分支
//   S2 upgrade      — 所有 ensureTable 涉及的表已存在但列空，走 else / migrateXxx 分支
// 重构后两个快照必须逐字节一致 (AC6)。
//
// 约束：不依赖原生 expo-sqlite；不修改 schema.ts；无新增 any / console.log。
import { describe, it, expect } from 'vitest';

import { migrateDatabase } from './schema';

// ── FakeSqliteDb ───────────────────────────────────────────────────
// 实现 SQLite.SQLiteDatabase 子集（仅 migrateDatabase / migrateXxx 用到的方法）。
// 读查询按 design.md §6 应答规则解析；写操作记录到 sqlLog 并尽量更新 fake 状态。
// 写操作永不抛错（保证 migrateDatabase 外层 try-catch 不被触发，从而锁定完整序列）。

interface FakeColumn {
  type: string;
  notnull: number;
}
interface FakeTable {
  sql: string;
  columns: Map<string, FakeColumn>;
}

/** 按顶层逗号（忽略括号内逗号）拆分。 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** 解析 CREATE TABLE 语句，提取表名与列信息（name/type/notnull）。 */
function parseCreateTable(sql: string): { name: string; columns: Map<string, FakeColumn> } {
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*)\)/i);
  if (!m) return { name: '', columns: new Map() };
  const tableName = m[1];
  const body = m[2];
  const columns = new Map<string, FakeColumn>();
  for (const part of splitTopLevel(body)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstWord = (trimmed.split(/\s+/)[0] ?? '').toUpperCase();
    // 跳过表级约束
    if (['CHECK', 'CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE'].includes(firstWord)) continue;
    const colMatch = trimmed.match(/^(\w+)\s+(.*)$/);
    if (!colMatch) continue;
    const colName = colMatch[1];
    const rest = colMatch[2];
    const type = rest.split(/\s+/)[0] ?? '';
    const notnull = /\bNOT\s+NULL\b/i.test(trimmed) ? 1 : 0;
    columns.set(colName, { type, notnull });
  }
  return { name: tableName, columns };
}

class FakeSqliteDb {
  readonly tables = new Map<string, FakeTable>();
  readonly sqlLog: string[] = [];

  async getFirstAsync<T>(sql: string, _params?: unknown[]): Promise<T | null> {
    // 1. SELECT "notnull" FROM pragma_table_info('T') WHERE name = 'C'
    let m = sql.match(/SELECT "notnull" FROM pragma_table_info\('(\w+)'\) WHERE name = '(\w+)'/);
    if (m) {
      const t = this.tables.get(m[1]);
      if (!t) return null;
      const c = t.columns.get(m[2]);
      if (!c) return null;
      return { notnull: c.notnull } as unknown as T;
    }
    // 2. SELECT name FROM pragma_table_info('T') WHERE name = 'C'
    m = sql.match(/SELECT name FROM pragma_table_info\('(\w+)'\) WHERE name = '(\w+)'/);
    if (m) {
      const t = this.tables.get(m[1]);
      if (!t || !t.columns.has(m[2])) return null;
      return { name: m[2] } as unknown as T;
    }
    // 3. SELECT sql FROM sqlite_master WHERE type='table' AND name='X'
    m = sql.match(/SELECT sql FROM sqlite_master WHERE type='table' AND name='(\w+)'/);
    if (m) {
      const t = this.tables.get(m[1]);
      if (!t) return null;
      return { sql: t.sql } as unknown as T;
    }
    // 4. SELECT name FROM sqlite_master WHERE type='table' AND name='X'  (表存在性)
    m = sql.match(/SELECT name FROM sqlite_master WHERE type='table' AND name='(\w+)'/);
    if (m) {
      const t = this.tables.get(m[1]);
      if (!t) return null;
      return { name: m[1] } as unknown as T;
    }
    // 5. SELECT COUNT(*) as cnt FROM mantra_sessions WHERE mantra_id = ? AND deleted = 0
    m = sql.match(/SELECT COUNT\(\*\) as cnt FROM mantra_sessions/);
    if (m) return { cnt: 0 } as unknown as T;
    // 未识别读查询 → null（不抛错）
    return null;
  }

  async getAllAsync<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    // PRAGMA table_info(X) — 返回所有列行
    const m = sql.match(/PRAGMA table_info\((\w+)\)/);
    if (m) {
      const t = this.tables.get(m[1]);
      if (!t) return [] as unknown as T[];
      return Array.from(t.columns.entries()).map(
        ([name, c]) => ({ name, type: c.type, notnull: c.notnull }),
      ) as unknown as T[];
    }
    // SELECT id, name FROM mantra_defs WHERE name IN (...) — 无行
    if (/SELECT id, name FROM mantra_defs WHERE name IN/.test(sql)) {
      return [] as unknown as T[];
    }
    // 未识别读查询 → []（不抛错）
    return [] as unknown as T[];
  }

  async execAsync(sql: string): Promise<void> {
    this.sqlLog.push(sql);
    this.applyWrite(sql);
  }

  async runAsync(sql: string, _params?: unknown[]): Promise<{ changes: number }> {
    this.sqlLog.push(sql);
    this.applyWrite(sql);
    return { changes: 0 };
  }

  private applyWrite(sql: string): void {
    const s = sql.trim();

    // CREATE TABLE
    if (/CREATE\s+TABLE\b/i.test(s)) {
      const parsed = parseCreateTable(s);
      if (parsed.name) {
        this.tables.set(parsed.name, { sql: s, columns: parsed.columns });
      }
      return;
    }
    // CREATE [UNIQUE] INDEX → 忽略（仅记录）
    if (/CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(s)) return;
    // DROP INDEX → 忽略
    if (/^DROP\s+INDEX\b/i.test(s)) return;

    // DROP TABLE
    let m = s.match(/^DROP\s+TABLE\b\s+(?:IF\s+EXISTS\s+)?(\w+)/i);
    if (m) {
      this.tables.delete(m[1]);
      return;
    }

    // ALTER TABLE ...
    m = s.match(/^ALTER\s+TABLE\s+(\w+)\s+(.*)$/i);
    if (m) {
      const [, table, rest] = m;
      const t = this.tables.get(table);
      if (!t) return; // 表不存在 → no-op，不抛错
      // ADD COLUMN
      let cm = rest.match(/^ADD\s+COLUMN\s+(\w+)\s+(.*)$/i);
      if (cm) {
        const colName = cm[1];
        const typePart = cm[2];
        const type = typePart.split(/\s+/)[0] ?? '';
        const notnull = /\bNOT\s+NULL\b/i.test(typePart) ? 1 : 0;
        t.columns.set(colName, { type, notnull });
        return;
      }
      // RENAME TO
      cm = rest.match(/^RENAME\s+TO\s+(\w+)$/i);
      if (cm) {
        const newName = cm[1];
        this.tables.delete(table);
        this.tables.set(newName, t);
        return;
      }
      // DROP COLUMN
      cm = rest.match(/^DROP\s+COLUMN\s+(\w+)$/i);
      if (cm) {
        t.columns.delete(cm[1]);
        return;
      }
      return;
    }

    // BEGIN / COMMIT / ROLLBACK / INSERT / UPDATE / DELETE / PRAGMA → 仅记录
  }
}

// ── S2 预置表清单（migrateDatabase 中所有 ensureTable 涉及的表）─────
const S2_PRESET_TABLES = [
  'exercise_entries',
  'sync_queue',
  'sync_metadata',
  'sync_progress',
  'meditation_history',
  'user_profiles',
  'thought_trails',
  'trail_notes',
  'reflection_links',
  'ai_configs',
  'checkin_reviews',
  'plans',
  'plan_items',
  'plan_item_checkins',
  'grace_history',
  'daily_custom_todos',
  'daily_todo_history',
  'fasting_sessions',
  'body_goals',
  'body_plans',
  'body_training_plans',
  'body_weight_records',
  'body_checkins',
  'visions',
  'vision_practices',
  'dedications',
  'mantra_defs',
  'mantra_sessions',
  'zhiguan_sessions',
  'breath_records',
];

function createPresetDb(): FakeSqliteDb {
  const fake = new FakeSqliteDb();
  for (const name of S2_PRESET_TABLES) {
    fake.tables.set(name, { sql: '', columns: new Map() });
  }
  return fake;
}

// migrateDatabase 接受 SQLite.SQLiteDatabase；fake 仅实现子集，用参数类型推断做安全转换。
type DbArg = Parameters<typeof migrateDatabase>[0];

describe('migrateDatabase — SQL sequence snapshot', () => {
  it('S1 fresh install: empty DB → CREATE all tables + tryAddCol ALTERs', async () => {
    const fake = new FakeSqliteDb();
    await migrateDatabase(fake as unknown as DbArg);
    expect(fake.sqlLog).toMatchSnapshot('fresh-install');
  });

  it('S2 upgrade: all ensured tables exist (columns empty) → migrateXxx + tryAddCol', async () => {
    const fake = createPresetDb();
    await migrateDatabase(fake as unknown as DbArg);
    expect(fake.sqlLog).toMatchSnapshot('upgrade-all-tables-exist');
  });
});
