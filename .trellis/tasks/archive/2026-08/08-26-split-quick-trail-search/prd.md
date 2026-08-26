# 拆分 useQuickTrailSearch — 436 行单体 hook 降复杂度

## Goal

将 436 行、圈复杂度≈19 的单体 hook `useQuickTrailSearch` 拆分为多个职责单一的小 hook，主 hook 降至 ≤150 行，保持对外返回契约不变。

## Background

代码审查发现 `useQuickTrailSearch` 是全项目最复杂的单体函数：
- 436 行（26→462）
- 8+ 个 useState（searchQuery, timeRange, selectedTags, selectedMoods, smartResult, chatHistory, isAnalyzing, analysisSteps, isSmartParsing, matchMode, matchResults, aiDegraded, selectedIds, trailName, page, isAISearching）
- 多个 useMemo + useCallback 嵌套
- 圈复杂度估算 19（决策点）

职责混杂：搜索过滤 + AI 分析流 + 分页 + 选择管理，本应是 4 个独立 hook。

注意：`searchPipeline.ts` 已提取了部分纯函数（"Extracted from useQuickTrailSearch for testability"），说明拆分工作已起步，但 hook 本体未拆。

## 确认事实

- 唯一调用方：`QuickCreateTrailScreen.tsx:85`，解构约 25 个返回字段
- 导出路径：`hooks/index.ts:6` re-export
- 已有测试：`useQuickTrailSearch.test.ts`（unit 测试，使用 renderHook）
- 已有纯函数提取：`searchPipeline.ts`（搜索管线纯逻辑）

## Requirements

### R1: 按职责拆分为子 hook

拆分为 4 个职责单一的 hook：

| 子 hook | 职责 | 包含的 state |
|---------|------|-------------|
| `useTrailFilters` | 搜索过滤状态 | searchQuery, timeRange, selectedTags, selectedMoods, filters, candidates, userTags, userMoods, handleRemoveFilter, toggleTag, toggleMood, resetFilters |
| `useTrailAIAnalysis` | AI 分析流 | isAnalyzing, analysisSteps, isSmartParsing, smartResult, isAISearching, aiDegraded, handleSmartQuery, handleAISearch, handleSmartAnswer, runAIPhase2/3 |
| `useTrailSelection` | 选择管理 | selectedIds, selectedReflections, trailName, handleLocalSearch |
| `useTrailPagination` | 分页 | page, setPage, PAGE_SIZE |

主 hook `useQuickTrailSearch` 组合这 4 个，保持返回对象 25 个字段不变。

### R2: 返回契约不变

`QuickCreateTrailScreen.tsx:85` 的解构不动——主 hook 返回对象的字段名和结构完全不变。

### R3: 测试不破坏

现有 `useQuickTrailSearch.test.ts` 继续通过。拆分后可补子 hook 的独立测试，但不强制。

## Acceptance Criteria

- [ ] AC1: `useQuickTrailSearch.ts` 主 hook ≤ 150 行
- [ ] AC2: 4 个子 hook 各 ≤ 120 行
- [ ] AC3: `QuickCreateTrailScreen.tsx` 不改动（返回契约不变）
- [ ] AC4: `useQuickTrailSearch.test.ts` 现有测试全部通过
- [ ] AC5: `pnpm run type-check` 0 错误
- [ ] AC6: `pnpm run test` 全通过

## Technical Notes

- 子 hook 放在同一目录 `apps/mobile/src/features/reflections/hooks/`
- 子 hook 之间通过参数传递依赖（如 `useTrailAIAnalysis` 需要 `filters` 和 `reflections`），不在子 hook 内重复读 store
- `searchPipeline.ts` 已有纯函数继续复用，子 hook 调用它们

## Out of Scope

- 历史页数据流修复（见兄弟任务 `08-26-history-pages-persist-fix`）
- `generateSuggestions`（102 行）复杂度改善
