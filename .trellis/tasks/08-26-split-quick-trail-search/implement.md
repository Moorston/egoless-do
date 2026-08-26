# Implement — 拆分 useQuickTrailSearch

## 执行清单（有序）

### Phase 1: 创建无依赖的子 hook

从叶子节点开始，先建无跨层依赖的子 hook。

- [ ] 1.1 创建 `useTrailSelection.ts` — 最独立
  - State: `selectedIds`, `trailName`, `page`
  - Derived: `selectedReflections`, `selectedMoodsList`, `selectedDateRange`
  - 参数: `(reflectionsMap: Map<string, MindReflection>)`
  - 返回: `selectedIds, setSelectedIds, trailName, setTrailName, page, setPage, selectedReflections, selectedMoodsList, selectedDateRange, resetPage`
  - 源码参考: 第 60-64, 143-161 行

- [ ] 1.2 创建 `useTrailFilters.ts` — 无外部依赖
  - State: `searchQuery`, `timeRange`, `selectedTags`, `selectedMoods`
  - Derived: `reflectionsMap`, `userTags`, `userMoods`, `aiAvailable`, `filters`, `candidates`
  - Actions: `toggleTag`, `toggleMood`, `handleRemoveFilter`（仅改自己 state）, `resetFilters`（仅改自己 state）, `resetQuery`
  - 参数: `(reflections: MindReflection[], initialText: string)`
  - 源码参考: 第 39-119, 189-209 行

### Phase 2: 创建有依赖的子 hook

- [ ] 2.1 创建 `useTrailResults.ts` — 依赖 candidates/searchQuery
  - State: `matchMode`, `matchResults`, `smartResult`, `aiDegraded`
  - 防抖搜索 useEffect（第 124-140 行）— 依赖 `[searchQuery, candidates]`
  - Actions: `handleLocalSearch`, `handleClear`, `setSmartResult`, `clearSmartFilters(type, value)`, `reset`
  - 参数: `(candidates, searchQuery, filters, addToHistory)`
  - 注意: `handleLocalSearch` 的依赖是 `searchQuery, candidates, addToHistory`（第 226 行）

- [ ] 2.2 创建 `useTrailAIAnalysis.ts` — 最重，依赖最多
  - State: `isAnalyzing`, `analysisSteps`, `isSmartParsing`, `isAISearching`, `chatHistory`
  - Refs: `analyzingTimerRef`, `chatHistoryRef`
  - 调用 `useSearchHistory()` 获取 `searchHistory, addToHistory`
  - Actions: `handleSmartQuery`, `handleAISearch`, `handleSmartAnswer`, `updateStep`
  - 参数: `(reflections, filters, candidates, searchQuery, matchResults, aiAvailable, T, setters: { setMatchResults, setMatchMode, setSmartResult, setAiDegraded, setPage })`
  - 源码参考: 第 32-37, 46-52, 163-186, 228-417 行
  - 注意: 保持原有 eslint-disable 注释（行为不变）

### Phase 3: 重写主 hook

- [ ] 3.1 重写 `useQuickTrailSearch.ts` — 组合 4 个子 hook
  - 参数不变: `(reflections, initialText, T, _aiConfig?)`
  - 组合调用:
    ```typescript
    const filters = useTrailFilters(reflections, initialText);
    const selection = useTrailSelection(filters.reflectionsMap);
    const results = useTrailResults(filters.candidates, filters.searchQuery, filters.filters, aiAnalysis.addToHistory);
    const aiAnalysis = useTrailAIAnalysis(reflections, filters.filters, filters.candidates, filters.searchQuery, results.matchResults, filters.aiAvailable, T, { setMatchResults: results.setMatchResults, setMatchMode: results.setMatchMode, setSmartResult: results.setSmartResult, setAiDegraded: results.setAiDegraded, setPage: selection.setPage });
    ```
  - 注意循环依赖：Results 需要 `addToHistory`（来自 AI 层），AI 层需要 `matchResults`（来自 Results 层）。**这是真实的循环**。
  - **解决方案**: `useSearchHistory()` 提到主 hook，`addToHistory` 传给 Results 和 AI 层。AI 层不再自己调 `useSearchHistory`，而是接收 `searchHistory, addToHistory` 作参数。
  - 组装跨层 actions:
    - `handleRemoveFilter = (type, value) => { filters.handleRemoveFilter(type, value); results.clearSmartFilters(type, value); }`
    - `handleClear = () => { filters.resetQuery(); results.reset(); selection.resetPage(); }`
    - `resetFilters = () => { filters.resetFilters(); results.resetMatchState(); }`
  - 返回 25 字段对象（契约不变）

### Phase 4: 验证

- [ ] 4.1 `pnpm run type-check` — 0 错误
- [ ] 4.2 `pnpm run test` — `useQuickTrailSearch.test.ts` 全通过
- [ ] 4.3 行数验证: `wc -l` 主 hook ≤ 150, 子 hook 各 ≤ 预算
- [ ] 4.4 `QuickCreateTrailScreen.tsx` 未改动（`git diff` 确认）
- [ ] 4.5 ESLint 对新文件 0 新增 warning

## 验证命令

```bash
pnpm run type-check
pnpm run test
wc -l apps/mobile/src/features/reflections/hooks/useQuickTrailSearch.ts apps/mobile/src/features/reflections/hooks/useTrailFilters.ts apps/mobile/src/features/reflections/hooks/useTrailResults.ts apps/mobile/src/features/reflections/hooks/useTrailAIAnalysis.ts apps/mobile/src/features/reflections/hooks/useTrailSelection.ts
git diff --name-only apps/mobile/src/features/reflections/screens/QuickCreateTrailScreen.tsx  # 应为空
```

## 风险点 / 回滚边界

| 风险 | 回滚 |
|------|------|
| 循环依赖（Results ↔ AI 层都需 addToHistory） | `useSearchHistory` 提到主 hook，注入两方 |
| useCallback 依赖数组写错导致渲染风暴 | 保持原 eslint-disable，行为不变 |
| 子 hook 参数过多导致类型推导失败 | 显式标注参数类型 |
| `handleSmartAnswer` → `handleSmartQuery` 闭包引用断裂 | 两者同在 AI 层，无问题 |
| 防抖 useEffect 依赖 candidates 断裂 | candidates 从 Filters 注入，依赖数组不变 |

## 关键文件

- `apps/mobile/src/features/reflections/hooks/useQuickTrailSearch.ts` — 重写（主 hook）
- `apps/mobile/src/features/reflections/hooks/useTrailFilters.ts` — 新建
- `apps/mobile/src/features/reflections/hooks/useTrailResults.ts` — 新建
- `apps/mobile/src/features/reflections/hooks/useTrailAIAnalysis.ts` — 新建
- `apps/mobile/src/features/reflections/hooks/useTrailSelection.ts` — 新建
- `apps/mobile/src/features/reflections/hooks/useQuickTrailSearch.test.ts` — 不改（验证通过即可）
- `apps/mobile/src/features/reflections/screens/QuickCreateTrailScreen.tsx` — 不改

## 执行顺序图

```
Phase 1 (叶子)        Phase 2 (依赖)      Phase 3 (组合)     Phase 4 (验证)
─────────────         ─────────────       ─────────────      ─────────────
useTrailSelection ──┐                    
                     ├─→ useTrailResults ──→                    
useTrailFilters ────┤   useTrailAIAnalysis ──→ useQuickTrailSearch ──→ 验证
                     │                        (主 hook 组合)
                     └────────────────────────→
```

先建无依赖的，再建有依赖的，最后组合主 hook。
