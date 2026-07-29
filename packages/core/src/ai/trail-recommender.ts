import { activeOnly } from '../utils';
// ─── AI Trail Recommender: RAG + 分批并发 ──────────────────────────
import type { AIResult, ModelConfig, AIMode } from './types';
import { getAIService } from './ai-service';
import { extractJSON } from './json-utils';
import { buildReflectionSummary } from '../business/trail-creation';
import type { MindReflection } from '../types/reflection';
import type { ReflectionIndex } from './rag/indexer';
import { buildIndex } from './rag/indexer';
import { retrieveTopK } from './rag/retriever';
import { buildRecommendPrompt, buildQueryParsePrompt } from './rag/prompt-builder';
import { AICache, generateCacheKey } from './rag/cache';
import { createLogger } from '../logger';

const log = createLogger('AI');

// ─── Types ───────────────────────────────────────────────────────────

export interface AIRecommendation {
  name: string;
  description: string;
  reflectionIndices: number[];
  confidence: number;
}

export interface AIMatchResult {
  reflectionIndex: number;
  reason: string;
  relevance: number;
}

export interface SmartQueryFilters {
  timeRange?: 'week' | 'month' | '3months' | 'all';
  tags?: string[];
  moods?: string[];
  keywords?: string[];
}

export interface SmartQueryResult {
  filters: SmartQueryFilters;
  intent: 'filter' | 'analyze' | 'explore';
  question: string | null;
  topic: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 15000;
const RAG_TOP_K = 5;
const BATCH_PROMPT_THRESHOLD = 400;
const BATCH_ITEM_SIZE = 5;

// ─── Caches ──────────────────────────────────────────────────────────

const recommendCache = new AICache<{ recommendations: AIRecommendation[]; targetReflections: ReflectionIndex[] }>(5 * 60 * 1000, 50);
const matchCache = new AICache<AIMatchResult[]>(5 * 60 * 1000, 50);
const queryCache = new AICache<SmartQueryResult>(5 * 60 * 1000, 50);
const semanticCache = new AICache<AIMatchResult[]>(5 * 60 * 1000, 50);

/** Clear all AI caches — call on user logout to prevent stale data leakage */
export function clearAICaches() {
  recommendCache.clear();
  matchCache.clear();
  queryCache.clear();
  semanticCache.clear();
}

// ─── System Prompts ──────────────────────────────────────────────────

const AI_RECOMMEND_SYSTEM = `思维脉络分析助手。从感念中发现有意义的思路链。
只输出JSON数组，不要任何解释或思考过程。
格式: [{"name":"简短名称","description":"一句话描述","reflectionIndices":[0,1],"confidence":0.8}]
reflectionIndices引用输入感念的序号。最多返回3条。`;

const AI_MATCH_SYSTEM = `语义搜索助手。从感念中找与查询意思相近的记录，不要求关键词匹配。
示例: "焦虑"≈"压力大睡不着", "开心"≈"心情不错", "工作"≈"项目deadline"
输出JSON: [{"reflectionIndex":0,"reason":"...","relevance":0.9}]`;

const AI_SMART_QUERY_SYSTEM = `思维脉络查询助手。分析用户查询意图，提取过滤条件。
输出JSON: {"filters":{"timeRange":"month","tags":[],"moods":[]},"intent":"filter","question":null,"topic":"..."}`;

const AI_SEMANTIC_SEARCH_SYSTEM = `语义搜索助手。从感念中找与查询意思相近的记录，不要求关键词匹配。
示例: "焦虑"≈"压力大睡不着", "开心"≈"心情不错", "工作"≈"项目deadline"
宁可多返回不要漏掉。输出JSON: [{"index":0,"reason":"...","relevance":0.9}]`;

// ─── AbortController wrapper ─────────────────────────────────────────

async function withAbortTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();

  if (externalSignal?.aborted) {
    throw new Error('Aborted');
  }
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort);
  }

  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    const result = await fn(controller.signal);
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('AI调用超时');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

// ─── 通用分批 AI 调用 ────────────────────────────────────────────────

interface BatchResult<T> {
  data: T;
  batchIdx: number;
}

/**
 * 通用分批 AI 调用。
 * 如果 prompt <= threshold，单次调用；否则按 batchSize 分批并发。
 * @returns 所有批次的原始 AI 返回字符串（按批次顺序）
 */
async function batchedAIGenerate(
  items: ReflectionIndex[],
  buildPrompt: (batch: ReflectionIndex[], batchIdx: number) => string,
  systemPrompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    batchSize?: number;
    promptThreshold?: number;
    signal?: AbortSignal;
  }
): Promise<Array<{ batchIdx: number; data: string }>> {
  const service = getAIService();
  const timeoutMs = options?.timeoutMs ?? AI_TIMEOUT_MS;
  const batchSize = options?.batchSize ?? BATCH_ITEM_SIZE;
  const threshold = options?.promptThreshold ?? BATCH_PROMPT_THRESHOLD;
  const maxTokens = options?.maxTokens ?? 400;
  const temperature = options?.temperature ?? 0.2;
  const externalSignal = options?.signal;

  // 检测是否需要分批
  const fullPrompt = buildPrompt(items, 0);
  const needBatch = fullPrompt.length > threshold && items.length > batchSize;

  if (!needBatch) {
    log.debug('[BatchAI] single call, prompt length:', fullPrompt.length);
    const result = await withAbortTimeout(
      (signal) => service.generateCloud(fullPrompt, {
        systemPrompt, maxTokens, temperature, signal,
      }),
      timeoutMs,
      externalSignal,
    );
    return result.success && result.data ? [{ batchIdx: 0, data: result.data }] : [];
  }

  // 分批并发
  const batches: ReflectionIndex[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  log.debug('[BatchAI] parallel batches:', batches.length, 'total items:', items.length);

  const promises = batches.map((batch, idx) => {
    const prompt = buildPrompt(batch, idx);
    log.debug(`[BatchAI] batch ${idx}, prompt:`, prompt.length, 'chars');
    return withAbortTimeout(
      (signal) => service.generateCloud(prompt, {
        systemPrompt, maxTokens, temperature, signal,
      }),
      timeoutMs,
      externalSignal,
    );
  });

  const results = await Promise.allSettled(promises);
  const outputs: Array<{ batchIdx: number; data: string }> = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      const val = r.value;
      if (val.success && val.data) {
        outputs.push({ batchIdx: i, data: val.data });
      } else {
        log.warn(`[BatchAI] batch ${i} failed:`, val.error);
      }
    } else {
      log.warn(`[BatchAI] batch ${i} error:`, r.reason);
    }
  }
  log.debug('[BatchAI] success batches:', outputs.length, '/', batches.length);
  return outputs;
}

// ─── AI Recommendation (RAG + 分批) ─────────────────────────────────

export async function recommendTrailsViaAI(
  reflections: MindReflection[],
  query?: string,
  options?: { signal?: AbortSignal },
): Promise<{ recommendations: AIRecommendation[]; targetReflections: ReflectionIndex[] }> {
  const service = getAIService();
  const config = service.getConfig();

  const emptyResult = { recommendations: [] as AIRecommendation[], targetReflections: [] as ReflectionIndex[] };
  if (config.mode === 'local' || !service.getDefaultModel()) {
    return emptyResult;
  }

  const validReflections = activeOnly(reflections);
  if (validReflections.length < 3) return emptyResult;

  const dataFingerprint = `${validReflections.length}:${Math.max(...validReflections.map(r => r.updatedAt ?? r.timestamp ?? 0))}`;
  const cacheKey = generateCacheKey(query || '', dataFingerprint);
  const cached = recommendCache.get(cacheKey);
  if (cached) return cached;

  const index = buildIndex(validReflections);
  const topK = retrieveTopK(query || '', index, RAG_TOP_K);

  const targetReflections = topK.length >= 3
    ? topK.map(s => s.index)
    : index.slice(0, RAG_TOP_K);

  try {
    const outputs = await batchedAIGenerate(
      targetReflections,
      (batch) => buildRecommendPrompt(query || '', batch),
      AI_RECOMMEND_SYSTEM,
      { maxTokens: 2000, temperature: 0.1, signal: options?.signal },
    );

    if (outputs.length === 0) return { recommendations: [], targetReflections };

    // 合并所有批次的推荐结果（修正批次索引偏移）
    const allParsed: AIRecommendation[] = [];
    for (const { batchIdx, data } of outputs) {
      const batchOffset = batchIdx * BATCH_ITEM_SIZE;
      const batchLen = Math.min(BATCH_ITEM_SIZE, targetReflections.length - batchOffset);
      const parsed = parseAIRecommendations(data, batchLen);
      for (const rec of parsed) {
        allParsed.push({
          ...rec,
          reflectionIndices: rec.reflectionIndices.map(i => batchOffset + i),
        });
      }
    }

    const result = { recommendations: allParsed.slice(0, 2), targetReflections };
    recommendCache.set(cacheKey, result);
    return result;
  } catch (e) {
    log.error(e, { context: '[RAG] recommendTrailsViaAI fallback' });
    return { recommendations: [], targetReflections };
  }
}

// ─── AI Matching (RAG + 分批) ────────────────────────────────────────

export async function matchReflectionsToTopic(
  reflections: MindReflection[],
  topic: string,
  options?: { signal?: AbortSignal },
): Promise<AIMatchResult[]> {
  const service = getAIService();
  const config = service.getConfig();

  if (config.mode === 'local' || !service.getDefaultModel()) {
    return [];
  }

  const validReflections = activeOnly(reflections);
  if (validReflections.length < 2) return [];

  const dataFingerprint = `${validReflections.length}:${Math.max(...validReflections.map(r => r.updatedAt ?? r.timestamp ?? 0))}`;
  const cacheKey = generateCacheKey(topic, dataFingerprint);
  const cached = matchCache.get(cacheKey);
  if (cached) return cached;

  const index = buildIndex(validReflections);
  const topK = retrieveTopK(topic, index, RAG_TOP_K);

  const targetReflections = topK.length >= 2
    ? topK.map(s => s.index)
    : index.slice(0, RAG_TOP_K);

  try {
    const outputs = await batchedAIGenerate(
      targetReflections,
      (batch) => buildRecommendPrompt(topic, batch),
      AI_MATCH_SYSTEM,
      { maxTokens: 500, temperature: 0.3, signal: options?.signal },
    );

    if (outputs.length === 0) return [];

    const allParsed: AIMatchResult[] = [];
    for (const { batchIdx, data } of outputs) {
      const batchOffset = batchIdx * BATCH_ITEM_SIZE;
      const batchLen = Math.min(BATCH_ITEM_SIZE, targetReflections.length - batchOffset);
      const parsed = parseAIMatchResults(data, batchLen);
      for (const m of parsed) {
        allParsed.push({
          reflectionIndex: batchOffset + m.reflectionIndex,
          reason: m.reason,
          relevance: m.relevance,
        });
      }
    }

    matchCache.set(cacheKey, allParsed);
    return allParsed;
  } catch (e) {
    log.error(e, { context: '[RAG] matchReflectionsToTopic fallback' });
    return [];
  }
}

// ─── Semantic Search (分批并发) ──────────────────────────────────────

const SEMANTIC_TOP_K = 15;

export async function semanticSearchReflections(
  reflections: MindReflection[],
  query: string,
  options?: { signal?: AbortSignal },
): Promise<AIMatchResult[]> {
  const service = getAIService();
  const config = service.getConfig();

  log.debug('[SemanticSearch] query:', query, 'mode:', config.mode, 'defaultModel:', service.getDefaultModel()?.id ?? 'none');

  if (config.mode === 'local' || !service.getDefaultModel()) {
    log.debug('[SemanticSearch] skip: no cloud config');
    return [];
  }

  const validReflections = activeOnly(reflections);
  if (validReflections.length < 2) return [];

  const dataFingerprint = `${validReflections.length}:${Math.max(...validReflections.map(r => r.updatedAt ?? r.timestamp ?? 0))}`;
  const cacheKey = generateCacheKey(`semantic:${query}`, dataFingerprint);
  const cached = semanticCache.get(cacheKey);
  if (cached) return cached;

  const index = buildIndex(validReflections);
  const topK = retrieveTopK(query, index, SEMANTIC_TOP_K);
  log.debug('[SemanticSearch] RAG topK:', topK.length);

  const targetReflections = topK.length >= 5
    ? topK.map(s => s.index)
    : index.slice(0, SEMANTIC_TOP_K);

  try {
    const outputs = await batchedAIGenerate(
      targetReflections,
      (batch, batchIdx) => {
        const reflLines = batch
          .map((r, i) => {
            const content = r.content.length > 60 ? r.content.slice(0, 60) + '...' : r.content;
            const mood = r.mood ? ` ${r.mood}` : '';
            return `[${i}]${mood} ${content}`;
          })
          .join('\n');
        return `查询: "${query}"\n感念:\n${reflLines}\n找出语义相近的，返回JSON: [{"index":0,"reason":"...","relevance":0.9}]`;
      },
      AI_SEMANTIC_SEARCH_SYSTEM,
      { maxTokens: 300, temperature: 0.2, timeoutMs: 12000, batchSize: 5, promptThreshold: 400, signal: options?.signal },
    );

    if (outputs.length === 0) return [];

    // 汇总并修正批次索引偏移
    const allMatches: AIMatchResult[] = [];
    for (const { batchIdx, data } of outputs) {
      const batchOffset = batchIdx * BATCH_ITEM_SIZE;
      const batchLen = Math.min(BATCH_ITEM_SIZE, targetReflections.length - batchOffset);
      const parsed = parseAIMatchResults(data, batchLen);
      for (const m of parsed) {
        allMatches.push({
          reflectionIndex: batchOffset + m.reflectionIndex,
          reason: m.reason,
          relevance: m.relevance,
        });
      }
    }

    log.debug('[SemanticSearch] total matches:', allMatches.length);
    semanticCache.set(cacheKey, allMatches);
    return allMatches;
  } catch (e) {
    log.error(e, { context: '[SemanticSearch] exception' });
    return [];
  }
}

// ─── Smart Query ─────────────────────────────────────────────────────

const FALLBACK_RESULT: SmartQueryResult = {
  filters: {},
  intent: 'filter',
  question: null,
  topic: '',
};

export async function parseSmartQuery(
  reflections: MindReflection[],
  input: string,
  history?: string[],
  options?: { signal?: AbortSignal },
): Promise<SmartQueryResult> {
  const service = getAIService();
  const config = service.getConfig();
  const defaultModel = service.getDefaultModel();

  if (config.mode === 'local' || !defaultModel) {
    return { ...FALLBACK_RESULT, topic: input };
  }

  const validReflections = activeOnly(reflections);
  if (validReflections.length < 2) {
    return { ...FALLBACK_RESULT, topic: input };
  }

  const dataFingerprint = `${validReflections.length}:${Math.max(...validReflections.map(r => r.updatedAt ?? r.timestamp ?? 0))}`;
  const cacheKey = generateCacheKey(input, dataFingerprint);
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const index = buildIndex(validReflections);
  const topK = retrieveTopK(input, index, RAG_TOP_K);

  const targetReflections = topK.length >= 2
    ? topK.map(s => s.index)
    : index.slice(0, RAG_TOP_K);

  const prompt = buildQueryParsePrompt(input, targetReflections, history);

  try {
    const result: AIResult<string> = await withAbortTimeout(
      (signal) => service.generateCloud(prompt, {
        systemPrompt: AI_SMART_QUERY_SYSTEM,
        maxTokens: 500,
        temperature: 0.3,
        signal,
      }),
      AI_TIMEOUT_MS,
      options?.signal,
    );

    if (!result?.success || !result?.data) {
      return { ...FALLBACK_RESULT, topic: input };
    }

    const parsed = parseSmartQueryResult(result.data, input);
    queryCache.set(cacheKey, parsed);
    return parsed;
  } catch (e) {
    log.error(e, { context: '[SmartQuery] exception' });
    return { ...FALLBACK_RESULT, topic: input };
  }
}

// ─── Availability check ──────────────────────────────────────────────

export function isAIRecommendAvailable(): boolean {
  try {
    const service = getAIService();
    const cfg = service.getConfig();
    return cfg.mode !== 'local' && service.getDefaultModel() !== null;
  } catch {
    return false;
  }
}

// ─── Parsers ─────────────────────────────────────────────────────────

function parseAIRecommendations(raw: string, maxIndex: number): AIRecommendation[] {
  try {
    const jsonStr = extractJSON(raw);
    const arr: unknown = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];

    return (arr as Array<Record<string, unknown>>)
      .filter((item) =>
        item.name && item.description && Array.isArray(item.reflectionIndices)
      )
      .map((item) => ({
        name: String(item.name),
        description: String(item.description),
        reflectionIndices: (item.reflectionIndices as number[])
          .filter((i: number) => i >= 0 && i < maxIndex),
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      }))
      .filter(r => r.reflectionIndices.length >= 2)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function parseAIMatchResults(raw: string, maxIndex: number): AIMatchResult[] {
  try {
    const jsonStr = extractJSON(raw);
    const arr: unknown = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];

    return (arr as Array<Record<string, unknown>>)
      .filter((item) =>
        typeof item.reflectionIndex === 'number' && item.reason
      )
      .map((item) => ({
        reflectionIndex: item.reflectionIndex as number,
        reason: String(item.reason),
        relevance: typeof item.relevance === 'number' ? item.relevance : 0.5,
      }))
      .filter(r => r.reflectionIndex >= 0 && r.reflectionIndex < maxIndex)
      .sort((a, b) => b.relevance - a.relevance);
  } catch {
    return [];
  }
}

function parseSmartQueryResult(raw: string, input: string): SmartQueryResult {
  try {
    const jsonStr = extractJSON(raw);
    const obj: Record<string, unknown> = JSON.parse(jsonStr) as Record<string, unknown>;

    const validTimeRanges = ['week', 'month', '3months', 'all'];
    const validIntents = ['filter', 'analyze', 'explore'];

    const filters: SmartQueryFilters = {};
    if (obj.filters) {
      const filtersObj = obj.filters as Record<string, unknown>;
      if (filtersObj.timeRange && validTimeRanges.includes(filtersObj.timeRange as string)) {
        filters.timeRange = filtersObj.timeRange as SmartQueryFilters['timeRange'];
      }
      if (Array.isArray(filtersObj.tags)) {
        filters.tags = filtersObj.tags.filter((t: unknown) => typeof t === 'string');
      }
      if (Array.isArray(filtersObj.moods)) {
        filters.moods = filtersObj.moods.filter((m: unknown) => typeof m === 'string');
      }
      if (Array.isArray(filtersObj.keywords)) {
        filters.keywords = filtersObj.keywords.filter((k: unknown) => typeof k === 'string');
      }
    }

    const intent = validIntents.includes(obj.intent as string) ? obj.intent as SmartQueryResult['intent'] : 'filter';
    const question = typeof obj.question === 'string' ? obj.question : null;
    const topic = typeof obj.topic === 'string' ? obj.topic : input;

    return { filters, intent, question, topic };
  } catch {
    return { ...FALLBACK_RESULT, topic: input };
  }
}
