# Design — 拆分 useQuickTrailSearch

## 架构与边界

```
┌─────────────────────────────────────────────────────────────┐
│ QuickCreateTrailScreen.tsx:85                               │
│   const { 25 字段 } = useQuickTrailSearch(refs, text, T)   │
│   （不改动 — 返回契约不变）                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ 组合
┌──────────────────────▼──────────────────────────────────────┐
│ useQuickTrailSearch.ts (主 hook, ≤150 行)                   │
│   组合 4 个子 hook，组装返回对象                             │
│   依赖注入：子 hook 之间通过参数传递，不重复读 store          │
└──┬──────────┬──────────┬──────────┬────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌─────────┐┌──────────┐┌──────────┐┌──────────┐
│useTrail ││useTrail  ││useTrail  ││useTrail  │
│Filters  ││Results  ││AIAnalysis││Selection │
│         ││          ││          ││          │
│过滤器状态││结果状态  ││AI 分析流  ││选择+分页  │
│+派生    ││+防抖搜索 ││+三阶段管线││+派生     │
└─────────┘└──────────┘└──────────┘└──────────┘
```

## 子 hook 职责与状态分配

### A. useTrailFilters — 过滤器层（无外部依赖）

**State**: `searchQuery`, `timeRange`, `selectedTags`, `selectedMoods`

**Derived**: `reflectionsMap`, `userTags`, `userMoods`, `aiAvailable`, `filters` (TrailFilters), `candidates`

**Actions**: `setSearchQuery`, `setTimeRange`, `setSelectedTags`, `setSelectedMoods`, `toggleTag`, `toggleMood`, `handleRemoveFilter`, `resetFilters`

**参数**: `(reflections: MindReflection[])`

**注意**: `handleRemoveFilter` 当前同时改 `selectedTags` 和 `smartResult`（第 99-106 行）。拆分后 `smartResult` 属于 Results 层，`handleRemoveFilter` 不能直接改它。解决方案见下方"跨层耦合处理"。

### B. useTrailResults — 结果层

**State**: `matchMode`, `matchResults`, `smartResult`, `aiDegraded`

**Derived**: 无（candidates 来自 Filters 层注入）

**Actions**: `handleLocalSearch`, `handleClear`, `setSmartResult`

**参数**: `(candidates: MindReflection[], searchQuery: string, filters: TrailFilters, addToHistory: (q: string) => void)`

**包含**: 防抖搜索 useEffect（第 124-140 行）

**注意**: `handleLocalSearch` 依赖 `searchQuery` 和 `candidates`（来自 Filters 层），需通过参数注入。

### C. useTrailAIAnalysis — AI 分析流

**State**: `isAnalyzing`, `analysisSteps`, `isSmartParsing`, `isAISearching`, `chatHistory`

**Refs**: `analyzingTimerRef`, `chatHistoryRef`

**Actions**: `handleSmartQuery`, `handleAISearch`, `handleSmartAnswer`, `updateStep`

**Derived**: `searchHistory`（来自 `useSearchHistory`）

**参数**: `(reflections, filters, candidates, searchQuery, matchResults, matchMode, aiAvailable, T, setMatchResults, setMatchMode, setSmartResult, setAiDegraded, setPage, addToHistory)`

**这是最重的子 hook**，因为三阶段管线需要读写多个其他层的状态。参数多但职责单一。

### D. useTrailSelection — 选择 + 分页

**State**: `selectedIds`, `trailName`, `page`

**Derived**: `selectedReflections`, `selectedMoodsList`, `selectedDateRange`

**Actions**: `setSelectedIds`, `setTrailName`, `setPage`

**参数**: `(reflectionsMap: Map<string, MindReflection>)`

## 跨层耦合处理

### 耦合点 1: handleRemoveFilter 改 smartResult

当前代码（第 91-107 行）：`handleRemoveFilter` 同时改 `selectedTags`/`selectedMoods`/`timeRange` 和 `smartResult.filters`。

**方案**: `handleRemoveFilter` 留在 Filters 层，只改自己的 state。对 `smartResult` 的清理改为：Filters 层暴露 `onFilterRemoved` 回调，主 hook 把 Results 层的 `setSmartResult` 接上。或更简单：`handleRemoveFilter` 返回被移除的 filter 信息，主 hook 协调调用 Results 层的清理。

**推荐（最简）**: Filters 层的 `handleRemoveFilter(type, value)` 只改自己的 state；Results 层新增 `clearSmartFilters(type, value)` 方法。主 hook 包装：`handleRemoveFilter = (type, value) => { filters.handleRemoveFilter(type, value); results.clearSmartFilters(type, value); }`。

### 耦合点 2: handleSmartAnswer 调用 handleSmartQuery

`handleSmartAnswer`（第 409-417 行）内部调用 `handleSmartQuery`。两者同属 AI 层，无跨层问题。

### 耦合点 3: handleAISearch 读 matchResults

`handleAISearch`（第 342-407 行）读 `matchResults` 作为起点。通过参数注入 `matchResults`。但 `matchResults` 变化会触发 `handleAISearch` 的 useCallback 依赖——这是已有行为，保持不变（已有 eslint-disable）。

### 耦合点 4: handleClear 跨 4 层

`handleClear`（第 419-427 行）改 `searchQuery`（Filters）、`matchMode`/`matchResults`/`smartResult`/`aiDegraded`（Results）、`page`（Selection）。

**方案**: 主 hook 组装：`handleClear = () => { filters.resetQuery(); results.reset(); selection.resetPage(); }`。各子 hook 暴露自己的 reset 方法。

### 耦合点 5: resetFilters 跨层

`resetFilters`（第 453-460 行）改 `searchQuery`/`timeRange`/`selectedTags`/`selectedMoods`（Filters）和 `matchMode`/`matchResults`（Results）。

**方案**: 同 handleClear，主 hook 组合调用。

## 返回契约（不变）

主 hook 返回对象 25 字段，与现有完全一致：

```typescript
return {
  // Filters 层
  searchQuery, setSearchQuery, timeRange, setTimeRange,
  selectedTags, setSelectedTags, toggleTag,
  selectedMoods, setSelectedMoods, toggleMood,
  // Results 层
  matchMode, matchResults, smartResult, setSmartResult, aiDegraded,
  // AI 层
  analysisSteps, isAnalyzing, isSmartParsing, isAISearching,
  chatHistory, setChatHistory, searchHistory,
  handleSmartQuery, handleAISearch, handleSmartAnswer,
  // Selection 层
  selectedIds, setSelectedIds, trailName, setTrailName,
  page, setPage, selectedReflections, selectedMoodsList, selectedDateRange,
  // Filters 层派生
  reflectionsMap, userTags, userMoods, aiAvailable, candidates, filters,
  // 常量
  PAGE_SIZE,
  // 跨层 actions
  handleLocalSearch, handleRemoveFilter, handleClear, resetFilters, addToHistory,
};
```

## 兼容性

- `QuickCreateTrailScreen.tsx` 不改动（返回契约不变）
- `hooks/index.ts:6` re-export 不改动
- `searchPipeline.ts` 继续被 AI 层调用
- `useSearchHistory` 继续被 AI 层调用
- `useQuickTrailSearch.test.ts` 通过 `renderHook` 测试，组合后行为不变

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 跨层 actions 的依赖数组写错导致无限渲染 | 保持与原 hook 相同的 eslint-disable 策略，行为不变 |
| 子 hook 参数过多（AI 层 ~12 参数） | 可选：传单个 context 对象。但参数多不违反职责单一，保持显式参数更易测试 |
| handleRemoveFilter 拆分后行为不一致 | 主 hook 组合调用，单元测试覆盖 |
| 防抖 useEffect 移到 Results 层后 candidates 依赖断裂 | candidates 通过参数注入，useEffect 依赖数组保持 `[searchQuery, candidates]` |

## 行数预算

| 文件 | 预算 | 依据 |
|------|------|------|
| `useQuickTrailSearch.ts` | ≤150 | 组合 + 返回对象组装 |
| `useTrailFilters.ts` | ≤120 | 4 state + 6 derived + 4 actions |
| `useTrailResults.ts` | ≤100 | 4 state + 防抖 + 3 actions |
| `useTrailAIAnalysis.ts` | ≤150 | 5 state + 2 ref + 4 actions + 三阶段管线（最重） |
| `useTrailSelection.ts` | ≤80 | 3 state + 3 derived + 3 actions |

## 技术决策

- **不引入 context 对象**: 子 hook 参数保持显式，便于单元测试和类型检查
- **不移动文件**: 子 hook 放在同一目录 `hooks/`
- **不改变 useSearchHistory 调用位置**: 留在 AI 层（它是搜索历史，语义属于 AI 搜索）
- **保持 eslint-disable 注释**: exhaustive-deps 警告是已有技术债，拆分不改变行为就不改变注释
