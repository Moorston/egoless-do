# dedupe-row-to-entity-map — 消除 SyncApplyService 重复 rowToEntity map

> 关联 OpenSpec change: `openspec/changes/dedupe-row-to-entity-map/`（proposal/design/specs/tasks 已就绪）

## Goal

消除 `apps/mobile/src/features/sync/SyncApplyService.ts:76-97` 的私有 `_rowToEntityMap`——它与 `rowMappers.ts:113` 导出的 `rowToEntityMap` 是同一组 38 个函数引用的纯重复包装。SyncApplyService 改为直接 import + 使用 `rowToEntityMap`，行为完全不变。

## Background

explore 深挖纠正了上一 change（`consolidate-entity-store-key-mapping`）design D5 的错误判断——当时记"_rowToEntityMap 无法从 SCHEMAS 派生（函数非数据）"，实际 `rowMappers.ts` 早已用 `buildRowToEntity<Type>(SCHEMAS.xxx)` 完成派生（38 实体 + 1000+ 行测试）。`SyncApplyService._rowToEntityMap` 只是把 rowMappers 的 38 个单体函数重新组装成 map，与已导出的 `rowToEntityMap` 完全重复。漏登记新实体的风险与 `c34c8ab8` bodyTrainingPlan 同构。

## Requirements

- **R1**：删 `SyncApplyService.ts:10-21` 的 38 个 `rowToXxx` 单体 import，改 `import { rowToEntityMap } from '../../store/rowMappers'`
- **R2**：删 `SyncApplyService.ts:76-97` 的 `_rowToEntityMap` Record 定义
- **R3**：消费点改名——`:238` `const mapper = _rowToEntityMap[entity]` → `rowToEntityMap[entity]`；`:410` `return _rowToEntityMap[entity] as RowMapper | undefined` → `rowToEntityMap[entity] as RowMapper | undefined`
- **R4**：加覆盖校验测试——断言 `Object.keys(rowToEntityMap)` ≡ `Object.keys(SCHEMAS)`（排除显式无 mapper 实体），失败时点名缺失实体，进标准 `pnpm run test`

## Acceptance Criteria

- [ ] AC1：`SyncApplyService.ts` 无 `_rowToEntityMap` Record 字面量，无 38 个 `rowToXxx` 单体 import
- [ ] AC2：`:238`/`:410` 消费点使用 `rowToEntityMap[entity]`
- [ ] AC3：覆盖校验测试在 `pnpm run test` 跑且通过
- [ ] AC4：`pnpm run test` 全量通过（含 `SyncApplyService.test.ts` + `rowMappers.test.ts`）
- [ ] AC5：`pnpm run lint` 0 error 0 warning
- [ ] AC6：`pnpm run type-check` 0 错误
- [ ] AC7：运行时行为不变（同函数引用，由现有测试锁定）

## Out of Scope

- `rowMappers.ts:65` breath 类型 hack（`(SCHEMAS as Record<string, ...>).breath ?? SCHEMAS.zhiguanSession` 怪断言）——独立 smell，另立探索
- `_serverPayloadToRowFns`（已是派生，不动）
- `consolidate-entity-store-key-mapping` design D5 的文字纠正（本 change 实施时在源 change 备注或忽略，不影响运行）

## Resolved Decisions

- **轻量任务 PRD-only**：改动极小（4 处 + 1 测试），OpenSpec change 已有 design/tasks，Trellis 不重复 design.md/implement.md。inline 实施（不派子代理）。
- **单 commit**：`refactor(sync): 消除 SyncApplyService 重复 rowToEntity map，收敛到 rowMappers 真理源`
