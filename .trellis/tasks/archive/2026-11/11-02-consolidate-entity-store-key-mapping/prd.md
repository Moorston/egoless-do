# consolidate-entity-store-key-mapping — 同步实体映射单一真理源

> 关联 OpenSpec change: `openspec/changes/consolidate-entity-store-key-mapping/`（proposal/design/specs/tasks 已就绪，本任务实施该 change）

## Goal

消除 `ENTITY_STORE_KEY` 的双份定义，让 `SCHEMAS`（`packages/core/src/sync/entitySchemas.ts`）成为「实体→store slice key」映射的唯一真理源；mobile 手写 Record 删除改 re-export core 派生版；漏映射检测从 `__DEV__`+`console.warn` 升级为测试流水线硬失败。重构前后 38 实体映射值逐字节不变。

## Background

explore 模式深挖同步引擎发现（详见 OpenSpec proposal.md）：

- **双份定义**：`packages/core/src/sync/entities.ts:29` 从 `SCHEMAS` 派生（`storeKey ?? \`${entity}s\``），但 38 实体里 37 个未设 `storeKey`，fallback 对 17+ 实体产出错误值（如 `fasting→fastings` 而非 `fastingHistory`）；`apps/mobile/src/features/sync/SyncApplyService.ts:33` 手写 Record（正确）。core 派生版的值从未被消费——**误导性死代码**，未来误用即静默写错 17 个 slice。
- **漏映射实证**：`c34c8ab8` 修的 `bodyTrainingPlan` 漏映射。后果：pull 写不进 slice、`forceFullSync` 不清空 slice（残留陈旧）、`mergeSyncPatch` 不识别该 slice delta。
- **守卫失效**：两处 DEV 守卫（`SyncApplyService.ts:57-66`、`115-125`）只 `__DEV__` 跑，`:63` 行用 `console.warn`（违反 GLOBAL-CODE-STANDARDS），bodyTrainingPlan 漏了未被预警。
- 三处真实消费：`SyncApplyService.ts:212`（pull→slice）、`SyncEngine.ts:872`（forceFullSync 清空）、`mergeSyncPatch.ts:13`（反转成 `STORE_KEY_TO_ENTITY`）。

## Requirements

- **R1 — SCHEMAS 补 storeKey**：给 `entitySchemas.ts` 的 37 个实体（`foodPreset` 已设）显式设置 `storeKey` 字段，值按 OpenSpec design.md transcription 表逐字填入（与 mobile 现有手写版逐字对齐）。`aiConfig` 用 `noStore: true` 元数据标记（替代 mobile 私有 `_specialEntities`）。
- **R2 — mobile re-export core 派生版**：删除 `SyncApplyService.ts:33-52` 手写 `ENTITY_STORE_KEY` Record，改 `export { ENTITY_STORE_KEY } from '@egoless-do/core'`。`_specialEntities` 改为从 `SCHEMAS[entity].noStore` 派生。
- **R3 — 校验升级**：提取 `validateEntityMappings()` 纯函数（扫描 `SCHEMAS`，对非 `noStore` 实体断言有 `storeKey`），在 `packages/core/src/sync/entities.test.ts` 调用断言无 missing——进标准 `pnpm run test` 流水线，非 `__DEV__`-only。顺手修 `SyncApplyService.ts:63` 的 `console.warn` → `createLogger`。
- **R4 — 表征测试**：`entities.test.ts` 硬编码 38 实体期望 `storeKey`（design transcription 表），断言派生值逐字相等；快照 `ENTITY_STORE_KEY` 全表作字节级回归网；断言 `Object.keys(ENTITY_STORE_KEY)` ≡ `Object.keys(SCHEMAS)` 减 `noStore` 集合。

## Acceptance Criteria

- [ ] AC1：`SCHEMAS` 38 实体（除 `aiConfig` 标 `noStore`）均显式设 `storeKey`，无 fallback 触发
- [ ] AC2：`SyncApplyService.ts` 无手写 `ENTITY_STORE_KEY` Record 字面量，改为 re-export core
- [ ] AC3：`validateEntityMappings()` 在 `pnpm run test` 跑且通过（非 `__DEV__`-gated）
- [ ] AC4：表征测试硬编码期望 + 快照通过；派生值与重构前手写版逐字节一致
- [ ] AC5：`pnpm run lint` 0 error 0 warning（无 `console.warn`/`any`/`eslint-disable`）
- [ ] AC6：`pnpm run type-check` 0 错误（core + mobile）
- [ ] AC7：`pnpm run test` 全量通过（含新增 entities 测试 + 现有 `SyncApplyService.test.ts:192-199` 的 `ENTITY_STORE_KEY` 断言仍成立 + `SyncEngine.test.ts`）
- [ ] AC8：`mergeSyncPatch`、`SyncEngine.ts:847/872` import 路径不变、值不变、行为不变
- [ ] AC9：无新增 `any`、`console.log`、raw 用户可见字符串；依赖方向合规（core ← mobile，不反向）

## Out of Scope

- `PRAGMA user_version` 迁移版本跟踪
- SyncEngine push/pull 协议、rehydrate 失败追踪语义
- `_rowToEntityMap` 手写 mapper Record 治理（同结构性风险但需 schema 驱动 row mapper 注册表，另立 change `row-mapper-registry`）
- `ENTITY_COLL_MAP` / `PB_COLLECTION_OVERRIDES` 治理（相对健康，本次不动；见 OpenSpec design Open Question）
- store slice key 重命名（slice key 必须不变）

## Open Questions

- 见 OpenSpec design.md「Open Questions」：`noStore` 元数据 vs `_specialEntities`（本 prd 倾向 `noStore` 元数据）；`PB_COLLECTION_OVERRIDES` 是否移入 SCHEMAS（倾向不动）。需 task.py start 前在 design.md 评审确认。

## Resolved Decisions

- **复用 OpenSpec artifacts**：Trellis design.md / implement.md 直接派生自 OpenSpec design.md / tasks.md，不重复探索。
- **测试策略**：表征测试硬编码期望值（非纯快照），防快照误更新掩盖回归——与 migrateDatabase 的纯快照套路不同，因映射值是有限可枚举的 38 条。
- **双 commit 策略**：先 core SCHEMAS+测试，再 mobile re-export——前者可独立保留（即使后者 revert，core 真理源仍正确）。
