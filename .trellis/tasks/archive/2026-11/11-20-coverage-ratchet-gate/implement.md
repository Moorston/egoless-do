# Implement — coverage-ratchet-gate

> 每 Phase 末尾的门禁（全部通过才进下一 Phase）：
> ```bash
> pnpm exec vitest run                       # root 全量 2097/2097（现有 config 零改动，AC5 哨兵）
> pnpm run type-check                        # 0 error
> pnpm exec eslint apps/mobile/src --ext .ts,.tsx --max-warnings 0
> ```
> 回滚点：每 Phase 独立可退。

## Phase 0 — 基线快照

- [x] 0.1 root 全量测试绿基线（2097/2097——首跑 4 红为 thought-trail daySpan 已知 flaky 波动，复跑两次全绿）
- [x] 0.2 `--root` 否决复现记录（local-engine placeholder 2 红的环境 artifact——planning 期实测，设计依据已进 design.md）

## Phase A — mobile provider 依赖（R2）

- [x] A1 `apps/mobile/package.json` devDeps 补 `@vitest/coverage-v8: ^3.2.7`（对齐 core）+ `test:coverage` 脚本
- [x] A2 `pnpm install`（15 包 added）+ root 全量 2097/2097 复验（首跑 1 红仍 flaky 波动，复跑全绿——install 幂等性哨兵 ✓）

## Phase B — 双包 coverage config（R1）+ 分包跑通

- [x] B1 `packages/core/vitest.coverage.config.ts`（root:__dirname + setupFiles 绝对路径 + coverage 分母定义）
- [x] B2 `apps/mobile/vitest.coverage.config.ts`（同构 + 逐字拷贝原 config 的 alias）
- [x] B3 分包跑通：core 826/826 全绿（local-engine placeholder 哨兵全绿 = setup 解析正确，--root artifact 不复现）；mobile 445/445 全绿
- [x] B4 分母验证：core 18,271 / mobile 68,345 statements（与 proposal 量级一致），无 scripts 噪声块 ✓

## Phase C — 基线校准 + thresholds（R3/R4）

- [x] C1 分包四口径实测：core 63.69/76.9/48.94/63.69；mobile 4.62/68.34/47.22/4.62（lines/branches/functions/statements）
- [x] C2 thresholds 实测填入：**只锁 statements/lines**（core 63.69 / mobile 4.62）——执行期设计修正：v8 provider all-mode 对未加载文件只有 statements 计数，branches/functions 分母随测试加载面漂移（mobile branches 68.34% 的分母仅 1,526 vs statements 68,345），锁它们会在良性测试覆盖扩张时分母突增误报；两口径仍进报告只是不设门禁。core 等值压线 exit 0 ✓
- [x] C3 门禁语义验证：core thresholds +1（64.69）→ exit 1 + `ERROR: Coverage for lines (63.69%) does not meet global threshold (64.69%)` → 还原实测值 ✓

## Phase D — CI 可见性（R5）

- [x] D1 ci.yml test job：分包 coverage 两 step 替换 verbose 跑法（或加 step）+ `$GITHUB_STEP_SUMMARY` echo 关键数字
- [x] D2 静态验收（YAML 语法目检）；生效验证与 ci-trigger-fix 同批（显式记录边界）

## Phase E — 文档 + 全量验收（R6）

- [x] E1 GLOBAL-CODE-STANDARDS §9 扩为"质量门禁联动"（lint/complexity 只降 + coverage 只升，方向相反 + 分母契约 + mobile 结构性基线标注 + 阈值调整流程）——顺带修复 §9 规则映射表丢失的表头行
- [x] E2 全量验收：AC 1-8 逐条核对；全量 2097/2097 / type-check 0 / 门禁链不回归（lint 0 + lint:complexity 56/37 exit 0）+ 双包 coverage 分包跑 exit 0（core 63.69 / mobile 4.62 等值压线）

## Phase F — 收尾（workflow Phase 3）

- [ ] F1 spec update（trellis-update-spec）
- [ ] F2 分批 commit：① build（devDep + 双 config + thresholds）② ci（ci.yml）③ docs（spec + 任务文件随 archive）
- [ ] F3 `openspec archive coverage-ratchet-gate --yes`
- [ ] F4 task archive + journal（finish-work）

## 已知坑（planning 期实测）

- **`--root` 分包跑法不可用**：setupFiles './setup.ts' 相对新 root 解析失败 → react-native vi.mock 缺失 → local-engine placeholder 2 用例红（root config 跑全绿）——分包 config 必须 root:__dirname + setupFiles 绝对路径
- core 的 vitest bin 链接损坏（11-19 已知）——分包跑从 root cwd 用 `--config`
- clover metrics 口径混乱——基线以 vitest text 报告四口径为准
- stack.md 记载 Vitest ^4.1.9 与 package.json 实况 ^3.2.7 漂移——以实况为准（本任务不治理该漂移）
- CI 首跑未发生（ci-trigger-fix 静态合入待首跑）——本任务 CI 改动同为静态验收，生效验证同批
