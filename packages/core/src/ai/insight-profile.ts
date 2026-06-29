// ─── Insight Profile: local stats + AI-powered analysis ───
import type { MindReflection } from '../types/reflection';
import { getMoodIcon } from '../business/thought-trail';
import { buildReflectionSummary } from '../business/trail-creation';
import { getAIService } from './ai-service';
import { isAIRecommendAvailable } from './trail-recommender';
import { dateStr, activeOnly } from '../utils';
import { createLogger } from '../logger';

const log = createLogger('AI');

// ─── Types ───────────────────────────────────────────────────────────

export interface InsightProfile {
  totalCount: number;
  streakDays: number;
  avgPerDay: number;
  hotTags: HotTag[];
  moodDistribution: MoodEntry[];
  hotTopics: HotTopic[];
  insightSummary: string;
  timeRange: 'week' | 'month';
  startDate: number;
  endDate: number;
}

export interface HotTag {
  tag: string;
  count: number;
  percentage: number;
  trend: 'rising' | 'stable' | 'declining';
  sampleReflectionIds: string[];
}

export interface MoodEntry {
  mood: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface HotTopic {
  word: string;
  count: number;
  category: string;
  sampleReflectionIds: string[];
  aiReason?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const TIME_RANGE_DAYS: Record<string, number> = { week: 7, month: 30 };

// ─── Local Stats (synchronous) ───────────────────────────────────────

export function computeLocalInsights(
  reflections: MindReflection[],
  timeRange: 'week' | 'month',
): Omit<InsightProfile, 'hotTopics' | 'insightSummary'> {
  const now = Date.now();
  const days = TIME_RANGE_DAYS[timeRange] ?? 7;
  const cutoff = now - days * 86400000;
  const prevCutoff = cutoff - days * 86400000;

  const active = reflections.filter(r => !r.deleted && r.timestamp >= cutoff);
  const prevActive = reflections.filter(r => !r.deleted && r.timestamp >= prevCutoff && r.timestamp < cutoff);

  const sorted = [...active].sort((a, b) => a.timestamp - b.timestamp);
  const startDate = sorted.length > 0 ? sorted[0].timestamp : now;
  const endDate = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : now;

  return {
    totalCount: active.length,
    streakDays: computeStreakDays(reflections, days),
    avgPerDay: active.length > 0 ? Math.round((active.length / days) * 10) / 10 : 0,
    hotTags: computeHotTags(active, prevActive),
    moodDistribution: computeMoodDistribution(active),
    timeRange,
    startDate,
    endDate,
  };
}

// ─── Streak days ─────────────────────────────────────────────────────

function computeStreakDays(reflections: MindReflection[], maxDays: number): number {
  const active = activeOnly(reflections);
  if (active.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateSet = new Set<string>();
  for (const r of active) {
    dateSet.add(dateStr(new Date(r.timestamp)));
  }

  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dateSet.has(dateStr(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Hot tags ────────────────────────────────────────────────────────

function computeHotTags(current: MindReflection[], prev: MindReflection[]): HotTag[] {
  const tagCounts = new Map<string, { count: number; ids: string[] }>();
  for (const r of current) {
    for (const tag of r.tags) {
      const entry = tagCounts.get(tag) ?? { count: 0, ids: [] };
      entry.count++;
      entry.ids.push(r.id);
      tagCounts.set(tag, entry);
    }
  }

  const prevTagCounts = new Map<string, number>();
  for (const r of prev) {
    for (const tag of r.tags) {
      prevTagCounts.set(tag, (prevTagCounts.get(tag) ?? 0) + 1);
    }
  }

  const total = current.length || 1;
  return [...tagCounts.entries()]
    .map(([tag, { count, ids }]) => {
      const prevCount = prevTagCounts.get(tag) ?? 0;
      let trend: HotTag['trend'] = 'stable';
      if (count > prevCount) trend = 'rising';
      else if (count < prevCount) trend = 'declining';
      return {
        tag,
        count,
        percentage: Math.round((count / total) * 100),
        trend,
        sampleReflectionIds: ids,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// ─── Mood distribution ───────────────────────────────────────────────

function computeMoodDistribution(current: MindReflection[]): MoodEntry[] {
  const moodCounts = new Map<string, number>();
  for (const r of current) {
    if (r.mood) moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
  }

  const total = current.length || 1;
  return [...moodCounts.entries()]
    .map(([mood, count]) => ({
      mood,
      icon: getMoodIcon(mood),
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── AI Insight Generation ───────────────────────────────────────────

const INSIGHT_PROFILE_SYSTEM = `分析感念记录，输出JSON:
{"summary":"20字内洞察","topics":[{"word":"2-4字主题词","count":出现次数,"category":"分类","reason":"一句话原因","reflectionIndices":[序号]}]}
topics限3-5个，不要输出其他内容。`;

export async function generateInsightProfile(
  reflections: MindReflection[],
  timeRange: 'week' | 'month',
): Promise<{ insightSummary: string; hotTopics: HotTopic[] } | null> {
  if (!isAIRecommendAvailable()) return null;

  const days = TIME_RANGE_DAYS[timeRange] ?? 7;
  const cutoff = Date.now() - days * 86400000;
  const active = reflections
    .filter(r => !r.deleted && r.timestamp >= cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  if (active.length < 3) return null;

  const summaries = active.map(r => buildReflectionSummary(r));
  const list = summaries.map((s, i) => `[${i}] ${s}`).join('\n');

  const prompt = `感念记录:\n${list}\n\n提取高频主题词。`;

  try {
    const service = getAIService();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let result: any;
    try {
      result = await (service as any).generateCloud(prompt, {
        systemPrompt: INSIGHT_PROFILE_SYSTEM,
        maxTokens: 4000,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!result?.success || !result?.data) return null;
    return parseInsightResponse(result.data, active);
  } catch (e) {
    log.error(e, { context: '[InsightProfile]' });
    return null;
  }
}

function parseInsightResponse(
  raw: string,
  reflections: MindReflection[],
): { insightSummary: string; hotTopics: HotTopic[] } | null {
  try {
    const jsonStr = extractJSON(raw);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // 尝试修复截断的 JSON：补全缺失的括号
      const repaired = repairJSON(jsonStr);
      parsed = JSON.parse(repaired);
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';

    const topicsRaw = parsed.topics || parsed.hotTopics || parsed.themes || parsed.keywords;
    if (!Array.isArray(topicsRaw)) {
      return { insightSummary: summary, hotTopics: [] };
    }

    const hotTopics: HotTopic[] = topicsRaw
      .filter((t: any) => t && (t.word || t.keyword || t.theme) && (typeof t.count === 'number' || typeof t.frequency === 'number'))
      .map((t: any) => ({
        word: String(t.word || t.keyword || t.theme || ''),
        count: Number(t.count || t.frequency || 0),
        category: String(t.category || t.type || t.tag || ''),
        sampleReflectionIds: (Array.isArray(t.reflectionIndices) ? t.reflectionIndices : [])
          .filter((i: number) => i >= 0 && i < reflections.length)
          .map((i: number) => reflections[i].id),
        aiReason: t.reason ? String(t.reason) : undefined,
      }))
      .filter(t => t.word)
      .slice(0, 5);

    return { insightSummary: summary, hotTopics };
  } catch {
    return null;
  }
}

function extractJSON(raw: string): string {
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];
  return raw.trim();
}

function repairJSON(str: string): string {
  let s = str.trim();
  // 截断到最后一个结构性的 } (忽略字符串内的 })
  let lastStructuralClose = -1;
  let depth = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) lastStructuralClose = i; }
  }
  if (lastStructuralClose >= 0) {
    s = s.slice(0, lastStructuralClose + 1);
  }
  // 补全缺失的 ] 和 } (只计 structural brackets, 忽略字符串内的)
  let openBrackets = 0, closeBrackets = 0, openBraces = 0, closeBraces = 0;
  let inString = false, escaped = false;
  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') openBrackets++;
    else if (ch === ']') closeBrackets++;
    else if (ch === '{') openBraces++;
    else if (ch === '}') closeBraces++;
  }
  for (let i = closeBrackets; i < openBrackets; i++) s += ']';
  for (let i = closeBraces; i < openBraces; i++) s += '}';
  return s;
}
