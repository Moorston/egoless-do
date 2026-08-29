# 拆分 migrateDatabase — 技术设计

## 1. 当前结构

```
migrateDatabase (CC 67, schema.ts 第 674 行起, ~1413 行)
├── 外部 try-catch 包装器
├── tryAddCol 辅助函数
├── ~15 个表存在性检查 + CREATE TABLE IF NOT EXISTS  ← 留在主函数
├── 8 个 tryAddCol 调用（简单列添加）               ← 留在主函数
├── 6 个非平凡迁移块（各有 if/else + 多步操作）      ← 提取为命名函数
│   ├── sync_queue 多列迁移 + 索引 + 去重
│   ├── meditation_history dur→dur_min 转换
│   ├── daily_custom_todos plan_id 约束放松（表重建）
│   ├── daily_todo_history plan_id 约束放松（表重建）
│   ├── fasting_sessions 移除 CHECK 约束（表重建）
│   └── checkin_reviews 去重 + UNIQUE 索引
└── 2 个 for 循环（updated_at / deleted 批量添加）   ← 留在主函数
```

## 2. 目标结构

```
migrateDatabase (编排层, CC ≤40)
├── try-catch 包装器 (不动)
├── tryAddCol 辅助 (不动)
├── 表存在性检查 + CREATE TABLE IF NOT EXISTS (不动)
├── tryAddCol 调用列表 (不动)
├── await migrateSyncQueueColumns(db)           ← 提取
├── await migrateMeditationHistory(db)          ← 提取
├── await migrateDailyCustomTodosNullable(db)  ← 提取
├── await migrateDailyTodoHistoryNullable(db)   ← 提取
├── await migrateFastingSessionsCheck(db)       ← 提取
├── await migrateCheckinReviewsUniqueIndex(db)  ← 提取
└── for 循环 (不动)
```

## 3. 提取规则（严格）

### 不变式

1. **函数体原封不动**：每个迁移块的代码逐行搬到命名函数内，不修改任何字符
2. **调用处替换为一行**：原迁移块位置替换为 `await migrateXxx(db)`
3. **顺序逐字节一致**：6 个迁移的相对顺序 + 与 tryAddCol/CREATE TABLE 的相对顺序不变
4. **参数只传 db**：命名函数接收 `db` 参数（SQLiteDatabase），不传其他状态

### 命名函数签名

```typescript
async function migrateSyncQueueColumns(db: SQLiteDatabase): Promise<void> {
  // 原 migrateDatabase 内 sync_queue 迁移块代码，逐行搬入
}

// 其余 5 个同理
```

### 提取边界（行号参考，基于探索期读取）

| 函数 | 原位置（约） | 操作类型 | 提取顺序 |
|------|-------------|----------|----------|
| migrateSyncQueueColumns | 第 730-765 行 | 多列 + 索引 + 去重 | Step 6（最后提取） |
| migrateMeditationHistory | 第 803-822 行 | 列转换 | Step 5 |
| migrateDailyCustomTodosNullable | 第 1018-1042 行 | 表重建 | Step 4 |
| migrateDailyTodoHistoryNullable | 第 1056-1077 行 | 表重建 | Step 3 |
| migrateFastingSessionsCheck | 约 990-1010 行 | 表重建 | Step 2 |
| migrateCheckinReviewsUniqueIndex | 约 1043-1055 行 | 去重 + 索引 | Step 1（先提取） |

> ⚠️ 行号为探索期估计值，实现时以实际代码为准。
> **提取顺序：从下往上**（先提取最后一个迁移块，最后提取第一个），
> 这样前面的迁移块行号不受后续提取影响。

## 4. 验证策略（零测试覆盖的补偿）

由于 `migrateDatabase` 无单元测试，采用**双重验证**：

### 验证 A：代码层 diff 审查
- `git diff` 确认每个迁移块：函数体逐行一致，只是被包裹在命名函数内
- 确认调用处顺序与原迁移块顺序一致

### 验证 B：schema 快照对比
```
拆分前:
1. 运行 export_schema.mjs → migrateDatabase 对空 DB 执行
2. 对每张表执行 PRAGMA table_info(table) + PRAGMA index_list(table)
3. 导出为 baseline_schema.txt

拆分后:
1. 同样运行 export_schema.mjs → migrateDatabase 对空 DB 执行
2. 导出 → new_schema.txt
3. diff baseline_schema.txt new_schema.txt → 预期零差异
```

> **退路**：如果 `export_schema.mjs` 因 SQLite 驱动依赖 React Native 运行时无法在 Node 直接执行，
> 降级为验证 A（代码层 diff 审查）为主，schema 快照对比为辅（手动在模拟器跑一次后导出）。
> 此时验证 A 的 diff 审查必须更严格——逐行确认函数体完全一致。

## 5. 消费方契约

`migrateDatabase` 的导出签名、调用方式不变。消费方（`initApp()` 路径）零改动。

## 6. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 迁移顺序被打乱 | **致命** | 逐行 diff 审查 + schema 快照对比 |
| 表重建事务边界丢失 | **致命** | 事务包裹在函数体内，随函数体一起搬移 |
| 函数体被误改 | **高** | 逐行 diff 审查，预期只有"搬移"无"修改" |
| db 参数传递错误 | 低 | TypeScript 编译时捕获 |

## 7. 回滚策略

- 每个/每两个命名函数提取后一个 commit
- schema 快照不一致 → `git revert` 到上一个 commit
- **此子任务放最后执行**——前面 4 个子任务的验证流程已跑顺，积累信心
