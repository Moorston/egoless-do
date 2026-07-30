# 调眠页昨晚睡眠卡片与快速记录合并

## Goal

将调眠首页（HomePage）中分离的"昨晚睡眠摘要卡片"和"快速记录"合并为一张内联编辑卡片，解决同一数据双入口、工作状态消失、保存无反馈等问题，提升晨间快速记录体验。

## Background

当前 HomePage 存在两块分离区域处理同一份 `todaySleep` 数据：

- **SleepSummaryCard**（136-186 行）：只读展示时长/质量★/入睡起床/仪轨/感恩，能打开完整日记但不能改质量
- **QuickDiary**（247-279 行）：可编辑质量★ + 工作状态，但不预填已有数据，保存后无状态切换

### 已知问题

1. 质量★ 在摘要能看不能改，在快速记录能改不能回显 — 同一数据两个入口
2. 工作状态录入后不在摘要展示 — 用户看不到自己填了什么
3. 两个"打开完整日记"按钮 — 功能重复
4. 快速记录不预填 — 每次打开星星都是空的，体验像"每次都是新记录"
5. 保存后无反馈 — QuickDiary 保存后卡片状态不变，无完成感

## Requirements

### 功能需求

- **R1**：合并为一张 `SleepSummaryCard` 卡片，支持只读态和编辑态切换
- **R2**：只读态展示：时长、质量★、入睡/起床时间、仪轨状态、感恩数量、工作状态（有值时）
- **R3**：编辑态支持：质量★ 选择（1-5）、工作状态单选（精神饱满/正常/疲惫/筋疲力尽）
- **R4**：编辑态从 `todaySleep` 预填已有数据（quality + workState）
- **R5**：空态（无数据时）整行可点，点击星星区域进入编辑态
- **R6**：显式"保存"按钮，`quality === 0` 时禁用（沿用当前逻辑）
- **R7**：保存成功后自动回到只读态
- **R8**："取消"按钮丢弃草稿并回到只读态
- **R9**：编辑态底部显示"完整日记 →"链接，打开 DiaryModal
- **R10**：保存失败时 toast 提示并保留编辑态（可重试）

### 非功能需求

- **N1**：卡片高度在只读态保持不变（工作状态有值时 +~24px）
- **N2**：编辑态不引入键盘弹起（时间编辑仍在完整日记）
- **N3**：组件拆分为独立文件 `SleepSummaryCard.tsx`，便于回滚
- **N4**：遵循项目现有模式：参考 `ExerciseCard` 的读→编辑态切换

### 不在本次范围

- 跨天/补录场景（`getTodaySleep` 逻辑不变，作为 follow-up）
- 卡片内编辑入睡/起床时间（仍在完整日记）
- 卡片内编辑感恩/笔记/身体状态/心理状态（仍在完整日记）
- 数据层改动（SleepEntry schema / store / sync 不变）

## Constraints

- 依赖 `SleepEngine` 已提供的 props：`todaySleep`、`onSaveQuickDiary`、`onSetShowDiary`
- 工作状态 i18n 键沿用：`sleepWorkEnergetic` / `sleepWorkNormal` / `sleepWorkTired` / `sleepWorkExhausted`
- 样式与现有卡片一致：圆角 20、边框 1px、内边距 20、背景色 `TH.card`
- 不引入新依赖（使用已有的 lucide-react-native Star 图标）

## Acceptance Criteria

- [ ] **AC1**：HomePage 原 SleepSummaryCard + QuickDiary 两个区域替换为单个 SleepSummaryCard
- [ ] **AC2**：有数据时只读态展示质量★和工作状态（若有），点击 ✎ 进入编辑态
- [ ] **AC3**：无数据时显示空态提示，点击整行进入编辑态
- [ ] **AC4**：编辑态星星和工作状态从 todaySleep 预填
- [ ] **AC5**：编辑态保存按钮在 quality=0 时禁用，quality>0 时可用
- [ ] **AC6**：点击保存 → store 更新 → 卡片自动切回只读态展示新数据
- [ ] **AC7**：点击取消 → 丢弃草稿 → 回到只读态（数据不变）
- [ ] **AC8**：编辑态底部"完整日记 →"打开 DiaryModal，关闭后若数据变化则只读态刷新
- [ ] **AC9**：保存失败（模拟 store 异常）时显示 toast/alert 并保留编辑态
- [ ] **AC10**：SleepSummaryCard 拆为独立文件，HomePage 引用它
- [ ] **AC11**：现有功能不回归：仪轨入口、完整日记、睡眠目标、趋势图、历史页入口
- [ ] **AC12**：`pnpm run test` 通过，`pnpm run type-check` 通过

## Notes

- 保存按钮禁用逻辑沿用当前 `quality === 0` 判断，不新增校验
- 工作状态在只读态的展示样式：主色小字标签，放在星星同行右侧或下一行
- 编辑态切换建议用条件渲染（非动画），保持简单；如要动画参考 `ExerciseCard` 的 `Animated.View`
