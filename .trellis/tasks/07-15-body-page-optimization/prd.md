# 调身页全面优化 — PRD

## Goal

全面提升调身页（Body/Sport）的 UI 视觉效果、交互流程体验和训练计划功能，修复已知 Bug，使调身页成为应用中最具吸引力和实用性的模块之一。

## Background / Confirmed Facts

### 当前代码结构
- 主入口：`BodyScreen.tsx`（dashboard / flow 双模式）
- Dashboard 组件：BodyTodayPlanCard, BodyProfileCard, BodyTrainingPlanSection, BodyAwarenessCard, GoalCard, BodyWeekPlanCard, WeightTrendChart, 5 个 Modal
- Flow 组件：BodyFlow（4 步：practice → breathing → checkin → success），含 BodyCheckinInline, CheckinSuccessCard
- 运动记录：SportPage（5 状态 + 4 布局），集成 GPS/音乐/呼吸/实时洞察
- 计划编辑器：BodyPlanEditorScreen（完整但未接入预设模板）
- 数据层：createBodySlice（Zustand + SQLite 持久化）

### 已知 Bug
1. **🔴 `BodyDashboard.tsx:67`** — `updateBodyTrainingPlan` 在 useEffect 中使用但未从 store 解构，自动过期标记会报错
2. **🟡 `GoalCard.tsx:18`** — `progress` 硬编码为 0，带 TODO 注释
3. **🟡 `BodyWeekPlanCard` 和 `WeeklyExecCard` 功能重叠** — 两个卡片都展示周计划执行情况
4. **🟡 `BodyFlow.tsx`** — `todayPlan` 和 `trainingPlanTask` 两条逻辑线交织复杂，可读性差
5. **🟢 `BodyScreen.tsx`** — dashboard ↔ flow 切换无动画过渡
6. **🟢 Dashboard 中使用 Modal 而非独立页面** — 5 个 Modal 堆叠在 ScrollView 中

### 已存在但未使用的能力
- `PLAN_TEMPLATES`（4 个预设模板）在 `constants.ts` 中已定义，UI 中未暴露
- `PlanTemplate` 类型已定义，涵盖传统养生/PPL 推拉腿/减脂/自重训练
- 50+ 个 `ExerciseDef` 动作库已定义

## Requirements

### R1: UI 翻新 — Dashboard 重新布局
- **R1.1** 采用可折叠 Section 分组布局，减少垂直滚动深度
  - Section 1: 今日训练（TodayPlan + 快速开始）
  - Section 2: 身体档案（ProfileCard + GoalCard 合并）
  - Section 3: 训练计划（TrainingPlan + WeekPlan + 预设模板入口）
  - Section 4: 数据趋势（AwarenessCard + WeightTrendChart）
- **R1.2** 采用现代活力风视觉设计：丰富渐变色、大数字展示、动效反馈
- **R1.3** BodyTodayPlanCard 作为主视觉焦点，增加动效
- **R1.4** 每个 Section 可折叠/展开，默认展开高频部分
- **R1.5** 添加 dashboard ↔ flow 切换动画
- **R1.6** 修复 GoalCard 的 progress 计算

### R2: BodyFlow 流程体验优化
- **R2.1** 重构 BodyFlow 状态机，分离 todayPlan 和 trainingPlanTask 逻辑
- **R2.2** 通过导航参数传回结果替代 returnTick 机制
  - SportPage 完成后传回 { completed: true, durationSec, ... }
  - BreathingScreen 完成后传回 { completed: true, durationMs }
- **R2.3** 添加步骤间过渡动画（淡入/滑动）
- **R2.4** 支持流程中途退出后恢复进度：将 flow 步骤状态持久化到 store
- **R2.5** 在 flow 完成页增加更多数据回顾

### R3: 训练计划功能增强
- **R3.1** 创建计划时支持从预设模板（PlanTemplate）选择，编辑器内嵌「从模板导入」功能
  - 弹窗展示 4 个模板（传统养生/PPL/减脂/自重）的基本信息和强度标签
  - 选中后自动填充到编辑器的所有字段
  - 用户可以在此基础上微调
- **R3.2** 修复 updateBodyTrainingPlan 未解构 Bug
- **R3.3** 计划完成后添加全屏庆祝动画 + 统计摘要（总天数/总卡路里/体重变化）
- **R3.4** 周进度可视化增强（完成度动画、趋势箭头）
- **R3.5** 合并 BodyWeekPlanCard 和 WeeklyExecCard

### R4: SportPage 体验优化
- **R4.1** 优化运动类型选择：PrepPage 精简选择流程，优先展示频率最高的运动
- **R4.2** 优化运动中实时数据展示（距离/时长/卡路里/组次），大数字优先
- **R4.3** 运动报告页增强：展示本次运动关键数据卡片 + 最近 7 天同类运动历史对比 + 卡路里占比
- **R4.4** 优化暂停/结束交互逻辑，增加防误触保护

## Decisions Made (from brainstorm)

### Dashboard 布局
- 可折叠 Section 分组：今日训练 → 身体档案 → 训练计划 → 数据趋势
- ProfileCard + GoalCard 合并为一个「身体档案」Section
- TrainingPlan + WeekPlan 合并为一个「训练计划」Section

### 视觉风格
- 现代活力风：丰富渐变色、大数字展示、动效反馈

### BodyFlow 流程
- 通过导航参数传回结果替代 returnTick 机制
- 步骤间添加淡入/滑动过渡动画
- 支持中途退出后恢复进度（持久化 flow 步骤状态）

### 训练计划
- 预设模板通过编辑器内嵌「从模板导入」功能接入
- 计划完成时触发全屏庆祝动画 + 统计摘要

### SportPage
- 运动报告页采用全面数据面板（本次数据 + 7天历史对比 + 卡路里占比）
- 优化暂停/结束防误触