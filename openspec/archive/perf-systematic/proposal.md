## Why

全面审计发现 122 个问题后，Phase 1-4 已修复 30+ 个高优先级问题。本次 change 处理剩余的系统性性能和架构问题：
- 65 个屏幕使用 bare `useAppStore()` 导致任何状态变更触发全局重渲染
- rehydrateFromDb 串行执行 38 个 SQLite 查询
- orphanRecovery 存在 N+1 查询模式（最坏 38,190 次查询）
- Global-pulse 业务逻辑违反架构原则（在 apps/ 中而非 packages/core）

## What Changes

### Zustand selector 系统性改造（65 文件）
所有使用 bare `useAppStore()` 的屏幕改为 `useShallow` targeted selector，每个屏幕只订阅实际使用的 store 属性。

### rehydrateFromDb 并行化
`SyncEngine.ts` 中 38 个独立 SQLite 查询从串行 `for...of` 改为 `Promise.all` 并行执行。

### orphanRecovery N+1 消除
将 `SELECT pk` + 逐行 `SELECT *` 的两步查询合并为单个 `SELECT * WHERE pk NOT IN (...)` 查询。

### Global-pulse 业务逻辑迁移
- `coordinateFuzzing.ts` → `packages/core/src/business/`
- `markerAggregation.ts` → `packages/core/src/business/`
- `reverseGeocoding.ts` → `packages/core/src/business/`
- `globalPulse.ts` types → `packages/core/src/types/`

## Impact

- 102 files changed, 1,645 insertions, 729 deletions
- Zero bare `useAppStore()` remaining in entire codebase
- rehydrateFromDb: 38 sequential queries → 1 parallel batch
- orphanRecovery: N+1 → single query per entity
- Global-pulse business logic now in packages/core (architecture compliance)

## Verification

- type-check: ✅ 通过（所有错误为预先存在）
- 测试: ✅ 963 通过 / 5 失败（全部预先存在）
