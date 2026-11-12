# Implement — core lint 脚本补全与 tsconfig 测试文件纳入

## 执行清单（有序）

### Step 1 — 新建 `packages/core/tsconfig.lint.json`
```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["dist/**", "node_modules/**"]
}
```

### Step 2 — 改 `packages/core/.eslintrc.js`
- `parserOptions` 显式设 `project: './tsconfig.lint.json'`（覆盖 base 的 `true`），保留其余。
- `overrides` 数组追加 ai/local-engine override：
  ```js
  {
    // AI 本地引擎用动态 require 做平台检测与懒加载（core 不得静态导入 react-native），
    // 这是架构约束下的合规出口，关闭 no-var-requires。
    files: ['src/ai/local-engine/**/*.ts'],
    rules: { '@typescript-eslint/no-var-requires': 'off' },
  }
  ```
- 保留现有 `no-restricted-imports` 规则不动。

### Step 3 — 加 lint 脚本到 `packages/core/package.json`
```json
"lint": "eslint src --ext .ts,.tsx",
"lint:fix": "eslint src --ext .ts,.tsx --fix"
```
（插在 `build` 之后，保持字母序。）

### Step 4 — 跑 `eslint --fix` 清理 auto-fixable
```bash
cd packages/core && npx eslint src --ext .ts,.tsx --fix
```
预期消掉 36 个 import/order + 部分 unused-vars。

### Step 5 — 修复 `utils.ts:73` 的 no-var-requires
- line 73 `(require('crypto') as {...}).webcrypto`：加行内 `// eslint-disable-next-line @typescript-eslint/no-var-requires`（crypto 在该分支不可静态 import）。

### Step 6 — 修复 AI engine 的 no-console（5 处）
- `coreml-engine.ts:17`、`onnx-engine.ts:17`：引 `createLogger`，替换 console.log。
- `hybrid-engine.ts:23,28`：`console.log` → `console.warn`（fallback 语义，规则 allow）。
- `model-manager.ts:103`：引 `createLogger`，替换 console.log。
- 实现 createLogger 调用前确认 `logger.ts` 导出签名。

### Step 7 — 定点修剩余零散 error
跑 `cd packages/core && npx eslint src --ext .ts,.tsx` 取最新清单，逐个处理：
- `no-mixed-spaces-and-tabs`(3)：转空格缩进。
- `no-constant-condition`(1)：视语境加 break 条件或 disable。
- `ban-types`(1)：替换为具体类型。
- `prefer-const`：`checkDate` → const。

### Step 8 — 验证 AC1
```bash
cd packages/core && npx eslint src --ext .ts,.tsx
```
→ 必须 0 error（warning 可保留）。

### Step 9 — 验证 AC2/AC3/AC4
```bash
pnpm run lint          # core + mobile 均 successful
pnpm run type-check    # exit 0，core dist 无 .test.* 产物
pnpm run test          # 通过用例 ≥ 2049，无新失败
```

### Step 10 — 规范文档联动（AC6）
检查 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` / `ARCHITECTURE-CONSTRAINTS.md` 的 ESLint 联动章节，若声明 "core lint 待补" 之类，更新为已纳入。

## Review Gates
- Step 8 后：lint 0 error 才进 Step 9。
- Step 9 任意一项回归即停下回查，不强行推进。

## Rollback Points
- Step 1~3 是配置层，可整体 revert（删 tsconfig.lint.json + 还原 eslintrc + 删脚本）回到原状。
- Step 5~7 是代码层定点修，逐文件 revert。
