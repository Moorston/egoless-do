# 拆分 BodyDashboard — Banner + 聚合 hook

## Goal

将 `BodyDashboard.tsx` 的 ESLint cyclomatic complexity 从 85 降至 ≤30（AC 要求 ≤15），通过提取 4 个 Banner 子组件 + 2 个聚合 hook，同时保持消费方零改动。

## Background

BodyDashboard 是调身页仪表盘，复杂度 85 是全项目最高。复杂度来源：12 个 useMemo 派生、10 个 useCallback 处理器、4 个内联 Banner 的条件渲染（三元嵌套 `todayOverride?.type === 'skip' ? ... : ...`）。

**已有提取**（复用，不重复）：
- `useBodyFlowState` / `useTodayPlan` hooks
- 9 个模态组件（QuickSwapModal, AdjustExerciseModal, DayActionSheet, GoalEditLightModal 等）
- `CelebrationOverlay` 组件
- `BodyDashboardStyles` 样式

## Requirements

### R1 — 提取 4 个 Banner 子组件
1. `TodayPlanBanner` — 今日方案 + Flow 进度（含 override 状态条）
2. `BodyProfileBanner` — 身体档案（目标、训练计划）
3. `BodyAwarenessBanner` — 身体觉察（最新打卡、感觉评估）
4. `WeightTrendBanner` — 体重趋势图

### R2 — 提取 useBodyDashboardData hook
- 聚合所有 useMemo 派生：activeGoal, activeTrainingPlan, expiredPlanIds, celebrationData, planProgress, recentExercises, latestCheckin, weightTrend, todayPlanDisplay
- 聚合 selectedDay 派生：selectedDayTask, selectedDayIsRest, selectedDayDate, selectedDayOverride
- **hook 内部用 `useShallowStore` 自行选择 store 数据 + 调 `useTodayPlan()`**（不接收 store 数据作参数——违反架构约束"hook 消费 store 必须用 useShallowStore"）
- 返回值通过解构消费

### R3 — 提取 useBodyOverrides hook
- 聚合 override 相关处理器：setOverride, clearOverride, handleUndoOverride, handleSwapConfirm, handleAdjustConfirm, handleDaySkip, handleDaySwapConfirm, handleSaveGoalLight
- **hook 内部用 `useShallowStore` 自行选择 store actions**（不接收作参数）

### R4 — 主组件保持编排层
- `BodyDashboard` 变为：hooks 调用 + 模态框渲染 + 4 个 Banner 编排
- 复杂度 ≤30

## 不触碰清单（危险区）

| 区域 | 理由 |
|------|------|
| `useBodyFlowState` / `useTodayPlan` | 已有 hook，复用不修改 |
| 9 个模态组件 | 已提取，复用不修改 |
| `CelebrationOverlay` | 已提取，复用不修改 |
| `BodyDashboardStyles` | 已提取，复用不修改 |

## Acceptance Criteria

- [ ] AC1：`BodyDashboard` ESLint `complexity` ≤ 15
- [ ] AC2：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC3：`pnpm run type-check` 0 错误
- [ ] AC4：`pnpm run test` 全量通过（≥1967）
- [ ] AC5：消费方（BodyScreen.tsx）零改动——`git diff` 验证
- [ ] AC6：无新增 `any` / `console.log` / raw 用户可见字符串

## Out of Scope

- `useBodyFlowState` / `useTodayPlan` 修改（已存在）
- `max-lines-per-function` 行数达标（可保留 disable 注释）
- Flow 状态机重构（高风险，需独立任务）
