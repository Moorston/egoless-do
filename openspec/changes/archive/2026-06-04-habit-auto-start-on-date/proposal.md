## Why

习惯功能缺少自动启动机制。当用户创建习惯并设置开始日期后，如果开始日期已到，习惯状态不会自动从"未开始"变为"进行中"。用户必须手动更改状态，这与计划（Plan）功能的自动启动行为不一致，影响用户体验。

## What Changes

- 在 `packages/core/src/business/habits.ts` 中添加 `checkAutoStatus` 纯函数
- 在 `packages/core/src/store/types.ts` 的 `HabitSlice` 接口中添加 `checkAutoStatus` 方法
- 在 `packages/core/src/store/createHabitSlice.ts` 中实现 `checkAutoStatus` 方法
- 在 `packages/core/src/dailyReset.ts` 的 `DailyResetDeps` 接口中添加 `onHabitDailyReset` 回调
- 在 `DailyResetManager.check()` 方法中调用 `onHabitDailyReset` 回调
- 在 `apps/web/src/store/useWebStore.ts` 和 `apps/mobile/src/store/useAppStore.ts` 中添加 `onHabitDailyReset` 回调
- 在 `apps/web/src/components/HabitsTab.tsx` 和 `apps/mobile/src/features/habits/HabitsScreen.tsx` 的 `useEffect` 中调用 `checkAutoStatus()`

## Capabilities

### New Capabilities
- `habit-auto-start`: 习惯自动启动功能，当开始日期到达时自动将习惯状态从"未开始"变为"进行中"

### Modified Capabilities

## Impact

- **平台**: 全部（web 和 mobile）
- **代码**: packages/core 业务逻辑层，apps/web 和 apps/mobile 前端层
- **依赖**: 无新增依赖
- **系统**: DailyResetManager 需要添加新的回调
