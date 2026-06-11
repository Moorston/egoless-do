// ─── AI Trail Recommender: cloud-based recommendation + matching ───
import { getAIService } from './ai-service';
import { buildReflectionSummary } from '../business/trail-creation';
import type { MindReflection } from '../types/reflection';

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

// ─── Prompts ─────────────────────────────────────────────────────────

const AI_RECOMMEND_SYSTEM = `你是思维脉络分析助手。你的任务是从用户的反思记录中发现有意义的思路链。
要求：
- 每条链包含 3-6 条感念（用序号引用，从0开始）
- 链内感念应有叙事连贯性（时间线+情绪变化）
- 避免过于宽泛的分组（如"所有焦虑的感念"）
- 给出链的名称和一句话解释
- 输出JSON数组格式: [{"name":"...","description":"...","reflectionIndices":[0,1,2],"confidence":0.8}]`;

const AI_MATCH_SYSTEM = `你是思维脉络分析助手。用户会描述一个想追踪的主题，你需要从反思记录中找到相关的感念。
要求：
- 返回相关感念的序号（从0开始）
- 给出每条感念的匹配理由
- 按相关度排序
- 输出JSON格式: [{"reflectionIndex":0,"reason":"...","relevance":0.9}]`;

// ─── AI Recommendation ───────────────────────────────────────────────

export async function recommendTrailsViaAI(
  reflections: MindReflection[],
  query?: string,
): Promise<AIRecommendation[]> {
  const service = getAIService();
  const config = service.getConfig();

  if (config.mode === 'local' || !service.getDefaultModel()) {
    return [];
  }

  // Limit to 30 most recent for token efficiency
  const limited = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  if (limited.length < 3) return [];

  const summaries = limited.map(r => buildReflectionSummary(r));
  const list = summaries.map((s, i) => `[${i}] ${s}`).join('\n');
  const queryPart = query ? `\n\n用户想追踪的主题: "${query}"` : '';

  const prompt = `以下是用户的反思记录：\n${list}${queryPart}\n\n请发现 2-3 条有意义的思路链。`;

  try {
    const result = await (service as any).generateCloud(prompt, {
      systemPrompt: AI_RECOMMEND_SYSTEM,
    });

    if (!result?.success || !result?.data) return [];

    return parseAIRecommendations(result.data, limited.length);
  } catch {
    return [];
  }
}

// ─── AI Matching ─────────────────────────────────────────────────────

export async function matchReflectionsToTopic(
  reflections: MindReflection[],
  topic: string,
): Promise<AIMatchResult[]> {
  const service = getAIService();
  const config = service.getConfig();

  if (config.mode === 'local' || !service.getDefaultModel()) {
    return [];
  }

  const limited = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  if (limited.length < 2) return [];

  const summaries = limited.map(r => buildReflectionSummary(r));
  const list = summaries.map((s, i) => `[${i}] ${s}`).join('\n');

  const prompt = `以下是用户的反思记录：\n${list}\n\n用户想追踪的主题: "${topic}"\n\n请找到相关的感念。`;

  try {
    const result = await (service as any).generateCloud(prompt, {
      systemPrompt: AI_MATCH_SYSTEM,
    });

    if (!result?.success || !result?.data) return [];

    return parseAIMatchResults(result.data, limited.length);
  } catch {
    return [];
  }
}

// ─── Availability check ──────────────────────────────────────────────

export function isAIRecommendAvailable(): boolean {
  try {
    const service = getAIService();
    const config = service.getConfig();
    return config.mode !== 'local' && service.getDefaultModel() !== null;
  } catch {
    return false;
  }
}

// ─── Parsers ─────────────────────────────────────────────────────────

function parseAIRecommendations(raw: string, maxIndex: number): AIRecommendation[] {
  try {
    // Extract JSON from potential markdown code block
    const jsonStr = extractJSON(raw);
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((item: any) =>
        item.name && item.description && Array.isArray(item.reflectionIndices)
      )
      .map((item: any) => ({
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
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((item: any) =>
        typeof item.reflectionIndex === 'number' && item.reason
      )
      .map((item: any) => ({
        reflectionIndex: item.reflectionIndex,
        reason: String(item.reason),
        relevance: typeof item.relevance === 'number' ? item.relevance : 0.5,
      }))
      .filter(r => r.reflectionIndex >= 0 && r.reflectionIndex < maxIndex)
      .sort((a, b) => b.relevance - a.relevance);
  } catch {
    return [];
  }
}

function extractJSON(raw: string): string {
  // Try to extract JSON from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find JSON array directly
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  return raw.trim();
}
