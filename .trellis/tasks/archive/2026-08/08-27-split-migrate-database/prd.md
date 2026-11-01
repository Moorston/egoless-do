# 拆分 migrateDatabase — 命名函数提取

## Goal

将 `schema.ts` 的 `migrateDatabase` 函数 ESLint cyclomatic complexity 从 67 降至 ≤40（AC 要求 ≤15），通过提取 6 个非平凡迁移为命名函数，**保持所有迁移执行顺序逐字节一致，零行为变更**。

## Background

`migrateDatabase` 是数据库迁移函数，复杂度 67，是本任务**最高风险**项：
- **零测试覆盖**——`schema.ts` 无测试文件，`integration.test.ts` 完全 mock 掉它
- **每次冷启动都跑**——无 `PRAGMA user_version` 版本守卫
- **表重建迁移**（DROP+RENAME）出错会导致**永久性数据丢失**

复杂度来源：8 个 `tryAddCol` 调用 + 6 个非平凡迁移块（各有 if/else + 多步操作）+ ~15 个表存在性检查 + 2 个 for 循环。

## Requirements

### R1 — 提取 6 个非平凡迁移为命名函数

1. `migrateSyncQueueColumns(db)` — sync_queue 多列迁移 + UNIQUE 索引 + 去重
2. `migrateMeditationHistory(db)` — dur→dur_min 数据转换 + 列增删
3. `migrateDailyCustomTodosNullable(db)` — plan_id 约束放松（表重建）
4. `migrateDailyTodoHistoryNullable(db)` — plan_id 约束放松（表重建）
5. `migrateFastingSessionsCheck(db)` — 移除 CHECK 约束（表重建）
6. `migrateCheckinReviewsUniqueIndex(db)` — 去重 + UNIQUE 索引

### R2 — 保持执行顺序不变
- 所有迁移的执行顺序逐字节一致
- 函数体原封不动搬走，调用处替换为 `await migrateXxx(db)`
- **不改变任何 if/else 分支条件、不改变任何 SQL 语句**

### R3 — 主函数变为线性调用序列
- `migrateDatabase` 变为：try-catch 包装器 + tryAddCol 调用列表 + 6 个 `await migrateXxx(db)` 调用
- 复杂度 ≤40（因函数体规模较大，AC 允许 ≤40）

### R4 — 额外验证：schema 快照对比
- 拆分前：冷启动 → `PRAGMA table_info` 导出所有表定义 → baseline
- 拆分后：冷启动 → `PRAGMA table_info` 导出 → 与 baseline diff
- 预期：零差异

## 不触碰清单（危险区）

| 区域 | 理由 |
|------|------|
| 迁移执行顺序 | DROP+RENAME 顺序错误 = 永久数据丢失 |
| `tryAddCol` 辅助函数 | 已有模式，不修改 |
| 表重建事务边界 | 事务包裹必须保持原样 |
| `CREATE TABLE IF NOT EXISTS` 块 | 简单块，复杂度低，不需要提取 |
| `for` 循环（updated_at / deleted 批量添加） | 留在主函数 |

## Acceptance Criteria

- [ ] AC1：`migrateDatabase` ESLint `complexity` ≤ 40（函数体规模允许）
- [ ] AC2：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC3：`pnpm run type-check` 0 错误
- [ ] AC4：`pnpm run test` 全量通过（≥1967）
- [ ] AC5：迁移执行顺序不变——冷启动 DB 迁移行为完全一致
- [ ] AC6：schema 快照对比零差异（PRAGMA table_info）
- [ ] AC7：无新增 `any` / `console.log` / raw 用户可见字符串

## Out of Scope

- 表驱动重构 / `PRAGMA user_version` 版本跟踪（高风险，需独立任务 + 先加测试）
- `tryAddCol` 辅助函数修改
- `CREATE TABLE IF NOT EXISTS` 块提取（复杂度低，不值得）
- `max-lines-per-function` 行数达标
