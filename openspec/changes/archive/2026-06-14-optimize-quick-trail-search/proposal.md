## Why

快速创建脉络的检索管线存在架构问题：AI 语义搜索无视用户筛选条件、排序不使用 RAG 多维评分、多处死代码（parseSmartQuery/SmartQueryBubble/FilterTags 从未被调用）、缓存 key 包含全量 reflection ID 导致频繁失效。用户体验上，搜索结果可能包含筛选范围外的感念、AI 降级无感知、无搜索历史。

## What Changes

- **检索管线重构为三阶段**: Phase 1 RAG 本地多维评分 → Phase 2 不足时 AI 意图理解(parseSmartQuery) → Phase 3 仍不足时全量语义扩展
- **候选池统一**: Phase 1 尊重筛选条件(candidates)；Phase 3 突破筛选但标记 source='extended'，排序在后
- **排序融合**: 用 RAG retrieveTopK 的多维评分替代二值匹配；direct 结果用 ragScore，extended 结果用 aiRelevance × 0.5 降权
- **缓存 key 改进**: 用 query + count + latestTimestamp 替代全量 reflection IDs
- **重新整合 parseSmartQuery**: 结果不足时调用，返回 question 时展示 SmartQueryBubble 追问
- **删除重复实现**: 移除屏幕内 extractEmotionalContext，复用 RAG SYNONYM_MAP
- **清理未用导入**: matchReflectionsToTopic
- **交互改善**: AI 降级持久指示、结果分页(每页20条)、搜索历史(最近5条)、硬编码中文改 T()

## 非目标

- 不修改 AI 模型配置或切换模型
- 不改变 CreateThoughtTrailModal（简单模态框保持现状）
- 不改动 RAG 索引构建逻辑（extractKeywords 分词暂不优化）
- 不增加虚拟列表（数据量暂不需要）

## Capabilities

### New Capabilities
- `trail-search-pipeline`: 三阶段检索管线（RAG 本地 → 意图理解 → 语义扩展），含候选池策略、排序融合、分页

### Modified Capabilities
- `rag-retrieval`: 导出 expandTerms/SYNONYM_MAP 供外部使用；缓存 key 策略改为 query+count+latestTimestamp
- `smart-query-integration`: 重新整合到检索管线，parseSmartQuery 在结果不足时触发，SmartQueryBubble 展示追问

## Impact

- **平台**: 仅 mobile（QuickCreateTrailScreen）
- **文件**:
  - `apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx` — 主要重构
  - `apps/mobile/src/features/reflections/SmartQueryBubble.tsx` — 可能微调
  - `apps/mobile/src/features/reflections/FilterTags.tsx` — 可能微调
  - `packages/core/src/ai/rag/retriever.ts` — 导出 SYNONYM_MAP
  - `packages/core/src/ai/rag/cache.ts` — 缓存 key 策略
  - `packages/core/src/ai/trail-recommender.ts` — semanticSearchReflections 返回类型可能调整
  - `packages/core/src/business/trail-creation.ts` — matchByKeyword 可能改为用 RAG 评分
