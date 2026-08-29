# 拆分 migrateDatabase — 执行计划

## 前置：记录 baseline schema

```bash
# 拆分前，导出 schema baseline
# 方法：写一个临时 Node 脚本，直接调用 migrateDatabase 后导出 PRAGMA
# 脚本位置：.trellis/tasks/08-27-split-migrate-database/export_schema.mjs
# 保存为 .trellis/tasks/08-27-split-migrate-database/baseline_schema.txt
```

临时脚本模板（`export_schema.mjs`）：

```javascript
// 伪代码 — 实现时按实际 API 调整
import { openDatabase } from 'expo-sqlite-next';  // 或实际 SQLite 驱动
import { migrateDatabase } from '../../../apps/mobile/src/db/schema';

const db = await openDatabase('file::memory:?cache=shared');
await migrateDatabase(db);

const tables = ['sync_queue', 'meditation_history', 'daily_custom_todos',
  'daily_todo_history', 'fasting_sessions', 'checkin_reviews']; // 补全所有表
for (const t of tables) {
  console.log(`-- ${t}`);
  console.log(JSON.stringify(await db.getAllAsync(`PRAGMA table_info(${t})`)));
  console.log(JSON.stringify(await db.getAllAsync(`PRAGMA index_list(${t})`)));
}
```

> 如果 `expo-sqlite-next` 无法在 Node 直接调用（依赖 React Native 运行时），
> 退路：用 `sqlite3` CLI 手动执行 schema.ts 中的 CREATE TABLE + 迁移 SQL，
> 或在 Metro 环境跑一次 app 后通过 Remote Console 导出 PRAGMA。

## 验证命令

```bash
# 注意：migrateDatabase 函数体规模大，AC 允许 ≤40（非 ≤15）
npx eslint apps/mobile/src/db/schema.ts --rule '{"complexity": ["error", 40]}' --no-eslintrc
pnpm run lint && pnpm run type-check && pnpm run test
```

## 执行步骤

### Step 0: 记录 baseline
- [ ] 运行 `export_schema.mjs`（或等效方法）→ 导出所有表的 `PRAGMA table_info` + `PRAGMA index_list` → `baseline_schema.txt`
- [ ] 记录当前 complexity 数值（预期 67）

> **提取顺序策略：从下往上**。6 个迁移块在 migrateDatabase 内从上到下排列，
> 先提取最后一个（checkin_reviews），最后提取第一个（sync_queue）。
> 这样前面的迁移块行号不受后续提取影响，减少行号偏移导致的定位错误。

### Step 1: 提取 migrateCheckinReviewsUniqueIndex（最后一个迁移块）
- [ ] 在 `schema.ts` 内（同文件，migrateDatabase 函数外）创建 `async function migrateCheckinReviewsUniqueIndex(db)`
- [ ] 将去重 + UNIQUE 索引块代码**逐行搬入**（不修改任何字符）
- [ ] 原位置替换为 `await migrateCheckinReviewsUniqueIndex(db)`
- [ ] 验证：`pnpm run type-check` 通过

### Step 2: 提取 migrateFastingSessionsCheck
- [ ] CHECK 约束移除块（表重建）逐行搬入
- [ ] **确认事务边界随函数体一起搬移**
- [ ] 验证：`pnpm run type-check` 通过

### Step 3: 提取 migrateDailyTodoHistoryNullable
- [ ] 同模式，表重建块逐行搬入
- [ ] 验证：`pnpm run type-check` 通过

### Step 4: 提取 migrateDailyCustomTodosNullable
- [ ] 表重建块（DROP+RENAME）逐行搬入
- [ ] **确认事务边界随函数体一起搬移**
- [ ] 验证：`pnpm run type-check` 通过

### Step 5: 提取 migrateMeditationHistory
- [ ] 同模式，dur→dur_min 转换块逐行搬入
- [ ] 验证：`pnpm run type-check` 通过

### Step 6: 提取 migrateSyncQueueColumns（第一个迁移块）
- [ ] 将 sync_queue 多列迁移块代码**逐行搬入**（不修改任何字符）
- [ ] 原位置替换为 `await migrateSyncQueueColumns(db)`
- [ ] 验证：`pnpm run type-check` 通过

### Step 7: 代码层 diff 审查
- [ ] `git diff` 逐个迁移块确认：函数体逐行一致，只是被包裹在命名函数内
- [ ] 确认调用处顺序与原迁移块顺序一致
- [ ] 确认 tryAddCol / CREATE TABLE / for 循环未被改动

### Step 8: schema 快照对比
- [ ] 拆分后冷启动 → 导出 `PRAGMA table_info` + `PRAGMA index_list` → `new_schema.txt`
- [ ] `diff baseline_schema.txt new_schema.txt`
- [ ] 预期：零差异

### Step 9: 验证
- [ ] ESLint complexity ≤ 40
- [ ] `pnpm run lint` 0 error 0 warning
- [ ] `pnpm run type-check` 0 错误
- [ ] `pnpm run test` ≥1967 通过
- [ ] schema 快照零差异
- [ ] 代码层 diff 确认零行为变更

## 回滚点

- Step 1-6 每步一个 commit
- Step 8 schema 不一致 → `git revert` 到上一个 commit
- **此子任务最高风险，每个 step 后都验证 type-check**
