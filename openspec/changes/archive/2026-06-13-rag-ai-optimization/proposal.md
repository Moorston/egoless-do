## Why

当前思维脉络页面的 AI 推荐和智能查询功能响应极慢（30-120 秒），失败率高（~50%），用户体验严重受损。根本原因是每次 AI 调用都发送全量感念数据（30 条，~3000 字符），导致 prompt 过长、模型处理缓慢。需要通过 RAG（检索增强生成）架构，将 AI 调用从"全量发送"改为"检索优先"，实现秒级响应。

## What Changes

- **新增本地检索模块**：在 `packages/core/src/ai/rag/` 下实现本地感念索引和检索，基于关键词、情绪、时间、标签等多维评分，筛选 Top-5 相关感念
- **优化 Prompt 构建**：将 AI 输入从 30 条感念缩减为 5 条精选感念 + 查询上下文，prompt 长度从 ~3000 字符降至 ~500 字符
- **新增结果缓存层**：对 AI 推荐和查询结果进行本地缓存，相同输入直接返回缓存结果
- **超时与降级机制**：AI 调用设置 10 秒超时，超时后自动降级为本地算法结果
- **优化模型参数**：使用更轻量的模型配置（max_tokens: 500, temperature: 0.3），提升响应速度

**非目标**：
- 不改变现有 UI 交互和页面布局
- 不引入新的外部依赖（向量数据库等）
- 不修改 PocketBase 后端架构

## Capabilities

### New Capabilities
- `rag-retrieval`: 本地感念检索与评分模块，支持关键词、情绪、时间、标签多维匹配
- `rag-prompt-builder`: RAG 增强的 prompt 构建器，将检索结果组装为精简 AI 输入
- `ai-response-cache`: AI 推荐/查询结果的本地缓存层，支持 TTL 和失效策略

### Modified Capabilities
- `hybrid-recommendation`: 推荐引擎接入 RAG 检索层，替换全量数据发送
- `smart-query-integration`: 智能查询接入 RAG 检索层，优化查询响应速度

## Impact

**受影响的代码**：
- `packages/core/src/ai/trail-recommender.ts` — 推荐生成逻辑重构
- `packages/core/src/ai/rag/` — 新增模块（indexer.ts, retriever.ts, prompt-builder.ts, cache.ts）
- `apps/mobile/src/features/reflections/MindTrailScreen.tsx` — 调用方式适配
- `apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx` — 智能查询调用适配

**性能预期**：
- 响应时间：30-120s → 2-5s（降低 90%+）
- 成功率：~50% → ~90%+
- Prompt 大小：~3000 字符 → ~500 字符（降低 83%）

**平台影响**：仅 Mobile（AI 调用在移动端触发）
