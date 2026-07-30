# 调眠页昨晚睡眠卡片视觉与交互优化

## Goal

将 `SleepSummaryCard` 从"全卡编辑模式切换"重构为"字段级增量编辑"，修复空态假互动问题，提升视觉层级（质量作为主视觉），并补齐无障碍支持。

## Background

当前卡片有三段式状态机（Empty / Read / Edit），存在以下问题：

1. **空态假互动** — 空态渲染 5 颗空心星，但 `interactive=false` 全部 disabled，视觉上像能点却点不动，是典型的 affordance 错位。
2. **视觉权重失衡** — 48px 时长数字抢焦点，24px 质量星反而是附属。但质量才是睡眠核心指标。
3. **编辑模式过重** — `editing` 布尔导致整卡从 read → edit 重构，取消即丢草稿，没有轻量单字段修改路径。
4. **保存无反馈** — edit → read 跳变生硬，无 Toast / haptic。
5. **无障碍缺失** — 质量星、工作状态 chip 无 `accessibilityLabel`。

## Requirements

### R1：空态修复 — 去掉假星星

- 空态不再渲染 5 颗空心星（当前是 `renderStars(0, 28, false, enterEditMode)`，星星 disabled）。
- 空态改为清晰的文字引导 + 主 CTA（如"记录昨晚睡眠"按钮或带加号的卡片）。
- 整卡可点击进入编辑/快记流程。

### R2：质量星直接保存（Read 模式）

- Read 模式下，质量星从只读展示改为**可点击**。
- 点击第 i 颗星 → 立即保存 `quality=i`，无需进入编辑态，无需保存按钮。
- 保存协议：必须传完整对 `(quality, workState)`，即便 workState 未变也要传当前值（防止 `undefined` 覆盖已有值，见 `createSleepSlice.ts:57` 的浅合并逻辑）。
- 保存成功后触发反馈（R6）。

### R3：工作状态直接切换（Read 模式）

- Read 模式下，工作状态 chip 从文字标签改为**直接可点**。
- 点击 chip → 立即保存该 workState；再次点击已选中 chip → 取消选中（传 `null`）。
- 保存协议同 R2：必须传完整对 `(quality, workState)`。

### R4：视觉层级重排

- 质量星作为主视觉元素（放大、上移），时长降为辅助信息。
- 时长旁展示目标对比（目标 8h vs 实睡 7h → 差 48m），数据来源 `sleepGoal.targetHours`。
- 时间行（入睡 → 起床）保留，但建议改用图标体系（与 DetailModal 的 Moon/Sun 一致，替代 emoji）。
- 仪轨 badge 去掉冗余 emoji（`✅ 仪轨` → `仪轨`）。

### R5：Edit 模式收缩

- 移除当前的"全卡编辑模式"（`editing` 布尔态）。
- ✎ 编辑按钮语义收缩为"打开完整 diary"入口（调用 `onOpenFullDiary`）。
- 时长、入睡/起床时间的编辑由 DiaryModal 承载，不在卡片内编辑。

### R6：保存反馈

- 每次成功保存（质量星、工作状态）触发：
  - `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
  - `Toast.show('已保存', 'success')`（调用 `useUiStore.getState().showToast`）
- 反馈要明确到用户知道"已生效"。

### R7：无障碍（a11y）补齐

- 质量星（每颗）：`accessibilityLabel="设为 N 星"` / `accessibilityRole="button"` / `accessibilityState={{ selected: i <= quality }}`
- 工作状态 chip：`accessibilityLabel="工作状态: {label}"` / `role="button"` / `accessibilityState={{ selected }}`
- 保存按钮（如有）：`accessibilityLabel="保存睡眠质量"` / `accessibilityState={{ disabled }}`
- 完整日记链接：`accessibilityLabel="打开完整睡眠日记"` / `role="link"`
- 直接保存的交互加 `accessibilityHint="点击星星直接保存"`。

### R8：标题语义修正

- 卡片标题从"昨晚睡眠"改为中性表述（"睡眠记录 · {date}" 或"睡眠打卡 · {date}"），避免"昨晚"与 `todaySleep`（实际是当日记录）的语义错位。
- `date` 取自 `todaySleep.date`（格式 `7月30日` 或 `07-30`）。

## Constraints

- **不新增数据字段** — 只用 `SleepEntry` 已有字段（`quality`, `workState`, `durationMin`, `bedtimeAt`, `wakeAt`, `barrierDone`, `gratitude`）。
- **不改动 store 层** — `saveSleepDiary` 的合并逻辑已满足需求，不修改 `createSleepSlice.ts`。
- **不改动 SleepEngine 页面路由** — 只动 `SleepSummaryCard` + `HomePage` 中与卡片相关的传参。
- **遵循项目 inline editing 范式** — 参考调身页 ExerciseCard 的 inline editing 模式。
- **a11y 是必须项** — 不是锦上添花，是验收前提。

## Out of Scope

- 睡眠阶段数据（深睡/REM/体动）— 需要硬件支持，不在本任务范围。
- 睡眠建议算法（"偏短/正常/过长"标签）— 属于智能提示维度，本次不做。
- 趋势图、热力图、统计卡片 — 本次只动 `SleepSummaryCard`。
- DiaryModal 内部重构 — 不在本次范围。

## Acceptance Criteria

- [ ] **AC1**：空态不渲染 5 颗空心星；有明确 CTA 引导用户开始记录。
- [ ] **AC2**：Read 模式下点击质量星第 i 颗 → 立即保存 `quality=i`，不进入编辑态，不显示保存按钮。
- [ ] **AC3**：Read 模式下点击工作状态 chip → 立即保存该 workState；再次点击已选中 chip → 取消（传 null）。
- [ ] **AC4**：保存质量星时不会清空 workState（验证完整对调用）；保存工作状态时不会清空 quality。
- [ ] **AC5**：每次成功保存触发 haptic + Toast 反馈。
- [ ] **AC6**：质量星在视觉上为主元素（尺寸/位置高于时长数字）。
- [ ] **AC7**：时长旁展示目标对比（"目标 8h · 差 48m" 或 "达成"）。
- [ ] **AC8**：✎ 按钮点击 → 打开 DiaryModal，不再切换卡片为编辑态。
- [ ] **AC9**：所有交互元素（质量星、chip、链接）有 `accessibilityLabel` + `role` + `state`。
- [ ] **AC10**：卡片标题显示日期（如"睡眠记录 · 7月30日"），不再写死"昨晚睡眠"。
- [ ] **AC11**：现有测试（如有）通过；不破坏 `SleepHistoryPage` / `SleepEngine` 中使用 `SleepEntry` 的其他路径。
