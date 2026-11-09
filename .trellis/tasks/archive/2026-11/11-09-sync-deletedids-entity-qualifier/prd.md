# fix(sync): deletedIds 复活防护补全 entity 维度，修复 date-pk 跨实体碰撞

## Goal

修复 `SyncApplyService.applyEntityToTable` 中 `deletedIds` 复活防护的跨实体 ID 碰撞 bug：当前 `deletedIds` 是扁平 `Set<string>`（仅 id），导致不同实体共享同一 id 时误跳过合法服务端记录。

## Background

`checkin` / `meditation` / `grace` 三个实体的 SQLite pk 都是 `date`（`entitySchemas.ts:336/402/548`）。`deletedIds` 来自 `useSync.ts` 的 `deletedIdsProvider`，从 `recycleBin` 取 `r.id` 组成扁平 Set，无 entity 维度。

`applyEntityToTable`（`SyncApplyService.ts:233`）跨所有实体匹配：
```ts
if (deletedIds?.has(id)) continue;
```

**碰撞场景**：用户删除 checkin(date=`X`) → `X` 进 recycleBin → 服务端推 meditation/grace(date=`X`) 的更新 → `deletedIds.has("X")` 命中 → **静默跳过，服务端更新丢失**。

**对照**：同文件 `_locallyDeleted`（line 111/234）已用 `${entity}:${id}` 复合键，是正确的先例；但它是 60s 内存窗口。recycleBin 这条是持久化跨会话防护，却丢了 entity 维度。

## Requirements

- `deletedIds` 的键改为 entity 限定的复合键 `${entity}:${id}`，复用 `_locallyDeleted` 已建立的复合键约定。
- `useSync.ts` 的 `deletedIdsProvider` 从 `recycleBin` 生成 `${r.entityType}:${r.id}` 键（`RecycleBinEntityType` 的 7 个值与对应 `SyncEntity` 同名，直接可用）。
- `SyncApplyService.applyEntityToTable` 的跳过判断改为 `deletedIds?.has(`${entity}:${id}`)`。
- `Set<string>` 类型签名在 `SyncEngine` / `SyncRealtimeController` / `SyncApplyService` 链路上保持不变（仅键格式变化，最小爆炸半径）。
- 不改变 `_locallyDeleted` 60s 窗口机制。

## Acceptance Criteria

- [ ] `useSync.ts` `deletedIdsProvider` 返回 `${entityType}:${id}` 复合键 Set。
- [ ] `SyncApplyService.ts:233` 改为 `deletedIds?.has(`${entity}:${id}`)`。
- [ ] 现有测试 `SyncApplyService.test.ts:381` 更新为复合键（`'habit:h1'`）。
- [ ] **新增回归测试**：两个 date-pk 实体（如 checkin + grace）共享同一 date id，仅 checkin 在 deletedIds 中 → grace 的记录必须被正常应用，不被跳过。
- [ ] `npx vitest run apps/mobile/src/features/sync/SyncApplyService.test.ts` 全绿。
- [ ] `npx vitest run packages/core/src/sync/` 全绿（无回归）。

## Notes

- 修复方案匹配 `_locallyDeleted` 已有约定（`${entity}:${id}`），保持代码库一致性。
- `RecycleBinEntityType` 值（habit/reflection/food/exercise/plan/breath/planItem）与对应 `SyncEntity` 同名，无需 ENTITY_TYPE_MAP 转换，直接用 `entityType` 作前缀。
- 不改 `Set<string>` 类型，避免跨 3 文件签名变更。
