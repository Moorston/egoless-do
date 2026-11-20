# complexity-ratchet 实施：ReviewAIPanel 拆分 + 豁免注解 + 双包 ratchet 制度化

## Goal

complexity ≤15 团队约定从"写在纸上"变为可执行门禁：ReviewAIPanel 真拆分 + PlanCreateScreen 豁免注解 + 双包 `lint:complexity` ratchet 脚本（阈值=实测起步只降不升）。

**实测（2026-11-20 planning 复测，③ sync-engine-complexity 合入后）**：

| 项 | proposal(11-19) | 今日实测 |
|----|----------------|---------|
| mobile complexity warning 总数 | 61 | **59**（SyncEngine executePull/runSync 已退出） |
| ReviewAIPanel 主函数 | 41 | **41** ✓ |
| PlanBasicInfoCard | 22 | **22** ✓ |
| PlanItemEditor | 30 | **30** ✓ |
| core | 34（39 = 34 + 5 no-unsafe 残差） | 沿用 proposal 数（无 core 改动合入） |

预计 ④ 完成后 mobile ratchet 起步 = 59 − 1（ReviewAIPanel 拆分退出）− 2（豁免注解不报）= **56**。

## Background

- `openspec/changes/complexity-ratchet/proposal.md`（任务来源）：8 屏拆分验收 6/8 达标但显式检查从未跑过——lint ratchet=0 的"全绿"不覆盖 complexity 维度，又一个"标准写在纸上"实例。
- 三个超标函数性质各异：ReviewAIPanel 是真拆分（两个同构 tab 平行宇宙）；PlanCreateScreen 两个是表单固有分支（字段错误显隐 ×N + frequency 5-mode union 切换），presentational 豁免条款适用。
- 拆分行内躺着真实违规：4 处 `as` 影子类型（权威定义本有字段）+ 4 处硬编码中文（planning 补充发现 2 处漏列：'AI 分析' ×2 处、SegmentBar ['洞察','复盘思路']）。

## Requirements

1. **R1 ReviewAIPanel 拆分（策略 C 延续，零行为变更）**：主函数 41 → ≤15。
   - `AiResultTab` 参数化三态机（loading→骨架 / cache→内容 / 无→生成按钮），洞察与复盘两个 tab 共用
   - 段落差异通过 `sections: { label, items, itemStyle }[]` 显式参数化（itemStyle: 'prose' | 'bullet' | 'text' | 'card' 覆盖 4 种渲染形态）
   - sections 构建抽为模块级纯函数（buildInsightSections / buildReviewSections）
   - `SkeletonBlock`：两处骨架屏合一（widths + labelKey）
   - `PanelHeader`：折叠态预览三元链 + chevron 随迁
2. **R2 顺带修复（拆分行内真实违规）**：
   - 删 4 处 `(reviewCache as { perspectives?... questions?... })` 强转——`TrailReviewCache` 权威定义（thought-trail.ts:16）本有 `perspectives: string[]`（必填）与 `questions?: string[]`；删后保留 `??` 链做旧数据运行时防御
   - 硬编码中文全部 i18n 化（6 处文案 = proposal 4 处 + planning 补充 2 处）：已有洞察（可能已过期）/复盘思路（section label）/建议/已有复盘（可能已过期）/AI 分析（×2）/SegmentBar 洞察——新 key 5 个 + 复用 `trailReviewQuestions`（SegmentBar 第二段与 section label 同文案）
3. **R3 PlanCreateScreen 豁免注解**：PlanBasicInfoCard / PlanItemEditor 加 `// eslint-disable-next-line complexity` + 理由注释（presentational 表单固有分支，quality-guidelines 豁免条款）。
4. **R4 双包 lint:complexity ratchet 制度化**：独立 eslint config 文件（`.eslintrc.complexity.js` extends 主 config + `complexity: ['warn', 15]`，避开 npm script 内联 --rule 的 Windows 引号问题）；mobile 阈值 = B1 完成后实测（预计 56）、core = 39（34 complexity + 5 no-unsafe 残差）；只降不升。
5. **R5 spec 记录**：quality-guidelines "Lint Ratchet" 章节扩为 lint + complexity 双 ratchet；presentational 豁免机制（注解 + 理由 + 登记位置）成文。

## Constraints

- **零行为变更**（拆分部分）：样式、控制流、事件语义逐字保留——bulletText vs contentText 等样式差异通过 itemStyle 显式区分，不"顺手统一"。
- mobile lint ratchet = 0：新代码零 warning。
- i18n 三语字典（zh / en / zh-Hant）同步新增，types.ts 同步。
- 豁免注解只在 `lint:complexity` 下生效（主 lint 未启用 complexity，注解对主 lint 是 no-op）——机制成立依赖双脚本并存，spec 写清。
- 不动 ReviewAIPanel 之外的 reflections 文件；不治理 core 34 个存量（ratchet 只锁不降）。

## Out of scope

- core 34 个存量超标治理（ratchet 锁定，后续逐波）
- SyncEngine 54/41/27（③ 已完成：54→37 豁免 / 41→≤15 / 27→≤15）
- PlanItemEditor 的 weekly_fixed/monthly_fixed 同构圆钮组抽取（DayChipGroup，锦上添花）
- complexity 检查进 CI（依赖 ci-trigger-fix 合入）
- E2 新发现的 sync 域其他超标（applyEntityToTable 37 / rehydrateFromDb 30 / mergeSyncPatch 26 / _handleEvent 18）

## Acceptance Criteria

- [ ] AC1 ReviewAIPanel 主函数 complexity ≤15（`--rule '{"complexity": ["warn", 15]}'` 显式检查）
- [ ] AC2 AiResultTab / SkeletonBlock / PanelHeader / buildXxxSections 各自 ≤15
- [ ] AC3 拆分零行为变更：`reviewCache as {...}` 4 处强转删除（`??` 链保留）；样式差异逐字保留（keyPoints=bulletText、observations=contentText、perspectives=卡片）
- [ ] AC4 ReviewAIPanel 文件内硬编码用户可见中文清零（含 planning 补充的 'AI 分析' ×2 与 SegmentBar 段名）；新 i18n key 5 个进 types.ts + zh/en/zh-Hant 三语字典
- [ ] AC5 PlanBasicInfoCard / PlanItemEditor 有豁免注解 + 理由注释，且显式 complexity 检查不再报这两个函数
- [ ] AC6 双包 `lint:complexity` 脚本落地：独立 config 文件 ×2 + package.json 脚本 ×2，阈值 = 完成后实测（mobile 预计 56 / core 39），退出码 0
- [ ] AC7 全量测试绿（`pnpm exec vitest run`）+ `pnpm run type-check` 0 error + `pnpm run lint` exit 0（mobile ratchet 0 不变）
- [ ] AC8 quality-guidelines.md 双 ratchet 章节成文：lint ratchet（只降不升）+ complexity ratchet（同构，方向相反于 coverage）+ 豁免机制（注解+理由+登记位置）
