# 复杂度热点拆分 — BodyDashboard / migrateDatabase / PlanDetailContent / HomeScreen / SportPage

## Goal

降低 5 个最高复杂度热点的 cyclomatic complexity：4 个降至 ESLint `complexity ≤ 15`，migrateDatabase 因最高风险（零测试 + 冷启动执行 + 表重建可能永久丢数据）降至 ≤40、表驱动重构另立任务。当前复杂度 44~85。同时**不引入运行时回归**，每个热点的拆分必须保持原有行为契约和消费方零改动。

## Background

上一轮 code-quality 审查（08-26-code-quality-history-pages）完成了历史页数据流修复和 useQuickTrailSearch hook 拆分（436→115 行组合根 + 4 子 hook）。本次延续，处理扫描出的 230 个热点中复杂度最高的 5 个。

### 热点分析结果

| # | 文件 | 复杂度 | 行数 | 价值 | 风险 | 拆分策略 |
|---|------|--------|------|------|------|---------|
| 1 | `apps/mobile/src/features/practice/body/BodyDashboard.tsx` | 85 | 1146 | 高 | 低 | 提取 4 个 Banner 子组件 + flow 状态 hook |
| 2 | `apps/mobile/src/db/schema.ts` (`migrateDatabase`) | 67 | 578 | 中 | **高** | 仅提取 6 个非平凡迁移为命名函数；不做表驱动重构 |
| 3 | `apps/mobile/src/features/plan/PlanDetailContent.tsx` | 58 | 1035 | 高 | 低 | 提取待办标签为独立组件 + useDailyTodo hook |
| 4 | `apps/mobile/src/features/home/screens/HomeScreen.tsx` | 49 | 853 | 高 | 中高 | 仅提取 WeightCard/WaterCard/模态框；不动 setTimeout 保存链 |
| 5 | `apps/mobile/src/features/exercise/SportPage.tsx` | 44 | 853 | 高 | 中高 | 提取 useComboSession/useExerciseBreathing/useExerciseGpsTracking |

### 风险热点详情

**migrateDatabase（最高风险）**：
- 零测试覆盖——`schema.ts` 无测试文件，`integration.test.ts` 完全 mock 掉它
- 每次冷启动都跑（无 `PRAGMA user_version` 版本守卫）
- 表重建迁移（DROP+RENAME）出错会导致**永久数据丢失**
- **结论**：仅做最安全的命名函数提取（6 个非平凡迁移），不改变任何执行顺序，不引入表驱动抽象

**HomeScreen 危险区**：
- `setTimeout(() => saveField(), 0)` 保存链——effect 耦合，改动易引入 stale closure
- `buildNote` 读 `useAppStore.getState()`——渲染期间读 store
- **结论**：只提取纯展示子组件（WeightCard/WaterCard/模态框），不碰保存链

**SportPage 危险区**：
- effect 链（`timer.sec` 变化触发 3 个 effect）
- `comboState` ref 在渲染期间被修改
- `handleSave` 有 25 个依赖项
- **结论**：提取组合 hook，但保持 effect 顺序和 ref 模式不变

## Requirements

### R1 — BodyDashboard 拆分（复杂度 85 → ≤30）
- 提取 4 个 Banner 子组件：`TodayPlanBanner`、`BodyProfileBanner`、`BodyAwarenessBanner`、`WeightTrendBanner`
- 提取 `useBodyDashboardData` hook：聚合所有 useMemo 派生（activeGoal、planProgress、recentExercises、latestCheckin、weightTrend、celebrationData 等）
- 提取 `useBodyOverrides` hook：setOverride/clearOverride/handleSwapConfirm/handleAdjustConfirm/handleDaySkip/handleDaySwapConfirm
- 主组件保持为编排层，复杂度 ≤30
- 保留 `eslint-disable max-lines-per-function` 注释直到行数也达标

### R2 — migrateDatabase 命名函数提取（复杂度 67 → ≤40）
- 提取 6 个非平凡迁移为独立命名函数：
  1. `migrateSyncQueueColumns` — sync_queue 多列迁移 + 索引 + 去重
  2. `migrateMeditationHistory` — dur→dur_min 数据转换 + 列增删
  3. `migrateDailyCustomTodosNullable` — plan_id 约束放松（表重建）
  4. `migrateDailyTodoHistoryNullable` — plan_id 约束放松（表重建）
  5. `migrateFastingSessionsCheck` — 移除 CHECK 约束（表重建）
  6. `migrateCheckinReviewsUniqueIndex` — 去重 + UNIQUE 索引
- **保持所有迁移的执行顺序不变**
- `migrateDatabase` 变为线性调用序列 + tryAddCol 调用列表
- **不引入表驱动抽象、不引入版本跟踪**（超出本次范围）

### R3 — PlanDetailContent 待办标签提取（复杂度 58 → ≤30）
- 提取 `TodoTabContent` 子组件（~213 行）
- `useDailyTodo` hook **已存在**（第 17 行导入，第 92-100 行使用）——无需提取，复用现有
- 提取 `PlanActionBar` 子组件（6 个 alert 操作处理器：handleDelete/Complete/Resume/Pause/Cancel + checkCanArchive）
- 主组件保持两标签页布局，复杂度 ≤30

### R4 — HomeScreen 低风险提取（复杂度 49 → ≤30）
- 提取 `WeightCard` 子组件
- 提取 `WaterCard` 子组件
- 提取 `ReasonModal` / `WaterGoalModal` 包装（若尚未独立）
- **不修改 setTimeout 保存链、不修改 buildNote、不修改本地状态漂移逻辑**

### R5 — SportPage 组合 hook 提取（复杂度 44 → ≤30，含 handleSave 复杂度 21）
- 提取 `useComboSession` hook：组合运动状态机（comboState ref + goToNextExercise）
- 提取 `useExerciseBreathing` hook（若适用且尚未提取）
- 提取 `useExerciseGpsTracking` hook（若适用且尚未提取）
- 拆分 `handleSave`（第 511 行，**第二个复杂度热点 CC 21**）为 `saveSingleSport` + `saveComboExercise`
  - 组合分支已委托给 `goToNextExercise`，单运动分支内联保存逻辑需提取
- **保持 effect 顺序、保持 comboState ref 模式**
- SportPage 已有 `SportPrepPage`/`SportActivePage`/`SportReportPage` 子组件 + `useExerciseTimer`/`useExerciseAudio`/`useExerciseRest` hooks——复用现有，不重复提取

## Acceptance Criteria

- [ ] AC1：4 个热点（BodyDashboard / PlanDetailContent / HomeScreen / SportPage）ESLint `complexity` 降至 ≤15；migrateDatabase 降至 ≤40（高风险例外，见表驱动重构已移入 Out of Scope）。`max-lines-per-function` 可保留 disable 注释，本次不强制行数
- [ ] AC2：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC3：`pnpm run type-check` 0 错误
- [ ] AC4：`pnpm run test` 全量通过（当前基线 1967 测试）
- [ ] AC5：BodyDashboard 消费方（BodyScreen/PracticeScreen）零改动
- [ ] AC6：migrateDatabase 执行顺序不变——冷启动 DB 迁移行为完全一致
- [ ] AC7：PlanDetailContent 消费方零改动
- [ ] AC8：HomeScreen 消费方零改动，setTimeout 保存链行为不变
- [ ] AC9：SportPage 消费方零改动，effect 链和 ref 模式不变
- [ ] AC10：无新增 `any` 类型、无新增 `console.log`、无新增 raw 用户可见字符串

## Out of Scope

- migrateDatabase 表驱动重构 / `PRAGMA user_version` 版本跟踪（高风险，需独立任务 + 先加测试）
- HomeScreen setTimeout 保存链重构（高风险，需独立任务）
- SportPage effect 链解耦 / comboState ref 重写（高风险，需独立任务）
- `max-lines-per-function` 行数达标（本次只降 complexity，行数可保留 disable）
- 其余 225 个低复杂度热点（复杂度 <40）

## Open Questions

- 无——范围已通过分析确定。

## Resolved Decisions

- **任务结构**：父任务 + 5 个独立子任务（父持有需求集，每子任务独立 plan/execute/check/archive）。
- **执行顺序**：按风险递增——R3(低) → R1(低) → R4(中高) → R5(中高) → R2(高)。非依赖，节奏控制。
- **R3 修正**：`useDailyTodo` hook 已存在，R3 实际只提取 `TodoTabContent` + `PlanActionBar`。
- **R5 修正**：`handleSave`（第 511 行）是第二个复杂度热点（CC 21），纳入 R5 范围；SportPage 已有子页面/hooks 拆分，复用现有。
- **migrateDatabase ≤40 例外（2026-10-31 确认）**：实际拆分后 migrateDatabase 复杂度为 38，达 R2/design 模式 B 的 ≤40 目标，未达原 AC1 的 ≤15。压到 ≤15 需要已被判为 Out of Scope 的表驱动重构（零测试 + 冷启动执行 + 表重建可能永久丢数据）。用户确认接受 ≤40 例外，AC1 已据此修正。表驱动重构另立独立任务，前置条件为先补 migrateDatabase 测试基线。
