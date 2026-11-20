# Implement — complexity-ratchet

> 每 Phase 末尾的门禁（全部通过才进下一 Phase）：
> ```bash
> pnpm exec vitest run                       # 全量（根目录 workspace）
> pnpm run type-check                        # 0 error
> pnpm exec eslint apps/mobile/src --ext .ts,.tsx --max-warnings 0
> pnpm exec eslint apps/mobile/src/features/reflections/trails/ReviewAIPanel.tsx --rule '{"complexity": ["warn", 15]}'
> ```
> 回滚点：每 Phase 独立可退；无测试文件先行（策略 C 无测试保守拆分）。

## Phase 0 — 基线快照

- [x] 0.1 全量测试绿基线（2097/2097）
- [x] 0.2 complexity 实测快照：mobile 59 / ReviewAIPanel 41 / PlanBasicInfoCard 22 / PlanItemEditor 30（planning 已测，Phase 0 复确认）

## Phase A — i18n key 新增（R2 前置，独立可验）

- [x] A1 types.ts trail 段 + zh/en/zh-Hant 三语字典新增 5 key（trailAIAnalysis / trailInsightTab / trailInsightStale / trailReviewStale / trailReviewSuggestions），按 design key 表逐字填入（types.ts:484-488 + 三语字典 :554-558）
- [x] A2 type-check 0 error（三语字典漏填 = 编译红）

## Phase B — ReviewAIPanel 拆分（R1 + R2，零行为变更）

- [x] B1 顺带修复先行（独立小步）：删 4 处 `as` 强转（保留 `??` 链 + 防御注释 buildReviewSections:208）；6 处硬编码中文 → T()（含 'AI 分析' ×2 与 SegmentBar，grep 复查清零）
- [x] B2 抽 `SkeletonBlock`（widths + labelKey 参数化，两处骨架屏合一）
- [x] B3 抽 `buildInsightSections` / `buildReviewSections` 模块级纯函数（构建时过滤空 section；summary 恒非空注释）
- [x] B4 抽 `AiResultTab`（三态机 + TabSection 渲染）+ `SectionItem`（itemStyle 4 态映射——agent 合理添加，单条渲染独立）
- [x] B5 抽 `PanelHeader`（折叠态预览三元链 + chevron）
- [x] B6 门禁全绿：两文件显式 complexity 检查零输出；type-check 0 error；lint ratchet 0；全量 2097/2097 绿

## Phase C — PlanCreateScreen 豁免注解（R3）

- [x] C1 PlanBasicInfoCard / PlanItemEditor 加 `// eslint-disable-next-line complexity` + 理由注释（presentational 表单固有分支）
- [x] C2 显式检查不再报这两个函数；主 lint ratchet 0 不变

## Phase D — 双包 lint:complexity ratchet（R4）

- [x] D1 `apps/mobile/.eslintrc.complexity.js` + `packages/core/.eslintrc.complexity.js`（extends 主 config + complexity: ['warn', 15]）
- [x] D2 双包 package.json 加 `lint:complexity` 脚本；mobile 阈值实测 56（= 预计分毫不差）+ core **37**（实测校准：32 complexity + 5 no-unsafe，proposal 预估 39 偏差 2，config 注释已记录）
- [x] D3 双脚本 exit 0；`pnpm --filter mobile lint:complexity`（56 压线）+ `pnpm --filter @egoless-do/core lint:complexity`（37 压线）实跑验证

## Phase E — spec 记录 + 全量验收（R5）

- [x] E1 quality-guidelines "Lint Ratchet" 章节扩为双 ratchet（lint 只降不升 / complexity 同构、与 coverage 方向相反、双包阈值表）；presentational 豁免注解机制成文（注解 + 理由 + 登记清单 PlanBasicInfoCard 22 / PlanItemEditor 30 + 与 risk-tier 豁免的区别）
- [x] E2 全量验收：AC 1-8 逐条核对；全量 2097/2097 绿 / type-check 0 error / lint ratchet 0 / 双包 lint:complexity exit 0（56/37 压线）

## Phase F — 收尾（workflow Phase 3）

- [x] F1 spec update（trellis-update-spec）——Phase E1 即 spec 落地（quality-guidelines 双 ratchet + 豁免注解机制）
- [x] F2 分批 commit：① refactor（020ca795：ReviewAIPanel + PlanCreateScreen + i18n ×4）② build（1c0c7963：双包 config + 脚本）③ docs（e9a139e9：spec 双 ratchet 章节）
- [ ] F3 `openspec archive complexity-ratchet --yes`
- [ ] F4 task archive + journal（finish-work）

> **check 偏离记录**：trellis-check agent 派发后被 API 限流终止（429，本任务 sub-agent 第三次被限流），复核由主会话执行——原版全文与拆分版均在主会话上下文，逐项核对表（EmptyState/PanelFooter/SkeletonBlock/sections 映射/stale 行/as 强转/PanelHeader/SegmentBar/hooks/styles）全部等价；门禁复现（type-check/lint ratchet/双包 lint:complexity/显式 complexity）全绿。

## 已知坑（planning 期预判 + 执行期实测补充）

- `eslint-disable-next-line complexity` 对主 lint 是 no-op（规则未启用，ESLint 8.57 默认不报 unused disable）——只在 lint:complexity 下生效，机制成立依赖双脚本并存
- npm script 内联 `--rule` 有 Windows 引号问题——独立 config 文件是跨平台正解（proposal Notes 已验证）
- itemStyle 的 'bullet' vs 'text' 差异是 bulletText.marginLeft: 4——两 tab 混用是历史现状，不统一（零行为变更）
- mobile lint ratchet=0：新代码（含 config/脚本文件）零 warning
- **执行期实测**：RN 内联字面量 `width: '80%'` 抽成参数后必须用 `DimensionValue` 类型（宽 `string` 不兼容 `ViewStyle.width` 的 `DimensionValue`）——SkeletonBlock 与 AiResultTabProps 两处同步改
- **core 阈值实测 37 而非预估 39**：complexity 存量 32（proposal 11-19 测 34，偏差 2，其间 core 无改动——差异或来自当时测量方式）；ratchet 阈值=实测起步原则下取 37，config 注释记录偏差
- **grep 统计 eslint 输出的坑**：`grep -c complexity` 会把 Message（"has a complexity of N"）与 ruleId 各计一次——用 rule 精确分组或 JSON format
- **implement agent 两次被 API 限流终止**（429 tpm/rpm）：第二次在 SkeletonBlock 写入中途被杀，留下 `width: string` 类型半成品（type-check 红）——主会话收尾修复 DimensionValue；其余拆分（i18n/豁免注解/主函数）均完整落地

