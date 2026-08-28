# 拆分 PlanDetailContent — 待办标签 + 操作栏

## Goal

将 `PlanDetailContent.tsx` 的 ESLint cyclomatic complexity 从 58 降至 ≤30（AC 要求 ≤15），通过提取 `TodoTabContent` 子组件和 `PlanActionBar` 子组件，同时保持消费方零改动。

## Background

PlanDetailContent 是计划详情页的主体组件，包含两个标签页（detail / todo）和 6 个计划操作处理器。复杂度主要来自 detail tab 内 `items.map()` 的大量条件渲染和 todo tab 的分支逻辑。

**已有提取**（复用，不重复）：
- `useDailyTodo` hook（第 17 行导入，第 92-100 行使用）——待办项 CRUD + 派生
- `Heatmap` / `ItemHeatmap` / `LinkBadge` / `ProgressRing` / `StatusLabel` 子组件（从 `./components/*` 导入）

## Requirements

### R1 — 提取 TodoTabContent 子组件
- 将 todo tab 的 JSX（~213 行）提取为独立子组件 `TodoTabContent`
- 接收 props：`useDailyTodo` 返回值 + plan + items + checkins + 相关回调
- 纯渲染，不含业务逻辑

### R2 — 提取 PlanActionBar 子组件
- 将 6 个 alert 操作处理器提取为 `PlanActionBar` 子组件
- 处理器：`handleDelete` / `handleComplete` / `handleResume` / `handlePause` / `handleCancel` + `checkCanArchive` 辅助
- 接收 props：plan 状态 + 操作回调 + 权限判断结果

### R3 — 主组件保持编排层
- `PlanDetailContent` 变为：日期检测器 + tab 切换 + `<TodoTabContent>` / detail tab 内联 + `<PlanActionBar>`
- 复杂度 ≤30

## 不触碰清单（危险区）

| 区域 | 位置 | 理由 |
|------|------|------|
| `createDateChangeDetector` | 第 49-67 行 | 跨天刷新逻辑，改动易引入状态漂移 |
| `AppState` 监听 + 60s 间隔 | 第 49-67 行 useEffect | 同上 |
| `useDailyTodo` hook | 已存在 | 复用，不修改 |
| 已提取的子组件 | `./components/*` | 复用，不修改 |

## Acceptance Criteria

- [ ] AC1：`PlanDetailContent` ESLint `complexity` ≤ 15
- [ ] AC2：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC3：`pnpm run type-check` 0 错误
- [ ] AC4：`pnpm run test` 全量通过（≥1967）
- [ ] AC5：消费方（PlanScreen 等）零改动——`git diff` 验证
- [ ] AC6：无新增 `any` / `console.log` / raw 用户可见字符串

## Out of Scope

- `createDateChangeDetector` 重构（高风险，需独立任务）
- `useDailyTodo` hook 修改（已存在，复用）
- `max-lines-per-function` 行数达标（本次只降 complexity）
