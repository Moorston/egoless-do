# Design — migrateDatabase 表驱动重构

## 1. 核心约束：byte-identical SQL 序列（AC6）

重构前后 `migrateDatabase` emitted 的 SQL 序列必须逐字节一致。mock-snapshot 测试强制此约束。

**关键发现**：当前 tryAddCol 调用与 CREATE TABLE 块**交错排列**（非"所有 CREATE 在前、所有 tryAddCol 在后"）。因此三类不能拆成三个独立数组循环——会重排顺序、破坏 byte-identical。三类必须合并为**一个有序 step 数组** + 单个 dispatcher。

## 2. 数据模型：统一的 MIGRATION_STEPS 数组

一个有序数组，每项是 discriminated union `MigrationStep`，按当前代码的精确顺序排列：

```ts
type MigrationStep =
  | { kind: 'ensureTable'; name: string; createSql: string; indexes?: string[]; elseAction?: (db) => Promise<void> }
  | { kind: 'ensureTables'; checkName: string; createSqls: string[]; indexes?: string[] }   // 多表共享一个存在性检查（plans+plan_items+plan_item_checkins）
  | { kind: 'addCol'; table: string; column: string; type: string }                          // 等价 tryAddCol
  | { kind: 'ensureColumn'; table: string; column: string; type: string }                    // fasting note 模式：getAllAsync(PRAGMA table_info) + .some 检查 + ALTER（不用 tryAddCol，因 SQL 形式不同）
  | { kind: 'migrate'; fn: (db) => Promise<void> }                                           // 独立 migrate 调用（fasting_sessions, checkin_reviews）
  | { kind: 'forAddCol'; tables: string[]; column: string; type: string }                    // updatedAt/deleted 循环：try-catch-ALTER 模式（保留，不换 tryAddCol）
  | { kind: 'createIndex'; sql: string }                                                      // 1176-1183 的 8 个独立 CREATE INDEX
  | { kind: 'cleanupPresets' };                                                                // PRESET 清理块（抽为函数）
```

dispatcher：
```ts
async function dispatchStep(db, step: MigrationStep) {
  switch (step.kind) {
    case 'ensureTable': {
      const existed = await tableExists(db, step.name);
      if (!existed) { await db.execAsync(step.createSql); for (const idx of step.indexes ?? []) await db.execAsync(idx); }
      else if (step.elseAction) await step.elseAction(db);
      return;
    }
    case 'ensureTables': /* 同上但 createSqls 循环、checkName 检查 */
    case 'addCol': return tryAddCol(db, step.table, step.column, step.type);
    case 'ensureColumn': return ensureColumn(db, step.table, step.column, step.type);
    case 'migrate': return step.fn(db);
    case 'forAddCol': for (const t of step.tables) { try { await db.execAsync(`ALTER TABLE ${t} ADD COLUMN ${step.column} ${step.type}`); } catch {} } return;
    case 'createIndex': return db.execAsync(step.sql);
    case 'cleanupPresets': return cleanupPresetMantras(db);
  }
}
```

## 3. 重构后的 migrateDatabase

```ts
export async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    for (const step of MIGRATION_STEPS) {
      await dispatchStep(db, step);
    }
  } catch (e) {
    log.error(e, { message: 'migrateDatabase failed (non-fatal) — some migrations may be incomplete' });
  }
}
```

**复杂度**：migrateDatabase = 1 个 for + 1 个 try = **complexity 2**（≤15 ✓）。`dispatchStep` = switch 8 case = complexity ~8（≤15 ✓）。`MIGRATION_STEPS` 是数据，不计复杂度。

## 4. 提取的 helpers（模块级，schema.ts 内）

| helper | 职责 | 对应原模式 |
|--------|------|-----------|
| `tableExists(db, name)` | `SELECT name FROM sqlite_master WHERE type='table' AND name=?` → boolean | 原 15+ 个 `getFirstAsync` 检查 |
| `tryAddCol(db, table, col, type)` | 已存在（823 行内联），提取为模块级 | 原 tryAddCol |
| `ensureColumn(db, table, col, type)` | `getAllAsync(PRAGMA table_info(table))` + `.some` 检查 + ALTER | fasting note 列检查（1160-1163）|
| `cleanupPresetMantras(db)` | PRESET 清理（1373-1400）整块搬入 | 原 PRESET 块 |

**不动**：6 个 `migrateXxx` 函数体（674-821）原封不动，作为 `ensureTable.elseAction` / `migrate.fn` 引用。

## 5. 字节一致性映射（关键验证点）

| 原 SQL | step 类型 | 保证 |
|--------|----------|------|
| `SELECT name FROM sqlite_master WHERE type='table' AND name='X'` | ensureTable/ensureTables | 同一查询字符串 |
| `CREATE TABLE IF NOT EXISTS X (...)` | ensureTable.createSql | 字面量搬入 |
| `CREATE INDEX IF NOT EXISTS ...` | ensureTable.indexes / createIndex | 字面量搬入 |
| `SELECT name FROM pragma_table_info('X') WHERE name='C'` + `ALTER TABLE X ADD COLUMN C T` | addCol → tryAddCol | tryAddCol 原逻辑不变 |
| `PRAGMA table_info(X)` (getAllAsync) + `.some` + `ALTER` | ensureColumn | 镜像原模式 |
| `ALTER TABLE X ADD COLUMN updated_at INTEGER`（try-catch）×8 | forAddCol | 保留 try-catch-ALTER，不换 tryAddCol |
| migrateXxx 内部 SQL | migrate.fn / elseAction | 函数体不动，SQL 不变 |

**不变式**：`MIGRATION_STEPS` 数组顺序 == 当前代码执行顺序。重构后 emitted SQL 序列 == 重构前。

## 6. 表征测试设计（R1）

### Fake SQLite（`schemaMigrate.test.ts` 内）

纯 JS fake，实现 `SQLite.SQLiteDatabase` 子集：
- 状态：`tables: Map<name, {sql: string, columns: Map<col, {type, notnull}>}>`、`sqlLog: string[]`
- `getFirstAsync(sql)` / `getAllAsync(sql)`：解析 SQL，应答：
  - `SELECT name FROM sqlite_master WHERE type='table' AND name='X'` → 表存在返回 `{name:'X'}`
  - `SELECT sql FROM sqlite_master WHERE type='table' AND name='X'` → 返回 `{sql: tables.get(X).sql}`
  - `SELECT name FROM pragma_table_info('X') WHERE name='C'` → 列存在返回 `{name:'C'}`
  - `SELECT "notnull" FROM pragma_table_info('X') WHERE name='C'` → 返回 `{notnull}`
  - `PRAGMA table_info(X)` → 返回所有列行
- `execAsync(sql)` / `runAsync(sql, params)`：记录到 `sqlLog`；解析 DDL 变更状态（CREATE TABLE/ALTER ADD COLUMN/DROP/RENAME/CREATE INDEX）；不解析 DML 语义（INSERT/UPDATE/DELETE 仅记录）

### 测试场景

- **S1 fresh**：fake 初始空（无表）→ `await migrateDatabase(fake)` → 快照 `fake.sqlLog`
- **S2 upgrade**：fake 预置所有表存在、列空（最大化 else 分支覆盖）→ `await migrateDatabase(fake)` → 快照 `fake.sqlLog`

两场景的快照在重构前后必须一致。`toMatchSnapshot`。

### 测试覆盖映射
- S1 锁定：所有 CREATE TABLE + indexes、所有 tryAddCol（列不存在→ALTER）、forAddCol、ensureColumn、独立 migrate（fasting 表不存在→skip；checkin_reviews→DELETE+CREATE INDEX）、cleanupPresets
- S2 锁定：所有 ensureTable elseAction（migrateXxx 调用）、else-tryAddCol（body_plans/body_training_plans）、tryAddCol（列不存在→ALTER）

## 7. 兼容性 / 回滚

- `openDatabase` 消费方零改动：`migrateDatabase` 签名不变
- 无 DB schema 变更：重构是纯 dispatch 重组，emitted SQL 逐字节不变 → 冷启动迁移行为完全一致
- 回滚：单 commit revert 即恢复原 migrateDatabase；测试基线可保留

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| MIGRATION_STEPS 数组顺序错排 | S1+S2 双快照强制 byte-identical，任何错排立即失败 |
| createSql 字面量搬入 typo | 快照对比 + diff 审查（SQL 字符串原样移动）|
| elseAction/migrate.fn 引用错函数 | S2 快照验证 migrateXxx 被调用 |
| forAddCol 误换 tryAddCol | design.md §5 明确禁止；dispatcher 实现区分两种 step |
| fake SQLite 应答不全 | S1/S2 先在重构前跑通（锁定旧行为），fake 缺失会立即暴露 |
