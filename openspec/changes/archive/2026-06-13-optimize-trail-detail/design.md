## Context

当前 `ThoughtTrailDetailScreen` (515 行) 是全 app 最重的页面之一，存在多个层面问题：

- **运行时崩溃**: `AIService.getInstance()` 不存在（AI 洞察和复盘功能不可用）
- **性能**: `useAppStore()` 全量订阅，任何 store 变化都重渲染全页 8 个 useMemo
- **代码质量**: AI 生成逻辑的感念/笔记过滤重复，文件过大
- **体验**: FAB 无动画、AI 加载无骨架屏、无取消机制、无下拉刷新

本次设计覆盖 7 个维度，技术方案按"先修崩溃、再优性能、后提体验"的顺序推进。

## Goals / Non-Goals

**Goals:**
- 修复 AI 洞察运行时崩溃
- 消除全量 store 订阅导致的不必要重渲染
- 提取复用逻辑，降低代码重复
- 增强 AI 交互（可取消、自动展开、缓存过期检测）
- 提升交互细节（动画、骨架屏、滑动删除、内联编辑、下拉刷新）
- Timeline 大数据量时使用虚拟化列表

**Non-Goals:**
- 不改变后端 API / PocketBase 数据模型
- 不涉及 packages/core 的业务逻辑重写（仅修复导入方式）
- 不做跨平台 web 适配（本次仅 mobile）

## Decisions

### D1. 代码拆分策略：hooks 而非组件化

当前页面 515 行，拆分方向有两种选择：

| 方案 | 方式 | 优点 | 缺点 |
|------|------|------|------|
| A: 拆子组件 | 将 Section 级别的逻辑再细分 | 符合 React 习惯 | Props drilling 增加，子组件仍需访问 store |
| B: **拆 hooks** | 提取 `useTrailData` `useTrailAI` `useTrailActions` | 保持组件树扁平，逻辑可复用 | 新文件较多 |

**选择 B**: 因为当前页面已经将渲染委托给子组件（InsightSection 等），主要问题是数据聚合和 AI 生成逻辑冗余。hooks 能直接解决。

```
ThoughtTrailDetailScreen (主编排)
├── useTrailData(trailId)
│   ├── trail, overview, timelineItems, links
│   ├── relatedTrails, planItems, planCheckins
│   └── trailReflections, trailNotes (过滤后)
├── useTrailAI(trailId, trailReflections, trailNotes)
│   ├── handleGenerateInsight (含 AbortController)
│   ├── handleGenerateReview (含 AbortController)
│   └── isCacheValid (基于 lastModified)
└── useTrailActions(trailId, store actions)
    ├── handleEdit / handleDelete
    ├── handleWriteNote / handleSelectReflection
    └── handleCreatePlan / handleNavigate
```

### D2. Store 订阅策略：颗粒选择器

**当前**: `const store = useAppStore()` — 全量订阅

**改为**:
```typescript
const thoughtTrails = useAppStore(s => s.thoughtTrails);
const reflections = useAppStore(s => s.reflections);
const trailNotes = useAppStore(s => s.trailNotes);
const reflectionLinks = useAppStore(s => s.reflectionLinks);
const planItems = useAppStore(s => s.planItems);
const planItemCheckins = useAppStore(s => s.planItemCheckins);
const aiMode = useAppStore(s => s.aiMode);
```

Zustand 的 selector 使用 `===` 比较，只有当选中 slice 的引用变化时才会触发重渲染。其他 slice 的更新不影响此页面。

### D3. Timeline 虚拟化策略

**当前**: `<ScrollView>` 渲染全部 timeline items。当感念 > 50 条时明显卡顿。

**改为**: 使用 `@shopify/flash-list` (Expo 推荐的高性能 FlatList 替代品)。只对 items.length > 30 时启用虚拟化，小列表保持 ScrollView（避免虚拟化开销倒挂）。

### D4. AI 取消机制

复用 `trail-recommender.ts` 的 signal 传播模式：

```typescript
// useTrailAI.ts
const aiAbortRef = useRef<AbortController | null>(null);

const handleGenerateInsight = useCallback(async () => {
  // 取消上一次请求
  if (aiAbortRef.current) aiAbortRef.current.abort();
  
  const controller = new AbortController();
  aiAbortRef.current = controller;
  
  try {
    const result = await aiService.generateTrailInsight(
      reflections,
      { useCloud, trailNotes, signal: controller.signal }
    );
    if (controller.signal.aborted) return;
    store.setInsightCache(trailId, cache);
  } finally {
    if (aiAbortRef.current === controller) aiAbortRef.current = null;
  }
}, [...]);

// 清理
useEffect(() => {
  return () => aiAbortRef.current?.abort();
}, []);
```

### D5. FAB 动画

使用 `Animated.spring` 实现弹簧动画。当前 `Animated` 已 import 但未使用。

```
闭合:                         展开:
   ┌──────┐                    🤔 写笔记
   │  +   │                    📋 选择已有
   └──────┘                    📝 写感念
                                  ┌──────┐
                                  │  ✕   │
                                  └──────┘
  (旋转 0°)                    (旋转 45° → ✕)
```

### D6. 缓存失效检测

当前 insightCache/reviewCache 存储在 trail 对象上，但不会随新感念/笔记自动失效。

方案：在 `useTrailData` 中记录 `lastModified`（trail.reflectionIds 和 noteIds 的最后变更时间），与 `cache.generatedAt` 比较。

```typescript
const isCacheStale = insightCache && (
  !insightCache.generatedAt ||
  lastModified > insightCache.generatedAt
);
```

## Risks / Trade-offs

- **[风险] useAppStore 改为颗粒选择器后，如果一个 effect 需要多个 store slice，需要在组件中声明多个 selector** → 使用工具函数 `useMultipleStore` 或保持在 7-8 个 selector 以内（可接受）
- **[风险] FlashList 在小列表时性能不如 ScrollView** → 设置动态阈值，仅 > 30 项时使用
- **[风险] 代码拆分后 props 传递变复杂** → hooks 返回值直接解构使用，无需额外 props
- **[风险] 缓存失效检测可能过于敏感** → 设置最小间隔（5 分钟），避免频繁重新生成
