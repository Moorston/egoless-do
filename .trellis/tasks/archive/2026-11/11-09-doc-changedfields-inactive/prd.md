# docs(store): 标注 changedFields 字段级 delta 特性为未激活

## Goal

在 `changedFields` 字段级 delta 管线的入口和关键节点加注释，明确该特性端到端接好但 slice 未激活，未来启用方式。

## Background

审查 WriteBatcher 时初判 `changedFields` 为"死特性"，进一步核查发现不准确：

完整管线（端到端接好）：
- `WriteBatcher.write(entity, id, data, changedFields?)` → payload `{...data, _changedFields: changedFields}` → sync_queue。
- `SyncEngine`（line 336-339）从 queue payload 读 `_changedFields` → 传入 `SyncChange.changedFields` → 推送服务端。
- `core/src/sync/types.ts:11` `SyncChange.changedFields?: string[]` —— "Field-level delta: if set, server only merges these fields."
- `infra/docker/api/src/sync.ts:170-182` 服务端有真实字段级 merge 逻辑：`_changedFields` 存在时只合并指定字段，否则全量合并。

唯一缺口：slice 调 `adapter.persistChange('habit', id, updated)` 不传第 4 参 `changedFields`，`mobileStorageAdapter.persistChange`（line 53-57）调 `_batcher.write(entity, id, data)` 也不传 → 全链路始终 `undefined` → 服务端走 `else` 全量分支。

运行时零成本（永远 undefined）。不是死代码，是**接好但未激活的优化特性**。对共享 collection（如 body_plans 多客户端编辑不同字段）有意义，避免覆盖未变更字段。

## Requirements

- 在 `mobileStorageAdapter.persistChange` 和/或 `WriteBatcher.write` 入口加注释：说明 changedFields 字段级 delta 管线已端到端接好（WriteBatcher → SyncEngine → 服务端 api/sync.ts 字段级 merge），但 slice 当前不传，始终 undefined，走全量 merge。未来启用需 slice 计算 changedFields 并传入 persistChange。
- 不改任何代码行为。
- 不删任何现有逻辑（保留基础设施）。

## Acceptance Criteria

- [ ] `persistChange`/`write` 入口有注释说明 changedFields 管线状态。
- [ ] 无代码行为变更（仅注释）。
- [ ] `npx vitest run apps/mobile/src/store/WriteBatcher.test.ts` 全绿（回归确认）。

## Notes

- 纯文档标注，零行为风险。
- 保留基础设施以备未来激活（属功能开发，需单独规划）。
