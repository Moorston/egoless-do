# coverage-ratchet-gate 实施：分母定义 + 基线校准 + ratchet 门禁 + CI 可见性

## Goal

覆盖率从"收集了但不可见、无门禁"治成与 lint ratchet 同构的可执行门禁：双包分母定义（排除 scripts 噪声）、阈值=实测起步（覆盖率只能升）、CI step summary 可见性、GLOBAL-CODE-STANDARDS §9 成文。

**实测基线（2026-11-18 proposal，statement 口径，默认分母）**：

| 包 | 实测 | 性质 |
|----|------|------|
| core | 11,525 / 18,701 = **61.6%** | 存量 store/business/utils 测试网是实的——**主收益：ratchet 立即锁住** |
| mobile | 3,043 / 68,420 = **4.4%** | 结构性偏低（RN 测试基础设施限制，UI 层不可测，spec 已记录）——标注"结构性基线" |
| scripts+root | 0 / 25,925 | 纯噪声（scripts/*.mjs 一次性工具），**必须排除出分母** |

## Background

- `openspec/changes/coverage-ratchet-gate/proposal.md`（任务来源）：与 lint baseline 建立前一模一样的结构性缺口（收集/可见/门禁三缺二）；"做完不留痕"系统性病的治疗样本——ratchet 强制"数字被看见"。
- **planning 实测新知（2026-11-20）**：`--root` 分包跑法不可用——`vitest run --root packages/core` 下 local-engine placeholder 2 用例失败（setupFiles './setup.ts' 相对新 root 解析失败 → react-native vi.mock 缺失 → 动态 require 平台检测路径变化），root config 正常跑全绿。**分包跑法必须用独立 config + `root: __dirname` + setupFiles 绝对路径**。
- core 的 vitest bin 链接损坏（11-19 已知坑），分包跑从 root cwd 用 `--config` 指定。

## Requirements

1. **R1 分母定义（前置）**：双包新增独立 coverage config（`vitest.coverage.config.ts`）——不改现有 root/packages 双 config（全量验收基线 2097 不动）：
   - `root: __dirname` + `setupFiles: [path.resolve(__dirname, '../../setup.ts')]`（绝对路径，规避 --root 解析坑）
   - `coverage.provider: 'v8'`；`include: ['src/**/*.{ts,tsx}']`；`exclude: ['src/**/*.test.*', '**/*.d.ts', 'dist/**', 'node_modules/**']`
   - mobile config 保留原 config 的 alias（react-native-shim + @egoless-do/core）
2. **R2 provider 依赖**：mobile 补 `@vitest/coverage-v8` devDep（^3.2.7 对齐 core；pnpm install 更新 lock 属正常依赖添加，非手编）
3. **R3 基线校准**：分包重跑取 vitest text 报告四口径（lines/branches/functions/statements）——**以 vitest 原生 text 报告为准**（clover metrics 口径混乱，proposal Notes 已记）；thresholds = 四口径实测
4. **R4 ratchet 门禁**：`coverage.thresholds` 设初始阈值=实测（允许等于，下降则 exit≠0）；mobile 标注"结构性基线"（spec 记录）；阈值上调=好（与 lint ratchet 方向相反），下调需理由
5. **R5 CI 可见性**：ci.yml test job 跑分包 coverage + `$GITHUB_STEP_SUMMARY` echo 关键数字（无第三方服务）。**生效验证与 ci-trigger-fix 同批等 CI 首跑**（触发修复已合入 4454d2b0，首跑待用户 push）
6. **R6 文档**：`.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` §9 扩为"质量门禁联动"（lint ratchet + coverage ratchet 并列，方向相反心智模型）

## Constraints

- 不动现有 `vitest.config.ts` ×3（root/packages/core/apps/mobile）——全量测试跑法与 2097 验收基线零影响
- 分包 coverage 跑法从 root cwd：`pnpm exec vitest run --coverage --config packages/core/vitest.coverage.config.ts`（同构 mobile）
- 阈值=实测起步，只升不降（下降 exit≠0）；上调阈值需 review（防刷分——ratchet 锁底线不奖高分）
- CI 改动静态正确即可验收（生效验证与 ci-trigger-fix 同批首跑，显式记录该边界）

## Out of scope

- 提升覆盖率本身（补测试是后续持续工作，ratchet 只锁底线）
- 合并 core+mobile 总覆盖率（故意分开）
- test-coverage-improvement 归档提案的 tasks 勾选（生命周期漂移，另行治理）
- coverage 检查进 CI 的**运行验证**（等首跑）
- root config projects/workspace 化（改变全量跑行为，风险大于收益）

## Acceptance Criteria

- [ ] AC1 双包 `vitest.coverage.config.ts` 落地（root:__dirname + setupFiles 绝对路径 + coverage 分母定义，mobile 保留 alias），分包跑 exit 0 且 core 全绿（--root artifact 不复现）
- [ ] AC2 mobile `@vitest/coverage-v8` devDep 补齐，mobile 分包 coverage 跑 exit 0
- [ ] AC3 分母排除 scripts 噪声：分包 text 报告的总量与 proposal 实测同量级（core ~18.7k / mobile ~68k statements），无 25,925 噪声块
- [ ] AC4 thresholds = 分包实测四口径；跑一次 exit 0（压线通过）；人为制造下降（临时降阈值不可行——改为验证：thresholds 数字 ≥ 实测，等值通过）验证门禁语义
- [ ] AC5 root 全量测试跑法不变且 2097/2097 绿（现有 config 零改动）
- [ ] AC6 ci.yml test job 加分包 coverage step + step summary echo（静态正确性；生效验证与 ci-trigger-fix 同批）
- [ ] AC7 GLOBAL-CODE-STANDARDS §9 扩为质量门禁联动（lint 只降 / coverage 只升，方向相反 + 阈值调整流程）
- [ ] AC8 type-check 0 error / 双包 lint 与 lint:complexity ratchet 不变（56/37）/ mobile lint ratchet 0
