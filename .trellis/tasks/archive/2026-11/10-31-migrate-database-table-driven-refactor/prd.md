# migrateDatabase 表驱动重构 — 测试基线 + CC 38→≤15

## Goal

将 `migrateDatabase`（`apps/mobile/src/db/schema.ts:823`，cyclomatic complexity 38）降至 ESLint `complexity ≤ 15`，通过引入表驱动抽象（`ensureTable` + 规格数组循环）替代手写的 `if (!tableCheck) CREATE else migrate` 分支与内联 `for` 循环。

**前置硬约束**：先建立表征测试基线锁定当前迁移行为，再做重构；重构前后行为逐字节一致。零运行时回归，零数据丢失风险。

## Background

上一任务（08-26-complexity-hotspot-split）将 migrateDatabase 从 CC 67 降到 38——仅做命名函数提取（6 个 `migrateXxx`），明确将表驱动重构判为高风险 Out of Scope。本次专门处理该项，前置补测试。

### 当前结构（已核实）

- `schema.ts` 1438 行；`migrateDatabase` 在 823 行，CC 38
- 6 个命名迁移已提取（674–840 行）：`migrateSyncQueueColumns` / `migrateMeditationHistory` / `migrateDailyCustomTodosNullable` / `migrateDailyTodoHistoryNullable` / `migrateFastingSessionsCheck` / `migrateCheckinReviewsUniqueIndex`
- 主函数剩余复杂度来源：
  1. ~15 个 `if (!tableCheck) { CREATE TABLE + 索引 } else { migrateXxx(db) }` 分支
  2. 2 个内联 `for` 循环（`tablesNeedingUpdatedAt` / `tablesNeedingDeleted`），各带 try-catch
  3. ~40 个顺序 `tryAddCol(...)` 调用
- 外层 try-catch（824–1404）是 last-resort 安全网，确保单迁移失败不 brick app

### 调用链（已核实）

- `openDatabase()`（schema.ts:30）→ `SQLite.openDatabaseAsync(DB_NAME)` → `migrateDatabase(instance)`
- 每次冷启动执行；无 `PRAGMA user_version` 版本守卫（不在本次范围）

### 测试基础设施（已核实）

- **零测试覆盖**：无 `schema.test.ts`，无任何测试引用 `migrateDatabase`
- mobile devDeps 无 `better-sqlite3` / `sql.js` / `sqlite3`；仅 `expo-sqlite ~16.0.10`（原生模块，vitest/node 环境不可用）
- 现有 `syncQueue.test.ts` 用 `vi.fn().mockResolvedValue({execAsync, getFirstAsync})` mock expo-sqlite 接口

## Requirements

### R1 — 表征测试基线（重构前）
- 为 `migrateDatabase` 建立表征测试，锁定当前迁移行为（具体测试策略待定，见 Open Questions）
- 覆盖：表不存在分支（CREATE TABLE + 索引）、表已存在分支（调用对应 `migrateXxx`）、`tryAddCol` 幂等性、两个 `for` 循环的 ALTER TABLE 行为
- 测试必须能在 vitest/node 环境运行（不依赖原生 expo-sqlite）

### R2 — 表驱动重构（CC 38→≤15）
- 提取模块级 helpers：`tableExists`、`tryAddCol`（从内联提升）、`ensureColumn`（fasting note 模式）、`cleanupPresetMantras`（PRESET 清理块整块搬入）
- 定义 `MigrationStep` discriminated union + 有序 `MIGRATION_STEPS` 数组（含 ensureTable / ensureTables / addCol / ensureColumn / migrate / forAddCol / createIndex / cleanupPresets 八种 step）
- 实现 `dispatchStep(db, step)` switch 分发
- `migrateDatabase` 重写为 `try { for (step of MIGRATION_STEPS) await dispatchStep(db, step) } catch { log.error }`——complexity 降至 ≤15（目标 ~2）
- **三类合并为单一有序 step 数组**（非三个独立数组）：因 tryAddCol 与 CREATE 块交错排列，独立数组循环会重排顺序、破坏 AC6 byte-identical
- **6 个 `migrateXxx` 函数体不动**（674-821），作为 `ensureTable.elseAction` / `migrate.fn` 引用
- `forAddCol` step 保留 try-catch-ALTER 模式（**不换 tryAddCol**——会引入额外 PRAGMA 查询、改变 SQL 序列）
- 保持外层 try-catch 安全网

## Acceptance Criteria

- [ ] AC1：`migrateDatabase` ESLint `complexity` ≤ 15
- [ ] AC2：表征测试在重构前通过（锁定旧行为），重构后仍通过（行为不变）
- [ ] AC3：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC4：`pnpm run type-check` 0 错误
- [ ] AC5：`pnpm run test` 全量通过（≥1974 基线）
- [ ] AC6：migrateDatabase 执行顺序不变——重构前后 emitted SQL 序列逐字节一致
- [ ] AC7：`openDatabase` 消费方零改动
- [ ] AC8：无新增 `any`、无新增 `console.log`、无新增 raw 用户可见字符串

## Out of Scope

- `PRAGMA user_version` 版本跟踪（高风险，另立任务）
- 6 个 `migrateXxx` 函数体内部重构（已达标，不动）
- `openDatabase` 连接管理重构
- 其余 schema.ts 函数

## Open Questions

- 无——所有设计分支已决（见 Resolved Decisions）。

## Resolved Decisions

- **任务结构**：单一任务，内部按「R1 测试基线 → R2 表驱动重构」顺序，R2 依赖 R1。
- **风险边界**：6 个 `migrateXxx` 函数体不动；重构只改 migrateDatabase 主函数的分支结构。
- **OQ1 已决（2026-10-31）**：表征测试用 mock-based SQL 序列快照。mock db 模拟表/列存在状态（sqlite_master + pragma_table_info 查询），记录 emitted SQL 序列并快照。无新依赖，与现有 syncQueue.test.ts 模式一致。
- **OQ2 已决（2026-10-31）**：三类全转数据驱动。但因 tryAddCol 与 CREATE 块交错排列，三类合并为单一有序 `MIGRATION_STEPS` 数组 + `dispatchStep` 分发（非三个独立数组），以保 AC6 byte-identical。
- **migrateXxx 测试处理（2026-10-31）**：让 6 个 migrateXxx 对着 recording fake 跑（不抽模块、不 mock），其 emitted SQL 进入快照——额外锁定表重建迁移 body 行为。
- **AC6 严格性**：emitted SQL 序列逐字节一致（mock 快照比较即强制此约束）。`forAddCol` 保留 try-catch-ALTER 不换 tryAddCol。
- **测试场景**：S1 fresh（无表）+ S2 upgrade（所有表存在+列空，最大化 else 分支覆盖），双快照。
