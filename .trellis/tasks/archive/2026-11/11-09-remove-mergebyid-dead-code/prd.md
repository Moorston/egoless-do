# refactor(sync): 删除孤立的 mergeById 工具

## Goal

删除 `packages/core/src/sync/merge.ts`（`mergeById`）及其测试 `merge.test.ts`，并从 `sync/index.ts` 移除导出。上一个任务删除 `mergeEngine.ts` 后，`mergeById` 失去唯一生产消费者。

## Background

可达性核查（grep `mergeById`，排除 dist）：
- `sync/index.ts:3` — `export * from './merge'`（导出）
- `sync/merge.ts` — 定义
- `sync/merge.test.ts` — 测试

无其他消费者。原唯一生产消费者是 `store/mergeEngine.ts` 的 `buildMergePatch`（已在上个任务删除）。mobile 路径用 `SyncApplyService`（SQL 内联合并），`mergeSyncPatch` 有自己的内联合并逻辑，都不调用 `mergeById`。

注：2 个任务前为 `mergeById` 加的软删除复活修复（守卫 + 4 测试）随本次删除一并移除 —— 死代码的修复无保留意义。

## Requirements

- 删除 `packages/core/src/sync/merge.ts`。
- 删除 `packages/core/src/sync/merge.test.ts`。
- 从 `sync/index.ts` 移除 `export * from './merge'`。
- 不动 `conflict.ts`（连带孤立，单独后续决定，见 Notes）。

## Acceptance Criteria

- [ ] `merge.ts`、`merge.test.ts` 已删除。
- [ ] `sync/index.ts` 不再导出 `./merge`。
- [ ] grep 确认无残留 `mergeById` 引用（排除 dist/）。
- [ ] `npx vitest run packages/core/src/sync/` 全绿。
- [ ] `npx tsc -p packages/core/tsconfig.json --noEmit` 0 错误。

## Notes

- **附带发现（不在本任务范围）**：删除 `merge.ts` 后，`resolveConflict`（`conflict.ts`）也失去唯一消费者（其唯一调用方是 `merge.ts`，mobile 路径用内联时间戳比较）。`conflict.ts` + `conflict.test.ts` 成为新的孤立纯工具，待后续决定是否一并清理或保留为 API 表面。
- `sync/conflict.ts` 当前仍被 `sync/index.ts` 导出且在 spec Sync Protocol 表中登记，本任务不触碰。
