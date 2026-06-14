## 1. Core 层改造 (packages/core)

- [x] 1.1 `packages/core/src/ai/rag/retriever.ts` — 导出 `expandTerms` 和 `SYNONYM_MAP`，供 QuickCreateTrailScreen 使用
- [x] 1.2 `packages/core/src/ai/rag/cache.ts` — 修改 `generateCacheKey` 签名，支持 `dataFingerprint: string` 参数替代 `reflectionIds: string[]`
- [x] 1.3 `packages/core/src/ai/trail-recommender.ts` — `semanticSearchReflections` 内部调用改为使用数据指纹 `query|count:latestTimestamp` 作为 cacheKey
- [x] 1.4 `packages/core/src/ai/rag/retriever.ts` — `retrieveTopK` 返回类型增加 `score` 字段导出（ScoredReflection 已有 score，确认外部可访问）
- [x] 1.5 `packages/core/src/index.ts` — 确认新增导出 (`expandTerms`, `SYNONYM_MAP`) 可从 `@egoless-do/core` 访问

## 2. 检索管线重构 (QuickCreateTrailScreen)

- [x] 2.1 删除屏幕内 `extractEmotionalContext` 函数和 `EMOTION_KEYWORDS` 常量（32-50行），清理相关 import
- [x] 2.2 删除未用导入: `matchReflectionsToTopic`、`parseSmartQuery`（从旧位置移除，后续在新位置重新导入）
- [x] 2.3 重构 `handleSmartQuery` 为三阶段管线:
  - Phase 1: 调用 `retrieveTopK(query, buildIndex(candidates), k=20)` 获取带 score 的结果
  - Phase 2: 结果 <= 3 条时调用 `parseSmartQuery`，处理 question/topic/filters 三种返回
  - Phase 3: 仍不足时调用 `semanticSearchReflections`，标记 extended
- [x] 2.4 实现统一排序: direct 结果按 `ragScore` 降序，extended 结果按 `aiRelevance × 0.5` 降序，direct 优先
- [x] 2.5 修改 `handleLocalSearch`（1字符查询）也使用 `retrieveTopK` 替代 `matchByKeyword`

## 3. SmartQueryBubble 整合

- [x] 3.1 在 `handleSmartQuery` Phase 2 中，当 `parseSmartQuery` 返回 `question` 时设置 `smartResult` 状态，触发 SmartQueryBubble 渲染
- [x] 3.2 当 `parseSmartQuery` 返回 `filters` 时，渲染 `FilterTags` 组件
- [x] 3.3 `handleSmartAnswer` 回调改为带 chatHistory 重跑整个三阶段管线
- [x] 3.4 确认 SmartQueryBubble 的 skip 按钮跳过追问后直接进 Phase 3

## 4. 缓存策略改进

- [x] 4.1 `generateCacheKey` 新签名: `(query: string, dataFingerprint: string) => string`
- [x] 4.2 `semanticSearchReflections` 内部调用改为 `generateCacheKey('semantic:' + query, reflections.length + ':' + (reflections[0]?.timestamp ?? 0))`
- [x] 4.3 确认旧缓存 key 格式不再使用，避免缓存污染

## 5. 结果分页

- [x] 5.1 添加分页状态: `page: number`, `pageSize: number = 20`
- [x] 5.2 结果列表渲染改为 `matchResults.slice(0, page * pageSize)`
- [x] 5.3 滚动到底部时触发加载下一页（onEndReached 或 ScrollView onScroll）

## 6. 搜索历史

- [x] 6.1 添加搜索历史状态管理: `searchHistory: string[]`，从 AsyncStorage 读取/写入
- [x] 6.2 搜索成功后将查询词加入历史（去重，最多 5 条）
- [x] 6.3 在 InsightPanel 附近展示搜索历史（水平 chip 列表），点击填入搜索框
- [x] 6.4 搜索历史 key: `quickTrailSearchHistory`

## 7. AI 降级指示

- [x] 7.1 添加降级状态: `aiDegraded: boolean`
- [x] 7.2 Phase 3 AI 调用失败时设置 `aiDegraded = true`
- [x] 7.3 在结果列表上方显示持久降级提示（不随 AIAnalysisStream 消失）
- [x] 7.4 新搜索开始时重置 `aiDegraded = false`

## 8. 国际化

- [x] 8.1 将硬编码中文替换为 T() 调用: "本地关键词匹配"、"AI 理解查询语义"、"AI 语义相似搜索"、"情绪维度匹配"、"合并排序结果"、"全选"、"取消全选"、"仅选未分配" 等
- [x] 8.2 新增翻译 key 到 i18n 文件（zh/en）
