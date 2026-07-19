# Implement — 调身计划周计划任务模块 UX 重构

有序执行 checklist。每步完成后打 ✓。

## Step 1: 基础设施 — 类型与工具
- [ ] 1.1 在 `packages/core/src/types/body.ts` 添加 `DayOverview` 类型
- [ ] 1.2 在 `packages/core/src/features/body/` 添加 `getDayOverview()` 纯函数（计算每天 status/intensity/partIcon）
- [ ] 1.3 在 `packages/core/src/__tests__/` 为 `getDayOverview()` 加单元测试

## Step 2: 迷你周历组件 `MiniWeekCalendar.tsx`
- [ ] 2.1 新建 `apps/mobile/src/features/practice/body/components/MiniWeekCalendar.tsx`
- [ ] 2.2 实现横向 ScrollView + 7-14 天色块
- [ ] 2.3 色块颜色映射：rest=灰 / 空=浅边 / 有强度=primary 渐变
- [ ] 2.4 点击某天回调 `onDaySelect`
- [ ] 2.5 高亮当前 activeDay
- [ ] 2.6 样式：对标 Keep 周历（圆角、紧凑、高度 60-80px）

## Step 3: 天卡片组件 `DayPlanCard.tsx`
- [ ] 3.1 新建 `apps/mobile/src/features/practice/body/components/DayPlanCard.tsx`
- [ ] 3.2 折叠态：概要行（partIcon + 动作数 + 时长 + 展开箭头）
- [ ] 3.3 编辑态：展开显示 ExerciseList + ExercisePicker + CTA
- [ ] 3.4 折叠/展开动画（LayoutAnimation 250ms）
- [ ] 3.5 休息日状态（独立视觉，不可编辑）
- [ ] 3.6 训练日状态（可编辑）

## Step 4: 动作网格 `ExercisePickerGrid.tsx`
- [ ] 4.1 新建 `apps/mobile/src/features/practice/body/components/ExercisePickerGrid.tsx`
- [ ] 4.2 实现 filter tabs（全部/传统养生/现代训练）
- [ ] 4.3 实现 search bar（实时过滤）
- [ ] 4.4 实现 muscle group filter（新增）
- [ ] 4.5 动作卡片网格（FlatList numColumns=3）
- [ ] 4.6 点击 = toggle（加入/移除），立即视觉反馈
- [ ] 4.7 已添加动作显示 ✓ 高亮
- [ ] 4.8 已存在于当天的动作 dimmed + 可再点移除

## Step 5: 动作卡片 `ExerciseCard.tsx`
- [ ] 5.1 新建 `apps/mobile/src/features/practice/body/components/ExerciseCard.tsx`
- [ ] 5.2 显示：icon + 名称 + sets×reps + weight
- [ ] 5.3 内联编辑入口 [调整]
- [ ] 5.4 内联编辑态：显示数字输入框（sets/reps/weight）
- [ ] 5.5 blur/enter 保存
- [ ] 5.6 移除按钮 ✕ 或 swipe-left

## Step 6: Snackbar 撤销机制
- [ ] 6.1 新建 `apps/mobile/src/features/practice/body/components/SnackbarHost.tsx`
- [ ] 6.2 显示"已添加 X"/"已移除 X" + "撤回"按钮
- [ ] 6.3 5s 自动消失
- [ ] 6.4 撤回恢复前一个状态

## Step 7: 主 CTA 与训练流集成
- [ ] 7.1 底部主 CTA "开始训练"
- [ ] 7.2 点击 → 进入 BodyFlow（复用现有 flow）
- [ ] 7.3 每个天卡片也可"训练此天"次级入口

## Step 8: 重构 BodyPlanEditorScreen
- [ ] 8.1 替换现有周计划编辑区域为新组件组合
- [ ] 8.2 移除旧的两步式"选 + 添加"逻辑
- [ ] 8.3 保留数据持久化路径（store → SQLite → sync）
- [ ] 8.4 清理不再使用的 state/helpers

## Step 9: 验证
- [ ] 9.1 `pnpm --filter mobile type-check` → 0 error
- [ ] 9.2 `pnpm run lint` → 0 error, 0 warning
- [ ] 9.3 `pnpm run test` → 342 passed
- [ ] 9.4 手动走查：展开天 → 选动作 → 撤销 → 内联编辑 → 开始训练

## Step 10: Commit
- [ ] 10.1 commit message:
  ```
  refactor(body): weekly plan editor UX redesign benchmarking Strong/Keep/Strava

  - MiniWeekCalendar for week navigation
  - DayPlanCard with expand/collapse animation
  - ExercisePickerGrid with toggle-to-add + undo snackbar
  - ExerciseCard with inline set/reps/weight editing
  - Rest day dedicated visual state
  - Primary CTA "开始训练" integrating with existing BodyFlow
  ```

## Rollback Points
- 每步独立 commit；revert 任一步即可回退
- 旧代码保留在 git history 中

## Risky Files
- `apps/mobile/src/features/practice/body/screens/BodyPlanEditorScreen.tsx`
- `apps/mobile/src/features/practice/body/BodyFlow.tsx`（训练流集成）
- `packages/core/src/types/body.ts`（新增类型）
