# Implement — consolidate-entity-store-key-mapping

> 派生自 `openspec/changes/consolidate-entity-store-key-mapping/tasks.md`，补充验证命令与风险文件。

## 执行顺序

> R1（SCHEMAS 补 storeKey）+ R4（表征测试）先于 R2（mobile re-export）。测试在 mobile 改动前建立并跑通，锁定 core 派生值正确。

### Phase A — SCHEMAS 补 storeKey + 测试基建（core）

- [ ] A1. `entitySchemas.ts`：为 37 个实体补 `storeKey`（按 OpenSpec design.md transcription 表逐字填入；`foodPreset` 已设不动）。`aiConfig` 加 `noStore: true` 元数据。
- [ ] A2. `entities.ts`：派生 `ENTITY_STORE_KEY` 时 filter 掉 `noStore` 实体（`Object.keys(SCHEMAS).filter(k => !SCHEMAS[k].noStore)`）。
- [ ] A3. 新建 `packages/core/src/sync/entities.test.ts`：硬编码 38 实体期望 `storeKey`，断言 `ENTITY_STORE_KEY[entity]` 逐字相等；快照全表；断言 `Object.keys(ENTITY_STORE_KEY)` ≡ 非 noStore 实体。
- [ ] A4. 提取 `validateEntityMappings()` 纯函数（core 内）：扫描 `SCHEMAS`，对非 `noStore` 实体断言有非空 `storeKey`，返回缺失列表；测试里调用断言空列表。
- [ ] A5. 跑 `entities.test.ts` 通过（core 派生值已正确，mobile 未动）。
- [ ] A6. `pnpm run lint` / `pnpm run type-check` 确认 core 合规。

**验证点**：A5 通过 = core 真理源正确，派生值锁定。

### Phase B — mobile 收敛到 core 派生版

- [ ] B1. `SyncApplyService.ts:33-52`：删手写 `ENTITY_STORE_KEY` Record，改 `export { ENTITY_STORE_KEY } from '@egoless-do/core'`。
- [ ] B2. `_specialEntities` 改为从 `SCHEMAS` 的 `noStore` 派生（或直接由校验逻辑用 `noStore` 判断，消除 mobile 私有集合）。
- [ ] B3. 修 `SyncApplyService.ts:63` `console.warn` → `createLogger`（DEV 守卫保留作即时反馈，权威校验在 A4）。
- [ ] B4. 确认 `mergeSyncPatch.ts:9`、`SyncEngine.ts:847/872` import 路径不变（仍 `./SyncApplyService`），值不变。
- [ ] B5. 确认 `SyncApplyService.test.ts:192-199` 的 `ENTITY_STORE_KEY.habit==='habits'` 等断言仍成立（值不变）。

**验证点**：mobile import 来源切换，运行时值不变。

### Phase C — 验证门禁

- [ ] C1. `pnpm --filter core test -- entities` → 新测试通过
- [ ] C2. `pnpm run test` → 全量通过（含 `SyncApplyService.test.ts` + `SyncEngine.test.ts`）
- [ ] C3. `pnpm run lint` → 0 error 0 warning
- [ ] C4. `pnpm run type-check` → 0 错误
- [ ] C5. 手动核对 `Object.values(ENTITY_STORE_KEY)` 与重构前手写版逐字一致（由 A3 硬编码期望保证）

## 验证命令

```bash
pnpm --filter @egoless-do/core test -- entities    # 表征测试 + 校验
pnpm run test                                       # 全量
pnpm run lint
pnpm run type-check
```

## 风险文件 / 回滚点

- **高风险**：`packages/core/src/sync/entitySchemas.ts`（38 实体 transcription，笔误即 slice key 变化 → store 状态丢失）
  - 回滚：`git revert <commit 1>` 恢复空 storeKey；core 派生回死代码状态
- **中风险**：`apps/mobile/src/features/sync/SyncApplyService.ts`（re-export + `_specialEntities` 改造）
  - 回滚：`git revert <commit 2>` 恢复手写 Record
- **新增**：`packages/core/src/sync/entities.test.ts`（表征测试，可独立保留）

## 分 commit 策略

1. `refactor(sync): SCHEMAS 补 storeKey + entities 表征测试 + validateEntityMappings`（Phase A）
2. `refactor(sync): mobile ENTITY_STORE_KEY 收敛到 core 派生版 + console.warn 修复`（Phase B）

## task.py start 前检查

- [ ] prd.md 收敛 pass
- [ ] design.md + implement.md 完成
- [ ] implement.jsonl + check.jsonl 至少一条真实 spec/research 条目
- [ ] Open Questions 已决议（design.md「Open Question 决议」）
