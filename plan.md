# 剩余代码质量修复 — 实施计划

## Change 1: `perf-systematic` — 系统性性能优化

### 1.1 Zustand selector 改造（65 文件）
- 为所有使用 bare `useAppStore()` 的屏幕添加 `useShallow` targeted selector
- 分批进行：home(11) → reflections(12) → practice(8) → plan(6) → 其余(28)
- 每个文件：读取 → 识别使用的属性 → 改为 `useAppStore(useShallow(s => ({...})))` → 更新引用

### 1.2 rehydrateFromDb 并行化
- `SyncEngine.ts` L987-1071: `for...of` → `Promise.all`
- 38 个独立查询，互不依赖，安全并行

### 1.3 orphanRecovery N+1 消除
- `orphanRecovery.ts` L46-69: 两步查询合并为单个 `SELECT * WHERE pk NOT IN (...)`
- 消除最坏情况 38,190 次查询

### 1.4 ScrollView → FlatList（历史页面优先）
- 8 个高频历史页面：FastHistoryPage, MedHistoryPage, SleepHistoryPage, ExerciseHistoryScreen, BreathHistoryPage, PreceptHistoryPage, GiveHistoryPage, CheckinHistoryScreen
- 使用已有的 `VirtualList` (FlashList) 组件

## Change 2: `type-safety-systematic` — 系统性类型安全

### 2.1 rowMappers 类型安全改造
- 修复 `buildRowToEntity` 的泛型丢失问题
- 33 个 mapper 去除 `as unknown as`，使用类型安全的映射

### 2.2 Global-pulse 业务逻辑迁移
- `coordinateFuzzing.ts` → `packages/core/src/business/`
- `markerAggregation.ts` → `packages/core/src/business/`
- 提取 `globalPulseApi.ts` 纯函数
