# PRD — 调身计划周计划任务模块 UX 重构对标

## Goal
将新建调身计划页的周计划编辑模块重构为对标 Strong / JEFIT / Keep / Strava 优秀健身 APP 的现代交互体验，提升周计划编辑效率与用户满意度。

## Background
当前 BodyPlanEditorScreen 已实现：
- 垂直列表：周一纵向展开的天卡片
- 网格动作库：filter + search + multi-select + 确认添加

存在体验短板：
- 交互步数多（选 + 确认两步）
- 缺少周全局视图
- 组数次数需弹窗编辑，效率低
- 不可拖拽排序
- 视觉与交互未对标当代健身 APP

## Confirmed Facts
- **技术栈**: React Native + Expo, TypeScript, @egoless-do/core 共享包
- **数据模型**: `BodyTrainingPlan.tasks: BodyPlanTask[]`, `BodyPlanTask.exercises: ExerciseDef[]`
- **当前优势**: filter tabs + search grid + multi-select + checkboxes（可复用骨架）
- **约束**: core 包不能 import react-native，UI 改动集中在 mobile 功能模块

## Requirements

### R1: 顶部迷你周历导航
- 横向滚动的 7-14 天迷你日历
- 每天显示小色块（训练强度/完成度）+ 星期数字
- 点击某天 → 滚动到对应天卡片并展开
- 视觉对标 Keep 周历 / Strava activity heatmap

### R2: 天卡片主体重构（vertical list）
- 折叠态：显示概要（肌群图标 + 动作数量 + 时长）
- 编辑态：展开显示当天动作 + 动作库 + 操作按钮
- 折叠/展开动画（ease-in-out, 250ms）
- 第一屏至少可见 3-4 天卡片（纵向滚动）
- 视觉对标 Strong 的 day card

### R3: 动作库交互升级为 toggle + 撤销
- 动作网格中点击 = toggle（加入/移除），0 确认步骤
- 立即视觉反馈：green checkmark + 卡片高亮
- snackbar 提供"撤回"操作（5s 可见）
- 对标 Strong/Fitbod tap-to-add 体验
- 保留 filter tabs/category chips/search 作为辅助筛选

### R4: 组数次数内联编辑
- 每个已添加动作卡片内自带调整入口
- click → 显示 inline 输入框（sets × reps × weight）
- blur/enter 保存，无需 modal
- 对标 Strong 的 inline set editor

### R5: 当天动作快速管理
- 移除：卡片右上 ✕ 或 swipe-left 删除
- 对标 JEFIT 的 day exercise list 管理体验
- 跨天复制 / 拖拽排序作为 polish 项（不在本任务交付）

### R6: 训练行动主按钮
- 底部主 CTA："开始训练"
- 点击 → 进入训练执行流（复用 BodyFlow）
- 对标 Strong / Keep 的主行动按钮

### R7: 休息日独立状态
- 专门的休息日视觉卡片（不可编辑动作）
- 与训练天区分明显
- 对标 Strong 的 rest day 设计

## Acceptance Criteria
- [ ] A1: 顶部迷你周历显示 7-14 天色块，点击某天滚动到对应天卡片
- [ ] A2: 天卡片折叠/展开带动画，第一屏可见 ≥3 天卡片概要
- [ ] A3: 点击动作 = toggle 加入/移除，0 确认步骤
- [ ] A4: snackbar 显示"已添加/已移除"并提供"撤回"，5s 可见
- [ ] A5: 点击动作 [调整] 内联编辑 sets/reps/weight，blur 保存
- [ ] A6: 当天动作列表可 swipe-left 或点 ✕ 移除
- [ ] A7: "开始训练" CTA 进入训练流，复用现有 BodyFlow
- [ ] A8: 休息日视觉状态独立，不可添加动作
- [ ] A9: 兼容 light/dark 主题
- [ ] A10: 342 tests 全通过
- [ ] A11: lint 0 error, 0 warning（on changed files）

## Out of Scope
- 跨 APP 训练数据同步
- AI 自动推荐训练计划
- 视频/动图指导
- Apple Health / Google Fit 集成深化
- 跨天拖拽 / 此次不实现

## Technical Notes
- 使用 `KeyboardAvoidingView` 处理键盘安全编辑
- 复用现有 `buildExerciseLibrary()` 获取动作库
- filter 从 category 切换到 muscle group（更细粒度，对标 Keep）
- 周历组件拆分为独立 `MiniWeekCalendar.tsx`
- 天卡片拆分为独立 `DayPlanCard.tsx`
- 动作网格拆分为独立 `ExercisePickerGrid.tsx`
