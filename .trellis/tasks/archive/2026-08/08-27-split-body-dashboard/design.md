# 拆分 BodyDashboard — 技术设计

## 1. 当前结构

```
BodyDashboard (CC 85, 1146 行)
├── imports: useBodyFlowState, useTodayPlan(已有) + 9 模态 + CelebrationOverlay + Styles(已有)
├── 9 个 useState (模态框开关)
├── 12 个 useMemo (派生数据)          ← 提取到 useBodyDashboardData
├── 10 个 useCallback (处理器)        ← override 相关提取到 useBodyOverrides
├── 4 个 useEffect
└── JSX return:
    ├── Banner 1: 今日方案 + Flow 进度  ← 提取为 TodayPlanBanner
    ├── Banner 2: 身体档案              ← 提取为 BodyProfileBanner
    ├── Banner 3: 身体觉察              ← 提取为 BodyAwarenessBanner
    └── Banner 4: 体重趋势              ← 提取为 WeightTrendBanner
```

## 2. 目标结构

```
BodyDashboard (编排层, CC ≤15)
├── useBodyDashboardData()     → 12 个派生值
├── useBodyOverrides()         → 8 个 override 处理器
├── useBodyFlowState()(已有) + useTodayPlan()(已有)
├── 模态框渲染 (已有，不动)
├── <TodayPlanBanner {...} />
├── <BodyProfileBanner {...} />
├── <BodyAwarenessBanner {...} />
└── <WeightTrendBanner {...} />
```

## 3. 提取边界

### useBodyDashboardData

```
内部自行调用:
  useShallowStore(s => ({ bodyGoals, bodyCheckins, exerciseLog, checkinHistory, bodyTrainingPlans, ... }))
  useTodayPlan()

返回值:
{
  activeGoal, activeTrainingPlan, expiredPlanIds,
  celebrationData, planProgress, recentExercises,
  latestCheckin, weightTrend, todayPlanDisplay,
  selectedDayTask, selectedDayIsRest, selectedDayDate, selectedDayOverride
}

注意: hook 内部用 useShallowStore 选择 store 数据，不接收作参数
      （遵守架构约束：hook 消费 store 必须用 useShallowStore）
复杂度预期: ≤10 (纯派生，无条件分支)
```

### useBodyOverrides

```
内部自行调用:
  useShallowStore(s => ({ updateBodyTrainingPlan, ... }))
  useTodayPlan() 的 todayDateStr + activeTrainingPlan（从 useBodyDashboardData 取或自选）

返回值:
{
  setOverride, clearOverride, handleUndoOverride,
  handleSwapConfirm, handleAdjustConfirm,
  handleDaySkip, handleDaySwapConfirm, handleSaveGoalLight
}

注意: hook 内部用 useShallowStore 选择 store actions，不接收作参数
复杂度预期: ≤15
```

### 4 个 Banner 子组件

放在 `features/practice/body/banners/` 目录（与 hooks/ modals/ screens/ 并列）

| 子组件 | Props | 复杂度预期 |
|--------|-------|-----------|
| TodayPlanBanner | todayPlanDisplay, planProgress, override 状态, flowState, allFlowDone, hasActiveFlow, onFlowStart, onFlowStartWithPlan | ≤15（子组件内分支不计入主函数） |
| BodyProfileBanner | profile, activeGoal, onShowAssessment | ≤10 |
| BodyAwarenessBanner | latestCheckin, onShowCheckin | ≤10 |
| WeightTrendBanner | weightTrend, checkinHistory, onShowWeightRecord, onShowWeightTrend | ≤10 |

> 关键：子组件内部分支不计入主函数 complexity。Banner 1 的 override 状态条 + Flow progress 三层嵌套三元（L366-513）移入 TodayPlanBanner 后，主函数砍掉 ~20 分支。

## 4. 消费方契约

`BodyDashboard` 的 props 接口 `DashboardProps` 不变。唯一消费方 `BodyScreen.tsx` 零改动。

## 5. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 派生数据依赖链断裂 | 低 | TypeScript 编译时捕获，useMemo 依赖数组保持 |
| Banner props 过多 | 低 | 按需传值，不传整个 store |
| 模态框开关状态丢失 | 低 | useState 留在主组件，通过回调传入 Banner |
