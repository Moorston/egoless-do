# PRD — 周计划运动选择 UX 优化：一体化网格布局

## Goal

将当前 per-day 的 ExercisePickerGrid 升级为屏幕级统一动作池（Unified Exercise Pool），用户在一个大网格中浏览/筛选所有动作，选中后批量分配到多天，减少重复操作步数，对标 Strong/Fitbod 的 unified exercise library 体验。

## Background

当前实现（上一任务 07-19-weekly-plan-ux-redesign 已完成）：
- `ExercisePickerGrid`：每个天卡片展开后内部嵌入一个动作网格
- `DayPlanCard` 编辑态底部的 ExercisePickerGrid 只作用于当前天
- 用户切换天时需要关闭/打开天卡片，跨天重复操作

已知事实：
- 动作库：`buildExerciseLibrary()` 返回 `ExerciseDef[]`，约 40+ 动作
- 数据结构：`BodyPlanTask.exercises: ExerciseDef[]`，每个天独立存储
- 网格已实现：filter tabs + search + muscle group chips + toggle 反馈

## Confirmed Facts

- **统一池位置**: 屏幕顶部区域（约 1/3 屏高度），所有天卡片上方，始终可见
- **多天选择 UI**: 天勾选列表（紧凑 7 天复选框，预勾选当前天）
- **per-day grid**: 不保留，统一池是唯一添加入口
- **冲突处理**: 已存在动作的天跳过 + snackbar 提示
- 天卡片内只保留已添加动作列表（ExerciseList）+ 内联编辑/移除

## Constraints

- 不可改变 `BodyTrainingPlan` schema（tasks/exercises 结构稳定）
- 核心数据路径：store → SQLite → sync 不可打断
- 每个天独立存储动作列表（不引入跨天共享的"中间池"）

## Requirements

### R1: 屏幕级统一动作池
- 替代当前 per-day 的 ExercisePickerGrid
- 位置：屏幕顶部区域（约 1/3 屏高度），在所有天卡片上方
- 始终可见，用户可边选边看天卡片反馈
- 天卡片内精简：去掉 per-day grid，只保留已添加动作列表（ExerciseList）+ 编辑/移除入口
- 统一浏览/筛选/搜索所有动作（复用现有 filter tabs + search + muscle group chips）

### R2: 批量分配到多天（天勾选列表）
- 点击动作后，显示紧凑的 7 天复选框列表（Mon ☐ / Tue ☐ / Wed ☐ / ...）
- 预勾选当前展开的天；支持全选/全部取消
- 勾选完自动保存，无需额外确认步骤
- 天标签视觉风格对齐 MiniWeekCalendar（紧凑、色块、星期缩写）

### R3: 天卡片内动作列表编辑
- 统一池是唯一添加动作入口，不保留 per-day grid
- 每个天卡片展开后只显示已添加动作列表（ExerciseList）+ 内联编辑/移除入口
- 支持内联编辑（组数/次数/重量）和移除（复用 ExerciseCard）

### R4: 冲突处理与视觉反馈
- 已存在动作的天：天勾选列表中该天 checkbox dimmed（不可勾选），表示已有
- 批量分配时跳过已存在的天，snackbar 提示"已跳过 XX 天（已存在）"
- 统一池中已存在于某天的动作卡片显示该天标记（如小标签显示"周一"）

## Acceptance Criteria

- [ ] AC1: 统一动作池在 BodyPlanEditorScreen 顶部可见（约 1/3 屏高度），始终显示
- [ ] AC2: 点击动作后显示天勾选列表，预勾选当前展开的天，勾选完自动保存
- [ ] AC3: 已存在某天的动作 checkbox dimmed，跳过并 snackbar 提示
- [ ] AC4: 天卡片展开后只显示已添加动作列表 + 编辑/移除，无 per-day grid
- [ ] AC5: `pnpm --filter mobile type-check` → 0 error
- [ ] AC6: `pnpm run lint` → 0 error
- [ ] AC7: `pnpm run test` → all passing