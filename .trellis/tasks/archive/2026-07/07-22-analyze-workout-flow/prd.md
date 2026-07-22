# PRD: 开始今日训练流程重构

## Goal

将「开始今日训练」从 BodyFlow 向导模式重构为 BodyDashboard Banner 驱动的分步执行流程，提升用户体验灵活性和可跳过性。

## Background

### 当前架构

```
BodyScreen (state machine: dashboard ↔ flow)
  ├── BodyDashboard (banner with start button)
  └── BodyFlow (4-step wizard: practice → breathing → checkin → success)
        ├── practice → navigate to SportPage → return
        ├── breathing → navigate to Breathing → return
        ├── checkin → inline checkin
        └── success → summary
```

### 核心问题

1. **组合模式入口不明确** — 用户不知道即将进入多运动串联
2. **流程过于线性** — 必须按顺序完成，无法跳过单个步骤
3. **返回机制脆弱** — 依赖 returnTick 计数器

## Design Decisions

| # | 决策 | 选择 |
|---|------|------|
| DD1 | 组合模式入口 | Banner 显示「组合训练 · N 个动作」标签 |
| DD2 | 流程架构 | 取消 BodyFlow 向导，改为 Banner 分步驱动 |
| DD3 | 调息步骤 | 跳转独立 Breathing 页面，完成后返回 Body |
| DD4 | 觉知步骤 | 内嵌 Banner 区域，不跳转 |
| DD5 | 跳过策略 | 允许跳过任意步骤，跳过后可重新执行 |
| DD6 | 组合内跳动作 | 只允许跳过后备动作，当前动作不能跳过 |
| DD7 | 数据持久化 | 使用 flowState 持久化，支持 24h 恢复 |
| DD8 | 步骤过渡 | 保持 fade 动画（350ms）|
| DD9 | 运动进入 | 直接跳转 SportPage，无需确认 |
| DD10 | 完成状态 | 显示「✅ 今日完成」+ 查看总结按钮 |
| DD11 | 返回机制 | Breathing → navigate(MainTabs/Body) → Banner 读取 flowState |

## Requirements

### R1: BodyDashboard Banner 分步引导
- 显示进度：[运动 ✅] [调息 ⏭️] [觉知 ○]
- 每步有「开始」/「重新执行」按钮
- 已跳过的步骤显示「已跳过」标签，可点击重新进入
- 组合模式时显示「组合训练 · N 个动作」标签

### R2: 运动步骤
- 点击「开始运动」→ 直接跳转 SportPage（combo 模式）
- 完成所有动作 → 保存记录 → 返回 Body
- Banner 更新：运动 ✅

### R3: 调息步骤
- Banner 显示「下一步：调息」+ 「开始」按钮
- 点击 → 跳转 Breathing 页面
- 完成 → 返回 Body → Banner 更新：调息 ✅
- 支持跳过：点击「跳过」→ 调息标记为 ⏭️

### R4: 觉知步骤
- Banner 显示「下一步：觉知」+ 「开始」按钮
- 点击 → 在 Banner 区域显示 Checkin 卡片（不跳转）
- 完成 → Banner 更新：觉知 ✅
- 支持跳过

### R5: 已跳过步骤可重新执行
- 点击已跳过的步骤 → 重新进入该步骤
- 完成后状态从 ⏭️ 变为 ✅

### R6: 完成总结
- 全部完成后显示「✅ 今日完成」
- 查看总结按钮显示各步状态 + 总时长
- 第二天自动恢复初始状态

### R7: 组合训练中跳过后备动作
- TransitionScreen 中增加「跳过下一动作」按钮
- 当前正在做的动作不能跳过
- 跳过后自动进入下一个动作的过渡页

### R8: 数据持久化
- 使用 flowState 持久化各步状态
- 支持跨会话恢复进度

## Acceptance Criteria

- [ ] AC1: 组合模式时 Banner 显示「组合训练 · N 个动作」标签
- [ ] AC2: 运动完成后 Banner 更新为「运动 ✅」
- [ ] AC3: 调息支持跳过，跳过后可重新执行
- [ ] AC4: 觉知内嵌在 Banner 中，不跳转独立页面
- [ ] AC5: 全部完成后显示「✅ 今日完成」+ 查看总结按钮
- [ ] AC6: 已跳过的步骤可点击重新进入
- [ ] AC7: 组合训练中支持跳过后备动作
- [ ] AC8: 各步状态持久化到 flowState，支持跨会话恢复

## Out of Scope

- 超级组（superset）模式
- 自定义组合编辑器
- 组合训练模板保存
- 休息倒计时自定义
- 预估总时长显示