## 1. RAG 检索模块

- [x] 1.1 创建 `packages/core/src/ai/rag/` 目录结构，添加 index.ts 导出文件
- [x] 1.2 实现 `indexer.ts` — 感念索引构建，提取关键词、情绪、标签、时间特征
- [x] 1.3 实现 `retriever.ts` — 多维评分检索算法（关键词40% + 情绪20% + 时间20% + 标签20%），支持 Top-K 返回
- [x] 1.4 实现 `retriever.ts` 的 `matchByKeyword` 增强 — 复用现有逻辑并添加评分权重

## 2. Prompt 构建模块

- [x] 2.1 实现 `prompt-builder.ts` — `buildRecommendPrompt()` 函数，将 Top-5 感念格式化为精简 prompt（~500 字符）
- [x] 2.2 实现 `prompt-builder.ts` — `buildQueryParsePrompt()` 函数，构建查询意图解析 prompt
- [x] 2.3 实现 `prompt-builder.ts` — `formatReflectionSummary()` 函数，感念摘要格式化（日期 + 情绪 + 内容截断 + 标签）

## 3. 缓存模块

- [x] 3.1 实现 `cache.ts` — 内存缓存类，支持 TTL（默认 5 分钟）和容量限制（50 条）
- [x] 3.2 实现 `cache.ts` — 缓存键生成函数（SHA-256 哈希，取前 16 位）
- [x] 3.3 实现 `cache.ts` — LRU 淘汰策略，缓存满时淘汰最旧条目

## 4. AI 调用层重构

- [x] 4.1 重构 `trail-recommender.ts` — `computeHybridRecommendations()` 接入 RAG 检索层，替换全量数据发送
- [x] 4.2 重构 `trail-recommender.ts` — 添加 10 秒超时控制和降级逻辑（超时返回本地算法结果）
- [x] 4.3 重构 `trail-recommender.ts` — `parseSmartQuery()` 接入 RAG 检索层，优化查询解析
- [x] 4.4 优化 `cloud-providers.ts` — 传递 max_tokens=500 和 temperature=0.3 参数

## 5. 集成测试

- [x] 5.1 验证推荐流程：本地检索 → Prompt 构建 → AI 调用 → 缓存 → 返回结果
- [x] 5.2 验证降级流程：AI 超时 → 自动降级 → 返回本地算法结果
- [x] 5.3 验证缓存流程：首次调用 → 缓存写入 → 重复调用 → 缓存命中
- [x] 5.4 验证智能查询：自然语言查询 → RAG 检索 → AI 解析 → 筛选结果
