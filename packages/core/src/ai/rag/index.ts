// ─── RAG 检索增强生成模块 ──────────────────────────────────────
export { buildIndex, type ReflectionIndex } from './indexer';
export { retrieveTopK, expandTerms, SYNONYM_MAP, type ScoredReflection } from './retriever';
export { buildRecommendPrompt, buildQueryParsePrompt, formatReflectionSummary } from './prompt-builder';
export { AICache, generateCacheKey } from './cache';
