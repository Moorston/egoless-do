# Design — coverage-ratchet-gate

## 1. 分包 coverage 配置（R1）

### 为什么是独立 config 而非改现有 config

| 方案 | 否决理由 |
|------|---------|
| 改 root config 加 coverage | 一次跑只能出一个总分母（core+mobile 合并失真）；或 projects 化改变全量跑行为（2097 基线与 mobile symlink 双份计数行为全变——风险不可控） |
| `--root packages/core` 跑法 | **planning 实测否决**：setupFiles './setup.ts' 相对新 root 解析失败 → react-native vi.mock 缺失 → local-engine placeholder 2 用例红（root config 跑全绿，纯环境 artifact） |
| 修复 core bin 链接 + cd 分包跑 | bin 链接损坏根因不明，pnpm install 全量重链环境副作用大 |
| **独立 coverage config + `--config` 从 root 跑**（选定） | 现有三 config 零改动（2097 基线不动）；config 内 `root: __dirname` 锁定解析基准（mobile 现有 config 的先例模式）；setupFiles 绝对路径；vitest 3.2 支持 |

### `packages/core/vitest.coverage.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,                                    // 锁定解析基准（--config 从任意 cwd 跑）
    include: ['src/**/*.test.ts'],
    globals: true,
    setupFiles: [path.resolve(__dirname, '../../setup.ts')],  // 绝对路径，规避 --root 解析坑
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],                    // 分母 = core 源码
      exclude: ['src/**/*.test.ts', '**/*.d.ts', 'dist/**', 'node_modules/**'],
      reporter: ['text', 'text-summary'],
      thresholds: { lines: N1, branches: M1, functions: P1, statements: N1x },  // B 阶段实测填入
    },
  },
});
```

### `apps/mobile/vitest.coverage.config.ts`（同构 + 保留 mobile 原有 alias）

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: [path.resolve(__dirname, '../../setup.ts')],
    coverage: { ...同上, include: ['src/**/*.{ts,tsx}'] },
  },
  resolve: {
    alias: [
      // 逐字拷贝自 apps/mobile/vitest.config.ts（react-native-shim + @egoless-do/core）
    ],
  },
});
```

### 跑法（root cwd）

```bash
pnpm exec vitest run --coverage --config packages/core/vitest.coverage.config.ts
pnpm exec vitest run --coverage --config apps/mobile/vitest.coverage.config.ts
```

## 2. provider 依赖（R2）

- core：`@vitest/coverage-v8` ^3.2.7 已在 devDeps ✓
- mobile：补 devDep `@vitest/coverage-v8: ^3.2.7`（对齐 core 版本；pnpm install 更新 lock——正常依赖添加，非手编 pnpm-lock.yaml）
- 版本一致性实况：root/core vitest 均 ^3.2.7（^4 是 stack.md 记载漂移，以 package.json 实况为准）

## 3. 基线校准（R3）与 thresholds（R4）

- 分包跑 text 报告四口径（lines/branches/functions/statements）实测填入 thresholds（**等值起步**，vitest thresholds 语义：实际 ≥ 阈值通过，即锁当前值防下降）
- **以 vitest text 报告为准**（clover metrics 口径混乱——proposal Notes 记录的坑）
- core 四口径预计 ~61-62% statements 量级；mobile ~4-5%（结构性基线）
- 数字以实施实测为准（11-18 实测是默认分母，分包分母可能有 ±1% 内差异）

## 4. CI 可见性（R5）

ci.yml test job 现状：`pnpm vitest run --reporter=verbose`。改为：

```yaml
- run: pnpm exec vitest run --coverage --config packages/core/vitest.coverage.config.ts
- run: pnpm exec vitest run --coverage --config apps/mobile/vitest.coverage.config.ts
```

+ step summary echo：`echo "..." >> $GITHUB_STEP_SUMMARY`（关键数字：包名/lines/branches/functions/statements）。

- text-summary reporter 输出进 job log；echo 摘要进 step summary（无第三方服务）
- **生效验证边界**：ci-trigger-fix 已修触发（4454d2b0 合入）但 CI 未首跑——本改动静态正确性验收，运行验证与 ci-trigger-fix 同批（用户 push 后首跑）
- 幽灵 "Upload test results" artifact step（上传从未生成的 coverage/）——changelog 11-19 已记 ci-trigger-fix 删了幽灵 artifact；确认 ci.yml 现状若无则不动

## 5. 文档（R6）

GLOBAL-CODE-STANDARDS §9 现名"ESLint 配置联动"→ 扩为"质量门禁联动"：

- lint ratchet：warning 只能降（阈值下调=好）；mobile 0 / core 5 残差
- complexity ratchet：同 lint 方向（mobile 56 / core 37）
- coverage ratchet：**方向相反**——覆盖率只能升（阈值上调=好，下调需理由：删死代码/重定义分母）
- 分母契约：按包 include src/**、排除测试/d.ts/dist/node_modules；scripts 不进分母
- mobile 4.4% 标注"结构性基线"（RN 测试基础设施限制，提升走测试基建任务非 ratchet）

## 6. 测试与验证策略

- 全量基线不动：root `pnpm exec vitest run` 2097/2097（现有 config 零改动，AC5 直接验证）
- 分包 coverage：exit 0（thresholds 等值压线）+ core 无 --root artifact（local-engine placeholder 全绿）
- CI step：YAML 静态检查（actionlint 不可用则语法目检）
- 门禁链：type-check / 双包 lint / lint:complexity（56/37）/ mobile lint ratchet 0——全部不回归

## 7. 风险表

| 风险 | 缓解 |
|------|------|
| `--config` 跑法下 setupFiles/alias 解析差异 | config 内 root:__dirname + 绝对路径 setupFiles；B 阶段分包跑 core 全绿即证（local-engine placeholder 是解析失败的哨兵用例） |
| mobile provider 解析（devDep 补齐前 MODULE_NOT_FOUND） | pnpm install 后分包跑实测；pnpm 结构向上解析 root node_modules 的 fallback 不可依赖，显式补 devDep |
| pnpm install 副作用（重链 node_modules 改变 bin 损坏现状） | install 是幂等添加；跑全量 2097 复验无回归即证 |
| thresholds 四口径与后续测试新增漂移 | ratchet 语义允许上升；新测试只会拉高覆盖率（只升不降天然兼容） |
| mobile 4.4% 阈值意义打折 | 结构性基线标注 + spec 写明提升路径（测试基建任务）；数字被看见本身有价值 |
| CI 首跑前的静态验收边界 | prd/AC6 显式记录"生效验证与 ci-trigger-fix 同批"，不是验收缺口而是排序决策 |

## 8. 回滚

- coverage config ×2 + devDep + CI step 均独立可弃（git checkout 单文件级）；全量测试跑法从未动过（无回滚需求）
