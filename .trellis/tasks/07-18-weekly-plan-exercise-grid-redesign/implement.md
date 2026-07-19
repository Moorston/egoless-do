# Implement — 周计划运动选择 UX 优化：一体化网格布局

有序执行 checklist。每步完成后打 ✓。

## Step 1: 新建 UnifiedExercisePool 组件
- [ ] 1.1 新建 `apps/mobile/src/features/practice/body/components/UnifiedExercisePool.tsx`
- [ ] 1.2 从 ExercisePickerGrid 拷贝现有网格逻辑（filter tabs + search + muscle group chips + FlatList grid）
- [ ] 1.3 新增天勾选列表：网格下方显示 7 天紧凑复选框行
- [ ] 1.4 天标签视觉对齐 MiniWeekCalendar（星期缩写 + 色块状态）
- [ ] 1.5 点击动作卡片 → 显示天勾选列表（预勾选 activeDay）
- [ ] 1.6 已存在于某天的动作：checkbox dimmed + 卡片上显示"周一"等 badge
- [ ] 1.7 勾选完 500ms debounce 后自动保存

## Step 2: 简化 DayPlanCard
- [ ] 2.1 移除 `exerciseLibrary`、`addedExIds`、`selectedIds`、`onToggle` props
- [ ] 2.2 移除 expanded 状态中的 ExercisePickerGrid 渲染
- [ ] 2.3 只保留 ExerciseList（inline edit/remove）+ CTA 按钮
- [ ] 2.4 更新 props 类型定义

## Step 3: 重构 BodyPlanEditorScreen
- [ ] 3.1 在 Screen 顶部添加 UnifiedExercisePool（替代 ExercisePickerGrid）
- [ ] 3.2 添加 dayChooser 本地状态（selectedEx, selectedDays）
- [ ] 3.3 实现 `handleAddToDays(ex, days)` 批量写入逻辑
- [ ] 3.4 跳过已存在动作 + snackbar 提示
- [ ] 3.5 移除旧的 per-day exercisePicker 相关 state/helpers
- [ ] 3.6 调整布局：统一池（~1/3 屏）→ 下方滚动天卡片

## Step 4: 验证
- [ ] 4.1 `pnpm --filter mobile type-check` → 0 error
- [ ] 4.2 `pnpm run lint` → 0 error, 0 warning
- [ ] 4.3 `pnpm run test` → all passing
- [ ] 4.4 手动走查：统一池筛选 → 点击动作 → 勾选多天 → 自动保存 → 天卡片显示动作

## Step 5: Commit
- [ ] 5.1 commit message:
  ```
  refactor(body): unified exercise pool with multi-day batch assignment

  - UnifiedExercisePool: screen-level exercise grid replacing per-day pickers
  - Day checkboxes: compact 7-day row for batch assignment to multiple days
  - DayPlanCard simplified: removed per-day grid, kept ExerciseList + edit/remove
  - Conflict handling: skip existing-day exercises + snackbar feedback
  - Existing-day badge visible on exercise cards
  ```

## Rollback Points
- 每步独立 commit；revert 任一步即可回退
- DayPlanCard 旧 props 保留在 git history 中

## Risky Files
- `apps/mobile/src/features/practice/body/screens/BodyPlanEditorScreen.tsx`
- `apps/mobile/src/features/practice/body/components/DayPlanCard.tsx`
- `apps/mobile/src/features/practice/body/components/ExercisePickerGrid.tsx`（可能删除或保留为 UnifiedExercisePool 的基础）