# 调身页组合训练分析与优化

## Goal
全面分析调身页组合训练（Combo Workout）功能的现有实现，识别流程断裂、体验问题和功能缺口，并制定优化方案。

## 当前实现分析（已通过代码探索确认）

### 数据流

```
BodyDashboard 检测 todayExercises.length > 1
  → navigate('Sport', { exercises, comboPlanId })
  → SportPage 组合模式（isComboMode = true）
    → 逐动作执行（Prep → Countdown → Active → Report → Transition → 下一个）
    → 每个动作独立保存到 exerciseLog
    → 全部完成后 handleSaveAll() 聚合结果到 flowState
    → navigate('MainTabs', { screen: 'Body' })
  → BodyScreen/BodyDashboard 从 flowState 恢复进度
```

### 关键组件

| 组件 | 位置 | 职责 |
|------|------|------|
| BodyDashboard | `BodyDashboard.tsx:352-370` | 检测组合模式入口，传递 exercises 数组 |
| BodyFlow | `BodyFlow.tsx:103-213` | BodyFlow 内组合模式路由（onGoToSport 传入 exercises） |
| BodyScreen | `BodyScreen.tsx:71-80` | 中转层，处理 navigate 到 SportPage |
| SportPage | `SportPage.tsx:56-777` | 组合模式核心：逐动作执行、验证、保存、过渡 |
| ComboProgressHeader | `ComboProgressHeader.tsx` | 底部进度条，显示各动作完成状态 |
| TransitionScreen | `TransitionScreen.tsx` | 动作间过渡页，休息倒计时+下一动作预览 |
| useBodyFlowState | `hooks/useBodyFlowState.ts` | 持久化 flowState 恢复进度 |

### 已确认的问题

1. **i18n 欠缺**：ComboProgressHeader 的 Alert 文案为硬编码英文（`Jump to #N?` / `Current progress will be lost.`）
2. **TransitionScreen 硬编码**：组数/次数/时长的描述文案为中文硬编码（`N组 × N次` / `N分钟`）
3. **返回路径断裂**：`handleSaveAll` 导航到 `MainTabs/Body` 而非 `Body` 根页面，可能导致白屏
4. **无组合训练汇总记录**：单个动作保存到 `exerciseLog`，但无一条聚合记录（如 `comboExercises` 汇总条目）
5. **ComboProgressHeader 仅显示在 prep/transition 页**：active 运动时底部不显示进度，用户无法快速查看剩余动作
6. **handleSaveAll 缺少异常处理**：`navigate` 包裹在 try-catch 外，导航失败会导致状态未清理
7. **flowState 持久化不完整**：`comboExercises` 保存的是 `ExerciseResult[]` 而非完整 `ExerciseDef[]`，页面刷新后无法恢复

## Requirements

### R1: 入口检测与路由优化
- 修复组合模式返回路径（BodyDashboard 导航到 `Body` 而非 `MainTabs/Body`）
- 确保 BodyFlow 组合模式也能正确传递 exercises 到 SportPage
- 组合训练完成后，`flowState.exerciseCompleted` 正确更新，WorkoutFlowBanner 显示运动完成状态，用户可继续调息→觉知流程

### R2: 组合训练执行体验
- 修复 ComboProgressHeader 的 i18n 国际化
- 修复 TransitionScreen 的硬编码中文文案 + 添加 safe area 边距
- 在 active 运动页面也显示进度条（可选，透传 prop）

### R3: 汇总报告页
- 所有动作完成后（最后一个 TransitionScreen 的"完成"按钮后），展示组合训练汇总报告页
- 报告内容包括：总时长、总卡路里、各动作完成列表（动作名、icon、时长、卡路里）
- 报告页底部有"返回"按钮，回到 Body 页面
- 汇总报告页使用 safe area 边距

### R4: 数据聚合
- 组合训练完成后保存一条聚合的 `combo_workout` 类型 exerciseLog 条目
- 包含所有子动作的摘要

### R5: 异常处理
- 修复 `handleSaveAll` 和 `handleSave` 的导航异常处理
- 完善 flowState 清理逻辑

## Acceptance Criteria
- [ ] A1: 组合模式入口检测正确，`todayExercises > 1` 时进入组合模式
- [ ] A2: 组合训练完成后正确返回 Body 页面，无白屏/导航异常
- [ ] A3: ComboProgressHeader 所有文案走 i18n
- [ ] A4: TransitionScreen 所有文案走 i18n，含 safe area 边距
- [ ] A5: 所有动作完成后展示汇总报告页（总时长、总卡路里、各动作完成列表）
- [ ] A6: 汇总报告页使用 safe area 边距
- [ ] A7: 组合训练完成后保存一条聚合记录到 exerciseLog
- [ ] A8: 导航异常时 rollback 清理状态，不造成残留
- [ ] A9: flowState 组合数据完整，页面刷新后可恢复
- [ ] A10: WorkoutFlowBanner 正确显示运动完成状态（exerciseCompleted = true），可继续调息→觉知

## Out of Scope
- 组合训练的动作排序/编辑功能（UI 层面）
- 自定义组合训练模板
- 组合训练的历史记录聚合展示
- 组合训练与 BodyFlow 调息/觉知环节的集成
- BodyDashboard 上组合训练专门展示卡片

## Open Questions
（无 — 已全部确认）