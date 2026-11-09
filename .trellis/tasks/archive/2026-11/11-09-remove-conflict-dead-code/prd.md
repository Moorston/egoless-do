# refactor(sync): 删除孤立的 conflict.ts 纯工具

## Goal

删除 `packages/core/src/sync/conflict.ts`（`resolveConflict` + `ConflictInput` + `ConflictResult`）及其测试 `conflict.test.ts`，从 `sync/index.ts` 移除导出，并清理 `SyncService.test.ts` 里无用的 `resolveConflict` mock 条目。

## Background

删除 `mergeById`（`merge.ts`）后，`resolveConflict` 失去唯一消费者（其唯一调用方是 `merge.ts`）。

可达性核查（grep `resolveConflict`/`ConflictInput`/`ConflictResult`，排除 dist）：
- `sync/conflict.ts` — 定义
- `sync/conflict.test.ts` — 测试
- `sync/index.ts:2` — `export * from './conflict'`
- `apps/mobile/src/features/sync/SyncService.test.ts:45` — `@egoless-do/core` 整体 mock 里的防御性条目（`SyncService.ts` 不导入 `resolveConflict`，该 mock 条目无用）
- `apps/mobile/src/store/syncStore.ts:42/81` — 同名 store 方法 `resolveConflict(id, resolution)`，UI 冲突解决，签名/语义完全不同，与本项无关。

mobile apply 路径（`SyncApplyService.applyEntityToTable`）用内联时间戳比较，不调用 `resolveConflict`。

## Requirements

- 删除 `packages/core/src/sync/conflict.ts`。
- 删除 `packages/core/src/sync/conflict.test.ts`。
- 从 `sync/index.ts` 移除 `export * from './conflict'`。
- 从 `SyncService.test.ts` 的 `@egoless-do/core` mock 移除 `resolveConflict` 条目。
- 不动 `syncStore.ts` 的同名 UI 方法（无关）。

## Acceptance Criteria

- [ ] `conflict.ts`、`conflict.test.ts` 已删除。
- [ ] `sync/index.ts` 不再导出 `./conflict`。
- [ ] `SyncService.test.ts` mock 不再含 `resolveConflict` 条目。
- [ ] grep 确认无残留 `resolveConflict`（core 纯函数）/`ConflictInput`/`ConflictResult` 引用（`syncStore.ts` 同名 UI 方法除外，排除 dist）。
- [ ] `npx vitest run packages/core/src/sync/ apps/mobile/src/features/sync/SyncService.test.ts` 全绿。
- [ ] `npx tsc -p packages/core/tsconfig.json --noEmit` 0 错误。

## Notes

- 这是 `mergeEngine.ts` → `merge.ts` → `conflict.ts` 死代码清理链的最后一环。
- 删除后 P3「resolveConflict 测试缺口」自动消失。
