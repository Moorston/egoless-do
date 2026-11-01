# Implement — migrateDatabase 表驱动重构

## 执行顺序

> R1（测试基线）必须在 R2（重构）之前完成。R1 在**旧代码**上跑通并锁定快照，R2 重构后快照必须仍通过。

### Phase A — 测试基线（R1，针对当前旧代码）

- [ ] A1. 新建 `apps/mobile/src/db/schemaMigrate.test.ts`
- [ ] A2. 实现 FakeSqliteDb 类（状态 + sqlLog + getFirstAsync/getAllAsync/execAsync/runAsync，按 design.md §6 应答规则）
- [ ] A3. 写 S1 fresh 场景：`await migrateDatabase(fakeFresh)` → `expect(fakeFresh.sqlLog).toMatchSnapshot('fresh')`
- [ ] A4. 写 S2 upgrade 场景：预置所有表存在+列空 → `await migrateDatabase(fakeUpgrade)` → `expect(fakeUpgrade.sqlLog).toMatchSnapshot('upgrade')`
- [ ] A5. 跑 `pnpm --filter mobile test schemaMigrate` 确认两快照生成并通过（锁定**旧**行为）
- [ ] A6. 跑 `pnpm run lint` / `pnpm run type-check` 确认测试文件本身合规

**验证点**：A5 通过即基线建立。此时未动 migrateDatabase，快照记录的是旧行为。

### Phase B — 表驱动重构（R2）

- [ ] B1. 提取模块级 helpers：`tableExists`、`tryAddCol`（从 migrateDatabase 内联提升为模块级）、`ensureColumn`、`cleanupPresetMantras`（PRESET 块整块搬入）
- [ ] B2. 定义 `MigrationStep` 类型 + `MIGRATION_STEPS: MigrationStep[]` 数组，按当前代码精确顺序逐项填入（createSql/indexes 字面量原样搬）
- [ ] B3. 实现 `dispatchStep(db, step)` switch
- [ ] B4. 重写 `migrateDatabase` 为 `try { for (step of MIGRATION_STEPS) await dispatchStep(db, step) } catch { log.error }`
- [ ] B5. **不动** 6 个 `migrateXxx` 函数体（674-821）

**验证点**：B 阶段不改 emitted SQL——S1/S2 快照必须仍通过。

### Phase C — 验证门禁

- [ ] C1. `pnpm --filter mobile test schemaMigrate` → 两快照通过（行为不变）
- [ ] C2. ESLint complexity 复测：`npx eslint apps/mobile/src/db/schema.ts --rule '{"complexity":["error",15]}' --no-eslintrc --parser @typescript-eslint/parser` → migrateDatabase ≤15、dispatchStep ≤15
- [ ] C3. `pnpm run lint` → 0 error 0 warning（不新增 disable）
- [ ] C4. `pnpm run type-check` → 0 错误
- [ ] C5. `pnpm run test` → 全量通过（≥1974 基线，新增 schemaMigrate 测试）

## 验证命令

```bash
pnpm --filter mobile test -- schemaMigrate     # 表征快照
npx eslint apps/mobile/src/db/schema.ts --rule '{"complexity":["error",15]}' --no-eslintrc --parser @typescript-eslint/parser
pnpm run lint
pnpm run type-check
pnpm run test
```

## 风险文件 / 回滚点

- **高风险**：`apps/mobile/src/db/schema.ts`（migrateDatabase 主函数 + 6 个 migrateXxx）
  - 回滚：`git revert <重构 commit>` 恢复旧 migrateDatabase；测试基线 commit 可保留
- **新增**：`apps/mobile/src/db/schemaMigrate.test.ts`（fake + 快照，可独立 revert）

## 分 commit 策略

1. `test(db): migrateDatabase 表征测试基线 — fake SQLite + S1/S2 快照`（Phase A）
2. `refactor(db): migrateDatabase 表驱动重构 — MIGRATION_STEPS + dispatchStep，CC 38→≤15`（Phase B）

两 commit 独立，A 可单独保留（即使 B revert，测试基线仍有价值）。

## task.py start 前检查

- [ ] prd.md 收敛 pass 完成
- [ ] design.md + implement.md 完成
- [ ] implement.jsonl + check.jsonl 至少一条真实 spec/research 条目
