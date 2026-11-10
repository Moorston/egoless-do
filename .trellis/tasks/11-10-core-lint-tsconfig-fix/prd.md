# core 包 lint 脚本补全与 tsconfig 测试文件纳入

## Goal

`packages/core` 目前没有 `lint` 脚本，`turbo run lint` 实际只 lint mobile，core 的 170 个 lint 问题（80 errors）完全绕过 CI。本任务补全 core 的 lint 脚本、修复 type-aware linting 的 tsconfig 配置缺陷，并清理剩余真实 error，使 core lint 在 CI 中真正生效且通过（0 error）。

## Background

根因分析（2026-11-10 实测）：

1. `packages/core/package.json` 的 `scripts` 里没有 `lint`，turbo 的 `lint` 任务定义 `outputs: []` 对所有包生效，但 core 无脚本就被跳过。
2. `packages/core/tsconfig.json` 显式 `exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"]`，而 ESLint base 配置用 `parserOptions.project: true`（type-aware linting 自动找最近 tsconfig）。测试文件被 tsconfig 排除 → typescript-eslint 对每个 `.test.ts` 报 "TSConfig does not include this file" parse error，约 60 个 error 全源于此。
3. 剩余约 17 个真实 error：`no-var-requires`(6)、`no-console`(5)、`no-mixed-spaces-and-tabs`(3)、`no-constant-condition`(1)、`ban-types`(1)、`prefer-const`(1)。

## Requirements

### R1 — 补全 core lint 脚本
- `packages/core/package.json` 增加 `"lint": "eslint src --ext .ts,.tsx"` 和 `"lint:fix": "eslint src --ext .ts,.tsx --fix"`。
- `turbo run lint` 执行后须同时覆盖 core 与 mobile（"2 successful"）。

### R2 — 修复 type-aware linting 的 tsconfig 配置
- 新建 `packages/core/tsconfig.lint.json`，extends `./tsconfig.json`，`include: ["src/**/*"]`，`exclude: ["dist/**","node_modules/**"]`（即纳入测试文件）。
- `packages/core/.eslintrc.js` 把 `parserOptions.project` 从继承的 `true` 改为显式指向 `./tsconfig.lint.json`。
- `tsc --noEmit`（build/type-check）仍使用原 `tsconfig.json`，测试文件不进 dist，行为不变。

### R3 — 清理剩余真实 error 至 0
- `no-var-requires`：`ai/local-engine/**` 的动态 require 是刻意模式（平台检测 + 引擎懒加载），在 `.eslintrc.js` 为该目录加 override 关闭规则并注释说明；`utils.ts:73` 的 `require('crypto')` 改为合规写法或加行内 disable 注释。
- `no-console`：AI engine 占位文件的 5 处 `console.log` 改用 `createLogger`（core 已有 `logger.ts`）或降级为允许的 `console.warn`（仅限 fallback 语义）。
- `no-mixed-spaces-and-tabs` / `no-constant-condition` / `ban-types` / `prefer-const`：逐个定点修复。
- auto-fixable 的 `import/order`(36) 用 `--fix` 一并清理。

### R4 — 不回归
- `pnpm run type-check` 仍 0 error。
- `pnpm run test`（core + mobile）用例数不减少，不引入新失败。
- mobile lint 行为不变（不改动 mobile 配置）。

## Acceptance Criteria

- [ ] AC1：`cd packages/core && npx eslint src --ext .ts,.tsx` 输出 0 error（warning 允许保留）。
- [ ] AC2：`pnpm run lint`（turbo）显示 core 与 mobile 两个任务均 successful。
- [ ] AC3：`pnpm run type-check` 仍 exit 0，core dist 不包含 `.test.*` 产物。
- [ ] AC4：`pnpm run test` 通过用例数 ≥ 2049（与修复前持平，不回归）。
- [ ] AC5：`packages/core/tsconfig.lint.json` 存在且 `.eslintrc.js` 显式引用它。
- [ ] AC6：`.trellis/spec/` 治理文档若有 ESLint 联动章节，更新反映 core lint 已纳入 CI。

## Out of Scope

- mobile 的 `type-check` 脚本补全（属报告第 2 项，另立任务）。
- 删除根目录垃圾文件 `lint_final.json` / `meta-all.mjs`（另立任务）。
- 修复 3 个超时测试（另立任务）。
- 重构大文件、AI engine 占位实现补全。
