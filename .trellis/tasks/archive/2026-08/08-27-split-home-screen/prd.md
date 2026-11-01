# 拆分 HomeScreen — WeightCard / WaterCard / 模态框

## Goal

将 `HomeScreen.tsx` 的 ESLint cyclomatic complexity 从 49 降至 ≤30（AC 要求 ≤15），通过提取纯展示子组件，**不触碰 setTimeout 保存链和 buildNote 等危险区**。

## Background

HomeScreen 是首页主体，复杂度 49。复杂度来源：内联的 WeightCard/WaterCard 条件渲染（`status === 'done' ? ... : 'editing' ? ...`）、多个 handler 的 `isReadOnly` 守卫、内联模态框。

**已有提取**（复用）：
- `HabitItem` 子组件（第 34 行导入）
- `parseWeight` 辅助函数（第 69 行）
- `CheckinStatsModal` / `HomePlanSection` / `HomeFoodSection` / `GraceReminder` / `DelayedReminder` 子组件

## Requirements

### R1 — 提取 WeightCard 子组件
- 将 WeightCard 内联 JSX（~50 行）提取为独立子组件
- 接收 props：weight 数据 + 编辑回调 + isReadOnly
- 纯渲染

### R2 — 提取 WaterCard 子组件
- 将 WaterCard 内联 JSX（~40 行）提取为独立子组件
- 接收 props：water 数据 + 加水回调 + 目标

### R3 — 提取模态框包装
- 若 `ReasonModal` / `WaterGoalModal` 尚未独立，提取为包装组件
- 若已独立则跳过

### R4 — 主组件保持编排层
- 复杂度 ≤30

## 不触碰清单（危险区）

| 区域 | 位置 | 理由 |
|------|------|------|
| `setTimeout(() => saveField(), 0)` 保存链 | 第 267 行 + 多处 | effect 耦合，改动易引入 stale closure |
| `buildNote` | 第 231 行 | 渲染期间读 `useAppStore.getState()`，已有模式。**留在 HomeScreen 主组件，不随 WeightCard 移走** |
| `saveField` 函数 | 第 267 行 | 保存链核心，不修改。**留在 HomeScreen 主组件** |
| 本地状态漂移逻辑 | toggleHabit/addWaterCb/handleFoodChanged 等 setTimeout 调用 | 不修改 |
| `parseWeight` | 第 69 行 | 已提取，复用 |

## Acceptance Criteria

- [ ] AC1：`HomeScreen` ESLint `complexity` ≤ 15
- [ ] AC2：`pnpm run lint` 0 error 0 warning（不新增 disable）
- [ ] AC3：`pnpm run type-check` 0 错误
- [ ] AC4：`pnpm run test` 全量通过（≥1967）
- [ ] AC5：消费方（navigation/index.tsx）零改动
- [ ] AC6：setTimeout 保存链行为不变——`buildNote` / `saveField` / setTimeout 调用 diff 为空
- [ ] AC7：无新增 `any` / `console.log` / raw 用户可见字符串

## Out of Scope

- setTimeout 保存链重构（高风险，需独立任务）
- buildNote 渲染期读 store 重构（高风险，需独立任务）
- `max-lines-per-function` 行数达标
