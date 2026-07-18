# 调身计划页添加调身目标卡片（默认展开）

## Goal
在调身计划页（PlanManagementScreen）添加调身目标卡片，自动展示调身页（BodyDashboard）已设置的调身目标内容，且默认展开。

## Background
- BodyDashboard 已有调身目标卡片（GoalCard.tsx），但 PlanManagementScreen 没有
- CollapsibleSection 组件已存在，支持 `defaultExpanded` 属性
- GoalEditLightModal 已支持从计划页编辑目标

## Confirmed Facts
- **R1**: `PlanManagementScreen.tsx` 当前不展示任何调身目标数据
- **R2**: `GoalCard.tsx` 已存在，接受 `goal`, `profile`, `onEdit`, `TH`, `T` props
- **R3**: `CollapsibleSection` 组件已存在，`defaultExpanded` 默认 `true`
- **R4**: 数据源：`useShallowStore` 的 `bodyGoals` 和 `userProfile`
- **R5**: 编辑目标弹窗：`GoalEditLightModal` 已存在，可复用

## Requirements
- **R1**: 在 `PlanManagementScreen.tsx` 中引入 `GoalCard` 组件，展示 `bodyGoals` 中的活跃目标
- **R2**: 目标卡片包裹在 `CollapsibleSection` 中，默认展开
- **R3**: 点击编辑按钮打开 `GoalEditLightModal` 编辑目标
- **R4**: 不破坏现有测试与 lint

## Acceptance Criteria
- [ ] A1: PlanManagementScreen 顶部显示调身目标卡片（有目标时显示目标内容，无目标时显示空状态）
- [ ] A2: 目标卡片默认展开（可折叠收起）
- [ ] A3: 点击编辑按钮可打开编辑弹窗
- [ ] A4: `pnpm run lint` 无新增 error
- [ ] A5: `pnpm run test` 全通过

## Out of Scope
- BodyDashboard 的布局调整
- 目标数据的同步逻辑（已有统一 store 层）