# Design — core lint 脚本补全与 tsconfig 测试文件纳入

## 决策与方案

### 决策 1：用独立 `tsconfig.lint.json` 而非改原 tsconfig

typescript-eslint 官方推荐方案：type-aware linting 需要一个包含所有被 lint 文件（含测试）的 tsconfig，但 build 的 tsconfig 应继续排除测试文件（避免测试进 dist）。

- **方案 A（采用）**：新建 `tsconfig.lint.json` extends 原 tsconfig，清空 exclude 以纳入测试；ESLint 指向它。
- **方案 B（否决）**：直接删原 tsconfig 的 exclude。→ `tsc` build 会把测试编译进 dist，破坏产物纯净度。

`tsconfig.lint.json`：
```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["dist/**", "node_modules/**"]
}
```
注意：`extends` 不合并 `include`/`exclude`，子配置整体覆盖，所以两个都要显式写。

### 决策 2：ESLint parserOptions.project 显式指向

`packages/core/.eslintrc.js` 当前通过 `...baseConfig` 继承 `parserOptions: { project: true }`，`true` 会自动找最近 `tsconfig.json`（排除测试的那个）。改为：
```js
parserOptions: { project: './tsconfig.lint.json', ...baseConfig.parserOptions },
```
`project` 用相对路径（相对于 tsconfigRootDir，默认 = eslintrc 所在目录 = `packages/core/`），`'./tsconfig.lint.json'` 可正确解析。保留 base 的其他 parserOptions（若有）。

### 决策 3：`no-var-requires` 在 ai/local-engine 用 override 关闭

`ai/local-engine/types.ts`（Platform 检测 `require('react-native')`、引擎懒加载 `require('./onnx-engine')`）和 `hybrid-engine.ts`（`require('./types')`）的动态 require 是刻意模式：
- core 不能静态导入 `react-native`（架构 P0 约束），动态 require 做运行时平台探测是合规出口。
- 引擎懒加载避免未使用平台模块在非目标平台炸。

→ 在 `.eslintrc.js` 的 `overrides` 增加：
```js
{
  files: ['src/ai/local-engine/**/*.ts'],
  rules: { '@typescript-eslint/no-var-requires': 'off' },
}
```
并加注释说明原因。`utils.ts:73` 的 `require('crypto')` 是 Node webcrypto 回退，单点用 `// eslint-disable-next-line @typescript-eslint/no-var-requires` 注释（无法静态 import，因为该分支只在缺 `globalThis.crypto` 时走）。

### 决策 4：`no-console` 改 createLogger / console.warn

core `logger.ts` 已导出 `createLogger`。AI engine 5 处 `console.log`：
- `coreml-engine.ts:17`、`onnx-engine.ts:17`：placeholder init 日志 → `createLogger('CoreMLEngine'/'OnnxEngine')` 后 `.info()` 或直接删除（占位代码）。
- `hybrid-engine.ts:23,28`：fallback 通知语义 → `console.warn`（规则 allow warn/error，合规且最小改动）。
- `model-manager.ts:103`：保存模型日志 → `createLogger('ModelManager')`。

注：`logger.ts` 自身的 `console.log`（27,31 行）未报 error——经查 logger 实现里这些是 debug 分支且 base 规则 `no-console: ['error',{allow:['warn','error']}]`，logger.ts 不在报错清单内，不动它。

### 决策 5：其余零散 error 定点修

- `no-mixed-spaces-and-tabs`(3)：统一为空格（文件 lint 输出时定位）。
- `no-constant-condition`(1)：定位后改为显式 `true` 循环加 break 条件或 eslint-disable（视语境）。
- `ban-types`(1)：定位后用具体类型替换（如 `Function` → 具体函数签名，`Object` → `Record<string,unknown>`）。
- `prefer-const`(1)：`checkDate` 改 `const`。
- `import/order`(36)：`eslint --fix` 自动处理。

## 变更文件清单

| 文件 | 变更 |
|---|---|
| `packages/core/tsconfig.lint.json` | 新建 |
| `packages/core/.eslintrc.js` | parserOptions.project 指向 lint tsconfig；新增 ai/local-engine override；保留现有 no-restricted-imports |
| `packages/core/package.json` | 增加 `lint`、`lint:fix` 脚本 |
| `packages/core/src/utils.ts` | line 73 require 加 disable 注释（或重构） |
| `packages/core/src/ai/local-engine/coreml-engine.ts` | console.log → createLogger |
| `packages/core/src/ai/local-engine/onnx-engine.ts` | console.log → createLogger |
| `packages/core/src/ai/local-engine/hybrid-engine.ts` | console.log → console.warn |
| `packages/core/src/ai/local-engine/model-manager.ts` | console.log → createLogger |
| 其余 no-mixed-spaces-and-tabs / no-constant-condition / ban-types / prefer-const 涉及文件 | 实施时定位并定点修 |
| 多文件 | `eslint --fix` 处理 import/order |

## 兼容性与回滚

- 不改动 mobile 配置，不影响 mobile lint/type-check/test。
- 不改动 `tsconfig.json`（build 用），core 产物不变。
- 回滚点：每个文件独立提交，可逐个 revert。最坏情况删 `tsconfig.lint.json` + 还原 `.eslintrc.js` + 删 lint 脚本即回到原状。

## 验证命令

```bash
cd packages/core && npx eslint src --ext .ts,.tsx          # AC1: 0 error
pnpm run lint                                              # AC2: core+mobile successful
pnpm run type-check                                        # AC3: exit 0
pnpm run test                                              # AC4: 不回归
```
