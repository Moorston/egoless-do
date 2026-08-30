# 拆分 SportPage — 组合 hook + handleSave 拆分

## Goal

将 `SportPage.tsx` 的 ESLint cyclomatic complexity 从 44 降至 ≤30（AC 要求 ≤15），同时拆分 `handleSave`（第 511 行，**第二个复杂度热点 CC 21**）降至 ≤15。保持 effect 顺序和 comboState ref 模式不变。

## Background

SportPage 是运动页主体，复杂度 44。`handleSave`（第 511 行）有独立的复杂度 21，是第二个 ESLint 违规。复杂度来源：组合运动状态机（comboState ref + goToNextExercise）、handleSave 的组合/单运动双分支（25 个依赖项）。

**已有提取**（复用，不重复）：
- `SportPrepPage` / `SportActivePage` / `SportReportPage` 子组件（动态分派）
- `useExerciseTimer` hook（timer.page/sec/handlePause）
- `useExerciseAudio` hook
- `useExerciseRest` hook
- `useAmapComponents` hook（GPS/地图）
- `computeComboTitle` 纯辅助函数（第 42 行）

## Requirements

### R1 — 提取 useComboSession hook
- 聚合组合运动状态机：`comboState` ref + `goToNextExercise` + 组合模式派生值
- **保持 comboState ref 模式**——ref 在 hook 内创建，返回给主组件
- 包含：`currentComboExercise` / `effectiveSportName` / `effectiveIcon` 派生

### R2 — 拆分 handleSave
- `handleSave`（第 511 行，CC 21）拆为：
  - `saveSingleSport` — 单运动模式保存逻辑（构建 entry + addExercise + setBodyFlowState + Health 写入）
  - `saveComboExercise` — 组合模式（委托给 `goToNextExercise`）
- **保持 savingRef 防重入保护**
- handleSave 变为：判断组合/单运动 → 分派

### R3 — 检查 breathing/gps hook
- `useExerciseBreathing` / `useExerciseGpsTracking` 若适用且尚未提取，提取之
- 若已部分提取（useAmapComponents 可能覆盖 GPS），则跳过

### R4 — 主组件保持编排层
- 复杂度 ≤30

## 不触碰清单（危险区）

| 区域 | 位置 | 理由 |
|------|------|------|
| effect 链 | timer.sec 变化触发 3 个 effect | effect 顺序改动易引入组合运动状态机 bug |
| `comboState` ref 渲染期读取 | 第 84/480-484/614 行 | ref 模式已有，提取到 hook 时保持 ref 传递 |
| `handleSave` 依赖数组 | 第 580 行 ~25 项 | 拆分后依赖项分散到子函数，但执行逻辑不变 |
| 已有子页面/hooks | SportPrepPage/ActivePage/ReportPage + timer/audio/rest | 复用不修改 |

## Acceptance Criteria

- [ ] AC1：`SportPage` ESLint `complexity` ≤ 15
- [ ] AC2：`handleSave`（拆分后）ESLint `complexity` ≤ 15
- [ ] AC3：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC4：`pnpm run type-check` 0 错误
- [ ] AC5：`pnpm run test` 全量通过（≥1967）
- [ ] AC6：消费方零改动——exercise 导航 diff 为空
- [ ] AC7：effect 链顺序不变——diff 审查
- [ ] AC8：comboState ref 模式不变——ref 在 hook 内创建，传递方式一致
- [ ] AC9：无新增 `any` / `console.log` / raw 用户可见字符串

## Out of Scope

- effect 链解耦（高风险，需独立任务）
- comboState ref 重写为 state（高风险，需独立任务）
- `max-lines-per-function` 行数达标
