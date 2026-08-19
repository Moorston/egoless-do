# Code Quality 收尾 — ESLint 规则落地 + warning 清零

## Goal

基于 8/18 实测基线（0 error / 159 warning），新增 3 条 ESLint 规则并清理全部 warning，使仓库 lint 基线收敛到可维护状态。

## Context

- OpenSpec change: `code-quality-batch-2`（proposal/design/tasks 已 done）
- 历史对照：7/29 基线 0 error / 4735 warning，8/18 已降至 0 error / 159 warning（-97%）
- 取代的旧清单：`tech-debt-cleanup-batch-1` 的 Batch 3.3/3.4、Batch 4、回归验证

## Requirements

### 必做
- R1: 在 `packages/config/eslint.base.js` 新增 3 条规则：`no-restricted-imports`、`@typescript-eslint/no-floating-promises`、`no-console`（allow warn/error）
- R2: 新规则暴露的违规必须修复或显式降级为 `warn` 并记录原因
- R3: 清理 56 条 `local/no-raw-number-in-text` 调用点（`<Text>{n}</Text>` → `String(n)` / 模板字面量）
- R4: 清理剩余 103 条 warning（import/order ×8、no-unused-vars ×29、exhaustive-deps ×38、max-depth ×12）
- R5: 回归全绿：`pnpm run test`、`pnpm run type-check`、`pnpm run lint`

### 不做（Out of Scope）
- 高风险函数拆分（SportPage/initApp/migrateDatabase/MindTrailScreen）— 另立独立 change
- 同步引擎重构、新功能、性能优化

### 约束
- 不引入新的 `any`
- 不用 `console.log`，统一 createLogger
- 高风险函数的 max-depth warning 跳过（3.4 标注）

## Acceptance Criteria

- [ ] AC1: `pnpm run lint` 输出 0 error
- [ ] AC2: `pnpm run lint` warning ≤ 20（剩余为难修的 exhaustive-deps，需有注释说明）
- [ ] AC3: `pnpm run test` 全通过
- [ ] AC4: `pnpm run type-check` 通过
- [ ] AC5: 3 条新 ESLint 规则已加入 `eslint.base.js`，新违规已处理
- [ ] AC6: 56 条 no-raw-number-in-text 归零
- [ ] AC7: `tech-debt-cleanup-batch-1` 被取代的尾巴已标记归档指向
