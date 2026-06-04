## 1. 核心业务逻辑

- [x] 1.1 在 `packages/core/src/business/habits.ts` 中添加 `checkAutoStatus` 纯函数
- [x] 1.2 在 `packages/core/src/business/habits.test.ts` 中添加 `checkAutoStatus` 单元测试

## 2. Store 层

- [x] 2.1 在 `packages/core/src/store/types.ts` 的 `HabitSlice` 接口中添加 `checkAutoStatus` 方法
- [x] 2.2 在 `packages/core/src/store/createHabitSlice.ts` 中实现 `checkAutoStatus` 方法

## 3. DailyResetManager 集成

- [x] 3.1 在 `packages/core/src/dailyReset.ts` 的 `DailyResetDeps` 接口中添加 `onHabitDailyReset` 回调
- [x] 3.2 在 `DailyResetManager.check()` 方法中调用 `onHabitDailyReset` 回调

## 4. Web 端集成

- [x] 4.1 在 `apps/web/src/store/useWebStore.ts` 的 `DailyResetManager` 初始化时添加 `onHabitDailyReset` 回调
- [x] 4.2 在 `loadPromise` 完成后调用 `checkHabitAutoStatus()` (数据加载后自动启动)

## 5. Mobile 端集成

- [x] 5.1 在 `apps/mobile/src/store/useAppStore.ts` 的 `DailyResetManager` 初始化时添加 `onHabitDailyReset` 回调
- [x] 5.2 在 `onRehydrateStorage` 中内联实现自动启动逻辑 (绕过命名冲突)

## 6. 命名冲突修复

- [x] 6.1 将 `HabitSlice.checkAutoStatus` 重命名为 `checkHabitAutoStatus` 避免与 `PlanSlice.checkAutoStatus` 冲突
