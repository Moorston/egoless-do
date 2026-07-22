# 修复调身页今日方案和动作显示

## Goal

修复三个问题：
1. BodyDashboard 今日方案 banner 显示不正确的动作
2. BodyFlow 开始运动页显示不正确的动作
3. ComboProgressHeader 缺少组数/次数/时长信息

## Issues

### I1: BodyDashboard 今日方案 banner 动作显示不正确
- 今日方案 banner 使用 `useTodayPlan().todayExercises` 显示动作列表
- 如果用户没有 `BodyTrainingPlan`（只有旧版 `BodyPlan`），`todayExercises` 为 undefined
- 需要确保 banner 正确显示当日动作

### I2: BodyFlow 开始运动页动作显示不正确
- BodyFlow 使用 `trainingPlanTask?.task.exercises` 显示动作列表
- 如果 `trainingPlanTask` 传入的 `exercises` 数组为空，则不显示任何动作
- 需要确保 BodyFlow 正确显示当日所有动作

### I3: ComboProgressHeader 缺少组数/次数/时长信息
- 当前 chips 只显示 icon + 名称
- 需要添加 `defaultSets × defaultReps` 或 `defaultDurationSec` 显示

## Acceptance Criteria

- [ ] AC1: BodyDashboard 今日方案 banner 正确显示当日所有动作
- [ ] AC2: BodyFlow 开始运动页正确显示当日所有动作
- [ ] AC3: ComboProgressHeader 每个动作 chip 显示组数/次数或时长