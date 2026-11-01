# Design — consolidate-entity-store-key-mapping

> 权威技术设计：`openspec/changes/consolidate-entity-store-key-mapping/design.md`（5 Decisions + transcription 表 + 风险/回滚）。本文档补充 Trellis 实施视角与 Open Question 决议。

## Open Question 决议（task.py start 前定）

1. **`aiConfig` 特殊处理：用 `SCHEMAS[entity].noStore: true` 元数据**（不保留 mobile `_specialEntities`）。
   - 理由：彻底单一真理源。`noStore` 与 `storeKey` 同在 schema，加新无 slice 实体时只需标 `noStore`，派生逻辑与校验自动适配。
   - 派生逻辑：`ENTITY_STORE_KEY` 只含非 `noStore` 实体（`entities.ts` 派生时 filter）；`_specialEntities` 在 mobile 改为 `new Set(SCHEMAS 中 noStore 的 entity 名)` 或直接消亡（校验函数用 `noStore` 判断）。

2. **`PB_COLLECTION_OVERRIDES`（`ai_configs`）：本次不动**。
   - 理由：scope 控制；`ENTITY_COLL_MAP` 相对健康（派生为主 + 单条显式 override）。移入 `SCHEMAS[aiConfig].pbCollection` 是独立收益，记为后续 change 候选。

## 实施约束（Trellis 视角）

- **依赖方向**：core 派生在 core 内，mobile re-export core。符合 `ARCHITECTURE-CONSTRAINTS`（`packages/core` ← `apps/mobile`，core 不反向依赖）。
- **GLOBAL-CODE-STANDARDS**：`SyncApplyService.ts:63` 的 `console.warn` → `createLogger`（本任务修）；新增 `validateEntityMappings` 用 `createLogger` 若需日志；无 `any`（`storeKey` 字段是 `string`，派生类型安全）。
- **表征测试策略差异**（vs migrateDatabase）：migrateDatabase 用纯快照（SQL 序列长且交错，硬编码不可行）；本任务映射值是有限可枚举 38 条，用**硬编码期望 + 快照双保险**——硬编码防快照误更新掩盖回归，快照防 transcription 笔误。
- **风险文件**：`packages/core/src/sync/entitySchemas.ts`（38 实体 transcription，高风险）、`apps/mobile/src/features/sync/SyncApplyService.ts`（re-export + console.warn 修）、`packages/core/src/sync/entities.ts`（派生逻辑加 noStore filter）。
- **回滚**：`git revert` 恢复手写 Record + 空 storeKey；core 派生版回死代码状态（不影响运行，因无消费者）。

## 双 commit 策略

1. `refactor(sync): SCHEMAS 补 storeKey + entities 表征测试 + validateEntityMappings`（core 改动 + 测试，可独立保留）
2. `refactor(sync): mobile ENTITY_STORE_KEY 收敛到 core 派生版 + console.warn 修复`（mobile re-export）

commit 1 即使 commit 2 revert 仍有价值（core 真理源正确 + 测试基建）。commit 2 依赖 commit 1（mobile re-export 的 core 派生版必须值正确）。

## 详细设计与 transcription 表

见 `openspec/changes/consolidate-entity-store-key-mapping/design.md`（D1 transcription 表、D2-D5 决策、风险/回滚、Open Questions 原文）。
