# PRD: 调身页组合锻炼优化

## Goal

优化调身页「开始今日锻炼」流程，使 SportPage 支持执行多动作组合训练，用户无需反复进出 BodyFlow 即可完成当日所有训练动作。

## Background

### 当前流程

```
BodyDashboard → BodyFlow (step: practice)
  └─ 显示今日动作列表 → 跳转 SportPage (单 sportKey) → 执行 → 保存 → 返回 BodyFlow
  └─ 呼吸引导 (step: breathing) → 身体觉知打卡 (step: checkin) → 完成 (step: success)
```

### 当前限制

1. **SportPage 只接受单运动**：路由参数 `{ key: string }`，一次只支持一个 sportKey
2. **SportPage 保存单条记录**：`handleSave` 只添加一条 exerciseLog，返回一个 sportResult
3. **BodyFlow 无多运动迭代**：`onGoToSport` 只触发一次导航，无"做完一个→继续下一个"的循环
4. **BodyFlow 的 practice 步骤**：展示当日所有动作，但点击"开始训练"后只跳转一个运动

### 已有基础设施

- `BodyPlanTask.exercises?: ExerciseDef[]` — 计划中每天已支持多动作
- `DayOverride.custom` — 支持自定义动作列表
- `useTodayPlan.todayExercises` — 已解析今日所有动作
- `ExerciseDef` 包含完整动作定义（nameZh, category, defaultSets, defaultReps, defaultDurationSec 等）

## Requirements

### R1: SportPage 支持多运动组合执行
- 接受 `exercises: ExerciseDef[]` 路由参数（替代单 `key`）
- 按顺序执行列表中的每个动作，每个动作独立计时/计数/组数
- 支持中途跳过/暂停单个动作

### R2: 组合训练导航
- BodyFlow 传递当日所有动作到 SportPage，而非单 sportKey
- 组合训练完成后，一次性返回 BodyFlow，带聚合结果

### R3: 数据记录
- 每个动作完成时立即保存独立 `exerciseLog` 条目
- 全部完成后返回 BodyFlow 聚合结果（总时长/总热量/动作明细）

### R4: UI 支持
- 顶部固定进度条显示 "当前动作/总数" + 动作名称
- 点击进度条展开完整动作列表，已完成动作显示 ✅ 和时长，未开始动作可跳转
- 动作间过渡显示休息/过渡倒计时，用户可手动点击提前继续

## Acceptance Criteria

- [ ] AC1: 当日计划有多个动作时，BodyFlow 传递完整动作列表到 SportPage
- [ ] AC2: SportPage 支持按顺序执行多个动作，每个动作独立计时
- [ ] AC3: 组合训练完成后，每个动作生成独立 exerciseLog 条目
- [ ] AC4: 组合训练完成后，返回 BodyFlow 聚合结果（总时长/总热量）
- [ ] AC5: 组合训练中顶部进度条显示 "当前动作/总数"
- [ ] AC6: 点击进度条展开动作列表，可跳转到未开始的动作
- [ ] AC7: 动作间过渡显示自动倒计时，用户可提前点击继续
- [ ] AC8: GPS 动作按需启停定位追踪
- [ ] AC9: 向后兼容 — 单运动场景仍按原有流程工作

## Design Decisions

| # | 决策 | 选择 |
|---|------|------|
| DD1 | 实现方式 | 改造 SportPage 内部维护多动作列表 + 当前索引，不新建页面 |
| DD2 | 动作间过渡 | 混合模式：完成动作后显示休息倒计时（力量60s/传统15s/有氧30s），可手动跳过 |
| DD3 | 路由参数 | 扩展 `exercises?: ExerciseDef[]` + `comboPlanId?: string`，单运动向后兼容 |
| DD4 | 内部状态 | `comboState ref` 管理多动作切换，hooks 暴露 `reset()` 方法 |
| DD5 | 数据保存 | 逐条保存（每个动作完成时立即 `addExercise`），全部完成后一次性返回 |
| DD6 | 进度指示 | 顶部固定进度条，active 页自动折叠为精简模式 |
| DD7 | 动作列表 | 可展开查看完整列表，已完成 ✅ + 时长，未开始可跳转 |
| DD8 | GPS 混合 | 按需启停，动作切换时自动管理 GPS 生命周期 |

## Out of Scope

- 超级组（superset）模式：同一时间交替执行多个动作
- 自定义组合编辑器
- 组合训练模板保存