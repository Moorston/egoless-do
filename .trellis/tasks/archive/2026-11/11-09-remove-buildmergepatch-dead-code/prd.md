# refactor(sync): 删除 buildMergePatch web 死代码路径

## Goal

删除 `packages/core/src/store/mergeEngine.ts`（`buildMergePatch` + `ENTITY_MERGE_MAP`）及 `createAuthSlice.pullServerData` 里的 web 回退分支，消除缺 14 实体的死代码陷阱。

## Background

审查发现 `ENTITY_MERGE_MAP` 硬编码 23 个实体，缺失 14 个（motivationEntry/customWuxing/foodPreset/vision 系列/mantra 系列/sutraReading/fear 系列/zhiguanSession/breath）。`buildMergePatch` 是 `createAuthSlice.pullServerData` 的 web 回退路径：

```
if (onPullServerData) { await onPullServerData(...); return; }  // mobile 走这条
// Default: merge directly into store (web path)               // 死代码
const result = await apiSyncPull(token, userId);
set(s => { const patch = buildMergePatch(result.data, s); ... });
```

可达性核查：
- `apps/web` 已归档（目录不存在），`apps/` 下只有 `mobile/`。
- mobile 注入 `onPullServerData` delegate（走 `SyncApplyService`，从 SCHEMAS 派生覆盖全实体）。
- `createAuthSlice` 的 10 个测试构造点全部传入 `mockOnPullServerData`。
- `buildMergePatch`/`ENTITY_MERGE_MAP` 无其他消费者（仅 `createAuthSlice` 和 `store/index.ts` 导出）。
- `apiSyncPull` 在 `createAuthSlice.ts` 仅用于 web 回退（删除后该 import 可移除；`apiSyncPull` 本身仍被 `SyncEngine` 使用，不删）。

结论：web 回退路径在生产和测试中都不可达，是纯死代码 + 陷阱（未来移除 delegate 或重建 web 时 14 实体静默丢失）。

## Requirements

- 删除 `packages/core/src/store/mergeEngine.ts` 文件。
- 删除 `createAuthSlice.ts` 的 `buildMergePatch` import 和 `apiSyncPull` import（仅 web 回退使用）。
- 删除 `pullServerData` 中的 web 回退分支（当前 line 258-273）。保留 delegate 路径和无 token 早返回。`onPullServerData` 保持可选 —— 无 delegate 时 `pullServerData` 走 no-op（比当前静默丢 14 实体更安全）。
- 删除 `store/index.ts` 的 `buildMergePatch`/`ENTITY_MERGE_MAP` 导出。
- 不改 `onPullServerData` 的可选签名（避免破坏构造点）。

## Acceptance Criteria

- [ ] `mergeEngine.ts` 已删除。
- [ ] `createAuthSlice.ts` 不再 import `buildMergePatch`/`apiSyncPull`，web 回退分支移除。
- [ ] `store/index.ts` 不再导出 `buildMergePatch`/`ENTITY_MERGE_MAP`。
- [ ] `pullServerData` 行为：有 delegate → 调 delegate；无 token → 早返回；无 delegate → no-op（不抛错、不 merge）。
- [ ] `npx vitest run packages/core/src/store/createAuthSlice.test.ts` 全绿（必要时更新 mock：`apiSyncPull` mock 可保留但不再被断言）。
- [ ] `npx vitest run packages/core/src/store/` 全绿。
- [ ] `pnpm run type-check`（core）无新增错误。
- [ ] grep 确认无残留 `buildMergePatch`/`ENTITY_MERGE_MAP` 引用（排除 dist/）。

## Notes

- 这是死代码清理，符合项目架构清理历史（changelog 多次 "remove dead code"）。
- 不改 `onPullServerData` 可选签名，最小爆炸半径。
- `apiSyncPull` 函数本身保留（`SyncEngine` 仍用）。
