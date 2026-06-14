## Context

QuickCreateTrailScreen 当前的检索管线存在架构问题：

- **候选池不一致**: Round 1 用 `candidates`（尊重筛选），Round 3/4 用全量 `reflections`
- **排序粗糙**: 最终排序用二值关键词匹配（0/1），不用 RAG 的多维评分
- **死代码**: `parseSmartQuery`、`SmartQueryBubble`、`FilterTags` 导入但从未在搜索流程中调用
- **重复实现**: 屏幕内 `extractEmotionalContext`（6类）与 RAG `SYNONYM_MAP`（12+8类）功能重叠
- **缓存脆弱**: `generateCacheKey(query, allIds)` 中新增一条感念就全部失效

当前管线: `matchByKeyword(candidates) → semanticSearch(all) → extractEmotionalContext(all) → 二值排序`

## Goals / Non-Goals

**Goals:**
- 三阶段检索管线: RAG 本地 → 意图理解 → 语义扩展
- 所有阶段统一使用 RAG 多维评分排序
- AI 语义扩展结果可突破筛选条件，但标记并排在后面
- 重新整合 parseSmartQuery + SmartQueryBubble
- 缓存 key 不因新增感念而全部失效

**Non-Goals:**
- 不优化 RAG 索引的中文分词（extractKeywords 暂不改）
- 不改动 CreateThoughtTrailModal
- 不增加虚拟列表
- 不切换 AI 模型

## Decisions

### D1: 三阶段检索管线

将 `handleSmartQuery` 重构为三阶段:

```
Phase 1: RAG 本地检索 (candidates)
  retrieveTopK(query, buildIndex(candidates), k=20)
  → ScoredReflection[] (带 ragScore)

Phase 2: 意图理解 (仅当 Phase 1 结果 <= 3 条)
  parseSmartQuery(reflections, query, chatHistory)
  → 有 question: 展示 SmartQueryBubble，等用户回答后重跑
  → 有 topic/filters: 用新条件重跑 Phase 1
  → 都没有: 进 Phase 3

Phase 3: 语义扩展 (仅当 Phase 1+2 结果仍 <= 3 条)
  semanticSearchReflections(reflections, query)
  → 标记 source='extended'，排序在后
```

**为什么不并行执行 Phase 1 和 Phase 3**: Phase 3 需要调用 AI，有网络开销和 token 成本。如果 Phase 1 已经找到足够结果，不应浪费 AI 调用。

**阈值选择 <= 3 条**: 对于"创建脉络"场景，1-2 条结果不够用户选择。3 条是最低可用数量。

### D2: 候选池策略

- Phase 1: 使用 `candidates`（受时间/标签/心情筛选）
- Phase 2: 使用全量 `reflections`（意图理解需要全局视角）
- Phase 3: 使用全量 `reflections`（语义扩展的目的就是突破筛选）

extended 结果在 UI 上不做特殊标记（避免视觉噪音），仅通过排序位置区分。

### D3: 排序融合

替换当前的二值排序（`includes` 检查），改用 RAG 多维评分:

```typescript
// direct 结果 (来自 Phase 1/2)
finalScore = ragScore  // 0~1, 由 retrieveTopK 计算

// extended 结果 (来自 Phase 3)
finalScore = aiRelevance × 0.5  // 降权，确保排在 direct 之后

// 排序: direct 按 finalScore 降序 → extended 按 finalScore 降序
```

**为什么降权系数是 0.5**: extended 结果最高分 0.5 低于 direct 的最低有效分（retrieveTopK 的 score > 0.035 即可入选），确保 direct 优先但不会把 extended 压得太低。

**替代方案考虑**: 用 `aiRelevance - 0.5` 做偏移，但会导致低相关度 extended 结果变为负分，不如乘法直观。

### D4: 缓存 key 策略

```typescript
// 旧: 包含所有 reflection IDs
generateCacheKey(query, reflections.map(r => r.id))
// 新: 数据指纹
generateCacheKey(query, `${reflections.length}:${reflections[0]?.timestamp ?? 0}`)
```

新增感念时 count 和 latestTimestamp 变化，旧缓存自然失效。但不同 query 的缓存互不影响，同一 query 在数据未变时可以复用。

### D5: 重新整合 parseSmartQuery

`parseSmartQuery` 在 Phase 2 被调用，作为"结果不足时的意图理解":

1. Phase 1 结果 <= 3 条时触发
2. 如果返回 `question` → 展示 SmartQueryBubble，用户回答后带 chatHistory 重跑整个流程
3. 如果返回 `topic` 或 `filters` → 用新条件重跑 Phase 1
4. 如果都没返回 → 进 Phase 3

`FilterTags` 组件在 parseSmartQuery 返回 filters 时展示，允许用户移除 AI 推断的筛选条件。

### D6: 删除 extractEmotionalContext

屏幕内的情绪关键词提取（6类）与 RAG retriever 的 SYNONYM_MAP（12+8类）功能重叠。Phase 1 使用 `retrieveTopK` 后，情绪匹配已经通过 RAG 的 `calcMoodScore` 和 `calcSynonymScore` 处理，不需要单独的情绪搜索 Round。

### D7: 缓存 key 策略改进对 semanticSearchReflections 的影响

`semanticSearchReflections` 内部也有自己的缓存（`semanticCache`）。需要同步修改其 `generateCacheKey` 调用，使用相同的数据指纹策略。

## Risks / Trade-offs

**[R1] Phase 2 增加延迟** — `parseSmartQuery` 需要 AI 调用，在网络慢时会增加等待时间。
→ 缓解: 仅在 Phase 1 结果不足时触发；设置 10s 超时降级为本地搜索。

**[R2] SmartQueryBubble 打断用户流程** — 追问可能让用户觉得啰嗦。
→ 缓解: 最多追问 1 轮（chatHistory < 3）；用户可以跳过追问。

**[R3] extended 结果可能误导用户** — 突破筛选条件的结果可能让用户困惑为什么会出现。
→ 缓解: 通过排序位置（在后面）自然区分；如果 extended 结果为 0，不显示任何额外提示。

**[R4] RAG 评分与 AI relevance 量纲不一致** — ragScore 和 aiRelevance 是不同算法产出的分数，直接混排可能不公平。
→ 缓解: 用分区排序（direct 一组，extended 一组），不在两个分数之间直接比较。
