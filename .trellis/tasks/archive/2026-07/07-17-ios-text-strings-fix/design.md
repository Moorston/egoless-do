# Design — iOS Text strings warning 修复 + ESLint 规则

## 1. 修复策略

### 1.1 确定性 root cause
`apps/mobile/src/features/practice/body/BodyDashboard.tsx:812`
```tsx
// 改前
<Text ...>{planProgress.weekComplete}/{planProgress.weekTotal}</Text>
// 改后
<Text ...>{String(planProgress.weekComplete)}/{String(planProgress.weekTotal)}</Text>
```
与同文件 `:836` 已存在的修复保持一致。

### 1.2 同源排查范围
扫 `apps/mobile/src/features/practice/`、`features/home/`、`features/body/` 下所有 `.tsx`，找：
- `<Text>{xxx}</Text>` 其中 `xxx` 是裸 `number` 表达式（`.length`、`Math.round(...)`、`.reduce(...)`、`Date.now() - ...`、`+value` 等）
- 排除：已 `String(...)` 包裹、模板字符串 `` `${x}` ``、`T('...')` 返回值、`String(item.value)` 等显式转换

工具：
```bash
grep -rEn '<Text[^>]*>\{[^}]*\}</Text>' apps/mobile/src/features/practice apps/mobile/src/features/home apps/mobile/src/features/body
```
再人工过滤出裸数字。

### 1.3 低概率项
`CelebrationOverlay.tsx:124 / :128` 的 `data.totalDurationMin` / `data.totalCalories` — 同源，顺手修。

## 2. ESLint 规则设计

### 2.1 方案选择
仓库已用 `@typescript-eslint` + `eslint-plugin-react`（mobile 端）。两条路：

| 方案 | 实现 | 精度 | 成本 |
|------|------|------|------|
| **A: `no-restricted-syntax` + 自定义 selector** | 在 `packages/config/eslint.base.js` 加一条 AST selector | 中（能拦裸数字表达式，但 selector 写起来偏底层） | 低 |
| **B: 独立 rule 文件** | 在 `packages/config/eslint-rules/no-raw-number-in-text.js` 写一条 rule | 高（可精确区分 `<Text>` 子节点 vs 其他 JSX） | 中 |

**推荐 B**：独立 rule 文件，可复用、可单测、可演进。

### 2.2 Rule 行为
- Rule id: `no-raw-number-in-text`
- 触发条件：`JSXElement` 的 `openingElement.name.name === 'Text'`（含 `<Text>` 与 `<Text.xxx>`），其 `children` 中出现：
  - `JSXExpressionContainer` 内表达式 `estree` 类型为 `number`（TS 类型推断）
  - 或 selector 命中：`Math.round(...)`、`Array.prototype.reduce`、`.length`、`Date.now()`、一元 `+`
- 错误消息：`Raw number expression in <Text> — wrap with String() or use template literal`
- 放行：`String(...)`、模板字符串、`T('...')`、`Number.isFinite(x) ? y : z` 等显式转换

### 2.3 实现要点
- 用 `@typescript-eslint/utils` 的 `AST_NODE_TYPES` + `TSModule` 类型推断
- 文件：`packages/config/eslint-rules/no-raw-number-in-text.js`
- 在 `packages/config/eslint.base.js` 的 `plugins` 加 `'local'`（或自定义 plugin 名），`rules` 加 `'local/no-raw-number-in-text': 'error'`
- 测试：`packages/config/eslint-rules/__tests__/no-raw-number-in-text.test.js`（用 `RuleTester`）

### 2.4 兼容性
- 仅 mobile 端用 `<Text>`；core 端无 JSX，规则不影响
- 测试文件（`**/*.test.tsx`）降为 `warn`，避免 mock 数据触发

## 3. 数据流与兼容性

- 修复只涉及 UI 渲染层，不碰 store / adapter / schema
- 无 DB 迁移、无 API 变更
- 向后兼容：`String(...)` 输出与 Hermes 隐式转换一致，用户可见文本不变

## 4. 风险与回滚

| 风险 | 缓解 |
|------|------|
| ESLint rule 误报（false positive） | 先在 mobile 端跑 `pnpm lint`，若有误报调整 selector 或加 disable 注释 |
| 修复漏网 | 跑完修复后再扫一次；CI 加 lint job 防回归 |
| 规则影响 core 端 | core 端无 JSX，规则自然不触发 |

回滚点：修复是纯 UI 字符串包裹，revert 任一 commit 即可。

## 5. 验证命令

```bash
pnpm --filter mobile type-check
pnpm run lint
pnpm run test
# 真机验证：BodyScreen → BodyDashboard 不抛 warning
```
