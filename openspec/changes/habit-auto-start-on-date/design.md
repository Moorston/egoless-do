## Context

当前习惯功能的状态管理与计划功能不一致。计划功能有完整的自动启动机制：
- `checkAutoStatus` 函数检查 `startDate <= today` 时自动启动
- 在 `HomeTab` 的 `useEffect` 中调用（App 启动时）
- 在 `performDailyReset` 中调用（零点时）

习惯功能缺少类似的自动启动机制，导致用户必须手动更改状态。

## Goals / Non-Goals

**Goals:**
- 实现习惯自动启动功能，与计划功能保持一致
- 支持 App 启动时检查和零点自动触发
- 支持 backfill 多天的逻辑（App 关闭多天后启动）

**Non-Goals:**
- 不实现"已有 active 习惯则不自动启动"的限制
- 不改变现有习惯的状态转换逻辑

## Decisions

### 1. 复用 DailyResetManager 机制

**决策**: 在 `DailyResetManager` 中添加 `onHabitDailyReset` 回调，与 `onPlanDailyReset` 保持一致。

**理由**:
- 统一的重置机制，减少代码重复
- 自动支持 App 启动、零点触发、visibility change 等场景
- 自动支持 backfill 多天的逻辑

**替代方案**:
- 独立实现定时器：需要额外处理多种触发场景，增加复杂度

### 2. 纯函数 + Store 方法分离

**决策**: 在 `packages/core/src/business/habits.ts` 中实现 `checkAutoStatus` 纯函数，在 `createHabitSlice` 中调用。

**理由**:
- 与 Plan 的实现模式保持一致
- 纯函数易于测试
- 业务逻辑与状态管理分离

### 3. 排除已完成和已放弃的习惯

**决策**: 在 `checkAutoStatus` 中跳过 `completed` 和 `abandoned` 状态的习惯。

**理由**:
- 这些状态是最终状态，不应自动转换
- 与用户预期一致

## Risks / Trade-offs

**[风险] 零点触发时的持久化**
- 问题：零点触发时需要持久化状态变更
- 缓解：在 `HabitSlice.checkAutoStatus` 方法中直接持久化，与现有 `changeHabitStatus` 方法保持一致

**[风险] 性能影响**
- 问题：频繁调用 `checkAutoStatus` 可能影响性能
- 缓解：只在 App 启动和零点触发时调用，频率很低

**[权衡] 状态变更时机**
- 权衡：自动启动可能在用户不注意时发生
- 接受：与 Plan 功能保持一致，用户可以通过状态筛选查看变更
