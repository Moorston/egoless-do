# fix(sync): 防止软删除记录被服务端较新版本复活

## Goal

修复 `packages/core/src/sync/merge.ts` 中 `mergeById` 的软删除复活 bug：当本地记录已软删除（`deleted=true`）且服务端推来一条较新的非删除版本时，本地 tombstone 不应被覆盖复活。

## Background

- 写入路径中的删除是软删除，本地 tombstone 会留在待推送队列里，等下一次 push 把删除同步到服务端。
- 拉取合并时，`mergeById` 把冲突全权委托给 `resolveConflict`（`conflict.ts`）。
- `resolveConflict` 在 `clientDeleted && !serverDeleted` 时仍按时间戳判定：当 `serverUpdated > clientUpdated` 时返回 `winner: 'server'`，于是非删除的服务端记录覆盖本地 tombstone，再经末尾 `filter(!item.deleted)` 保留下来 —— 复活发生。
- 已有改动（工作区未提交）已在 `merge.ts` 加入守卫，并在 `merge.test.ts` 加入 4 个测试覆盖。本任务负责整理、验证并提交。

## Requirements

- 在 `mergeById` 中，当 `existing.deleted && !item.deleted` 时跳过服务端记录，保留本地 tombstone（删除仍待推送）。
- 守卫不得影响其他路径：
  - 服务端删除传播到本地活跃记录（`existing` 非删除）—— 正常走 `resolveConflict`。
  - 双方都活跃的 newer-server-wins —— 行为不变。
- 保留 `mergeById` 末尾的 `filter(!item.deleted)`，tombstone 不出现在合并输出中。

## Acceptance Criteria

- [ ] `mergeById` 在 `existing.deleted && !item.deleted` 时 `continue`，不调用 `resolveConflict`。
- [ ] `merge.test.ts` 含 4 个软删除保留测试，覆盖：本地删除 vs 服务端较新非删除、`deleted` 为 `undefined`/`1` 假值变体、服务端删除传播、正常 newer-server-wins 不变。
- [ ] `npx vitest run packages/core/src/sync/merge.test.ts` 全绿。
- [ ] 改动已提交，提交信息遵循仓库约定（scope: `fix(sync)`）。

## Notes

- 纯函数改动，core 层内，无新依赖，符合架构约束。
- 守卫是策略层决策：本地待推送删除优先于服务端较新非删除记录，直到删除推送完成。
