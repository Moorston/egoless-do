# iOS Text strings warning 修复 + 同源排查 + ESLint 规则

## Goal

修复 iOS 真机（Hermes release）报错 `Text strings must be rendered within a <Text> component`，错误在用户打开 BodyScreen → BodyDashboard 时触发。同时排查同模式裸数字渲染，并加 ESLint 规则防止再次出现。

## Background

该 warning 模式已在本仓库出现 9 次（最近 `c77e3cd`，BodyDashboard 数值转换）。每次都是 `<Text>{number}/{number}</Text>` 中裸 `number` 子节点在 iOS release 上触发。第九次修复时达成共识"加 ESLint 规则"但未落地，本次一并补上。

## Confirmed Facts

- **Stack frame**: `BodyDashboard` (BodyScreen.bundle:320274)
- **Root cause**: `apps/mobile/src/features/practice/body/BodyDashboard.tsx:812`
  ```tsx
  <Text ...>{planProgress.weekComplete}/{planProgress.weekTotal}</Text>
  ```
  `weekComplete` / `weekTotal` 来自 `.length`，是裸 `number`。
- **同文件已修实例** (commit `c77e3cd`): `:836`、`:851`、`:855`、`:859` 都已 `String(...)` 包裹
- **低概率同源项**: `CelebrationOverlay.tsx:124` `data.totalDurationMin`、`:128` `data.totalCalories`（来自 `Math.round/.reduce`，覆盖层只在庆祝时弹出）

## Requirements

- **R1**: 修复 `BodyDashboard.tsx:812` 裸数字
- **R2**: 扫 `features/practice/`、`features/home/`、`features/body/` 找出所有 `<Text>{number}</Text>` 同模式实例并修复
- **R3**: 修复 `CelebrationOverlay.tsx:124/:128`
- **R4**: 在 ESLint 配置中加一条规则，禁止 `<Text>` 子节点中出现裸数值表达式（`number`、`.length`、`Math.round(...)`、`.reduce(...)` 等），除非显式 `String(...)` 或模板字符串包装
- **R5**: 不破坏现有测试与 lint

## Acceptance Criteria

- [ ] A1: `pnpm --filter mobile type-check` 0 error
- [ ] A2: `pnpm run lint` 0 error, 0 warning
- [ ] A3: `pnpm run test` 全通过
- [ ] A4: BodyScreen → BodyDashboard 在 iOS release 不再抛 "Text strings must be rendered..." warning（需真机/模拟器验证）
- [ ] A5: `grep -rEn '<Text[^>]*>\{[^}]*\}</Text>' apps/mobile/src/features` 时除显式 `String(...)` / 模板字符串外无裸数字
- [ ] A6: ESLint 规则存在并在裸数字 JSX 时报 error

## Out of Scope

- Android 端同款 warning（本次只确认 iOS）
- i18n `T('...')` 返回值改动
- 用户数据与持久化层
- 业务逻辑与 UI 视觉调整

## Technical Notes

- 修复用 `String(...)` 包裹（与 `c77e3cd` 既有修复保持一致）
- ESLint 规则用独立 rule 文件 `packages/config/eslint-rules/no-raw-number-in-text.js`（详见 `design.md`），通过 `local/no-raw-number-in-text` 启用
