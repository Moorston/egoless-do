# mobile complexity 治理 — max-lines-per-function 收敛

## Goal

治理 mobile 13 个 lint warning（12 个 `max-lines-per-function` + 1 个 `import/order`），把 mobile lint ratchet 从 `--max-warnings 13` 下调到 `0`（或近 0，视 screen 重构策略）。父任务 owns 策略决策和 ratchet 下调；具体执行拆 child 任务。

## Background

mobile lint 阈值 `max-lines-per-function: ['warn', { max: 300 }]`（packages/config/eslint.base.js:24）。13 个 warning 分布：
- 8 个 screen 组件（324-673 行）：PlanCreateScreen(673)/ProfileScreen(568)/PreceptScreen(473)/BodyPlanEditorScreen(392)/DayCheckinScreen(368)/DiaryModal(336)/RelationMapView(326)/ReviewAIPanel(324)
- 1 个 StyleSheet 函数：SleepHistoryPage mkStyles(435)
- 3 个 sync 测试 setup arrow：SyncApplyService.test(526)/SyncEngine.test(455)/SyncRehydrationManager.test(353)
- 1 个 import/order：useBodyDashboardData.ts（trivial --fix）

## 关键约束：风险分级

**8 个 screen 全部无 co-located 测试**（已核实：mobile 33 个测试文件无一覆盖这些 screen）。这属于 MEMORY.md "Risk-Tiered Complexity Threshold" 记录的高风险场景（zero-test + cold-start + destructive）。强行拆分无测试 screen 有回归风险——需策略选择，不能无脑拆。

## 任务结构（parent + 2 child）

### child 1 — 低风险清理（sync 测试 + StyleSheet carve-out + import/order）
- 3 个 sync 测试 setup arrow 提取共享 helper（test-only，行为保持，类似 core harness 模式）
- mkStyles StyleSheet 配置 eslint 豁免（`max-lines-per-function` 的 `IIFEs: false` 已是默认，但 mkStyles 是命名函数；考虑对 style-definition 函数加 per-file `// eslint-disable-next-line` 带理由，或拆分 StyleSheet 为多文件——design 决定）
- useBodyDashboardData import/order `--fix`
- 预期 warning 13→8（消除 5）

### child 2 — screen 组件重构（8 个无测试 screen，高风险）
- **策略三选一**（design.md 决策）：
  - A. characterization test 先行（mock SQL 序列快照锁行为，参考 MEMORY.md "Characterization Test Baseline"），再保守拆分
  - B. risk-tiered carve-out：对无测试 screen 接受更高阈值（per-file eslint-disable + 理由），不强压 300
  - C. 保守拆分：只提取明确行为保持的子组件/hook（如 StyleSheet 提取、handler 提取、大 JSX 块抽子组件），人工验证
- 预期 warning 8→0（若策略 A/C）或 8→保留（若策略 B，ratchet 下调排除 carve-out）

## Acceptance Criteria（父任务）

- [ ] child 1 完成：sync 测试 setup 提取 + mkStyles 处理 + import/order 修复
- [ ] child 2 完成：8 个 screen 按 design.md 选定策略处理
- [ ] mobile lint 0 error，warning 显著下降（目标 0，视策略 B 保留数）
- [ ] mobile `pnpm run test` 全绿，行为不变
- [ ] mobile `pnpm run type-check` 0 error
- [ ] ratchet 阈值 13→实测值，`pnpm run lint` exit 0
- [ ] spec 更新（mobile/frontend/quality-guidelines.md ratchet 记录）

## Out of Scope

- mobile 非 max-lines 的其他 warning（当前 13 全是这两类）
- 新增产品功能
- screen 重写（只拆分/提取，不改行为）

## Risks

- **无测试 screen 重构回归（高）**：8 个 screen 无测试，拆分可能引入回归。child 2 design.md 必须先定策略（test-first / carve-out / 保守拆分）。
- **mkStyles carve-out 争议（低）**：豁免样式函数可能被视为"放水"，但 StyleSheet 扁平定义拆分确无收益。
- **sync 测试 helper 提取（低）**：test-only，行为保持，风险可控。
