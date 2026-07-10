// ─── Trail creation: recommendation algorithms + keyword matching ───
import type { MindReflection } from '../types/reflection';
import type { ThoughtTrail } from '../types/thought-trail';
import { createLogger } from '../logger';
import { formatDate } from '../utils';
import { getMoodIcon } from './thought-trail';

const log = createLogger('TrailCreation');

// ─── Types ───────────────────────────────────────────────────────────

export interface TrailRecommendation {
  name: string;
  narrative: string;
  reflectionIds: string[];
  moods: string[];
  primaryTag: string;
  startDate: number;
  endDate: number;
  spanDays: number;
  trend: 'up' | 'down' | 'flat';
  assignedCount: number;
  score: number;
  type: 'mood' | 'tag' | 'time' | 'ai';
  reason?: string;  // 推荐理由
  source: 'local' | 'ai' | 'hybrid';  // 推荐来源
}

export interface TrailFilters {
  timeRange: 'week' | 'month' | '3months' | 'all';
  tags: string[];
  moods: string[];
  query?: string;
  preset?: string;
}

export interface PresetDef {
  key: string;
  icon: string;
  labelKey: string;
  filter: (refs: MindReflection[]) => MindReflection[];
}

// ─── Presets ─────────────────────────────────────────────────────────

export const QUICK_TRAIL_PRESETS: PresetDef[] = [
  {
    key: 'moodChange',
    icon: '📈',
    labelKey: 'quickTrailPresetMoodChange',
    filter: (refs) => {
      const weekAgo = Date.now() - 7 * 86400000;
      const recent = refs.filter(r => r.timestamp >= weekAgo);
      if (recent.length < 2) return [];
      const moods = recent.map(r => r.mood);
      const hasChange = moods.some((m, i) => i > 0 && m !== moods[i - 1]);
      return hasChange ? recent : [];
    },
  },
  {
    key: 'unassigned',
    icon: '📌',
    labelKey: 'quickTrailPresetUnassigned',
    filter: (refs) => refs.filter(r => !r.thoughtTrailIds?.length),
  },
  {
    key: 'nightThoughts',
    icon: '🌙',
    labelKey: 'quickTrailPresetNight',
    filter: (refs) => refs.filter(r => {
      const hour = new Date(r.timestamp).getHours();
      return hour >= 23 || hour < 4;
    }),
  },
];

// ─── Mood scoring ────────────────────────────────────────────────────

const MOOD_SCORES: Record<string, number> = {
  '难过': 1, '焦虑': 2, '生气': 2, '疲惫': 2,
  '平静': 3, '释然': 3, '淡定': 3,
  '开心': 4, '满足': 4, '感恩': 4, '兴奋': 4,
};

// ─── Candidate pool ──────────────────────────────────────────────────

export function computeCandidatePool(
  reflections: MindReflection[],
  filters: TrailFilters,
): MindReflection[] {
  let pool = reflections.filter(r => !r.deleted);

  if (filters.timeRange !== 'all') {
    const now = Date.now();
    const ranges: Record<string, number> = { week: 7, month: 30, '3months': 90 };
    const days = ranges[filters.timeRange] ?? 30;
    const cutoff = now - days * 86400000;
    pool = pool.filter(r => r.timestamp >= cutoff);
  }

  if (filters.tags.length > 0) {
    pool = pool.filter(r => r.tags.some(t => filters.tags.includes(t)));
  }

  if (filters.moods.length > 0) {
    pool = pool.filter(r => filters.moods.includes(r.mood));
  }

  if (filters.preset) {
    const presetDef = QUICK_TRAIL_PRESETS.find(p => p.key === filters.preset);
    if (presetDef) pool = presetDef.filter(pool);
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    pool = pool.filter(r =>
      r.content.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      (r.mood ?? '').toLowerCase().includes(q)
    );
  }

  return pool.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Recommendations ─────────────────────────────────────────────────

export function computeRecommendations(
  candidates: MindReflection[],
  allTrails: ThoughtTrail[],
): TrailRecommendation[] {
  if (candidates.length < 3) return [];
  const recs: TrailRecommendation[] = [];

  const moodRec = detectMoodNarrative(candidates);
  if (moodRec) recs.push(moodRec);

  const tagRec = detectTagFocus(candidates);
  if (tagRec) recs.push(tagRec);

  const timeRec = detectTimePattern(candidates);
  if (timeRec) recs.push(timeRec);

  return recs
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(rec => ({
      ...rec,
      assignedCount: rec.reflectionIds.filter(id => {
        const r = candidates.find(c => c.id === id);
        return r?.thoughtTrailIds && r.thoughtTrailIds.length > 0;
      }).length,
    }));
}

// ─── Dimension 1: Mood narrative ─────────────────────────────────────

export function detectMoodNarrative(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  const sorted = [...refs].sort((a, b) => a.timestamp - b.timestamp);
  let bestWindow: MindReflection[] = [];
  let bestScore = 0;

  for (let size = 3; size <= Math.min(8, sorted.length); size++) {
    for (let i = 0; i <= sorted.length - size; i++) {
      const window = sorted.slice(i, i + size);
      const moods = window.map(r => r.mood);
      const uniqueMoods = new Set(moods).size;
      const hasTransition = hasMoodTransition(moods);
      const score = uniqueMoods * 2 + (hasTransition ? 3 : 0) + (size >= 4 && size <= 6 ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestWindow = window;
      }
    }
  }

  if (bestWindow.length < 3) return null;

  return {
    name: generateNarrativeName(bestWindow),
    narrative: generateNarrative(bestWindow),
    reflectionIds: bestWindow.map(r => r.id),
    moods: bestWindow.map(r => r.mood),
    primaryTag: getMostFrequentTag(bestWindow),
    startDate: bestWindow[0].timestamp,
    endDate: bestWindow[bestWindow.length - 1].timestamp,
    spanDays: daysBetween(bestWindow[0].timestamp, bestWindow[bestWindow.length - 1].timestamp),
    trend: computeMoodTrendSimple(bestWindow),
    assignedCount: 0,
    score: bestScore,
    type: 'mood',
    source: 'local',
  };
}

// ─── Dimension 2: Tag focus ──────────────────────────────────────────

export function detectTagFocus(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  const tagCounts = new Map<string, MindReflection[]>();
  for (const r of refs) {
    for (const tag of r.tags) {
      const arr = tagCounts.get(tag) ?? [];
      arr.push(r);
      tagCounts.set(tag, arr);
    }
  }

  let bestTag = '';
  let bestScore = 0;

  for (const [tag, tagRefs] of tagCounts) {
    if (tagRefs.length < 3) continue;
    const uniqueMoods = new Set(tagRefs.map(r => r.mood)).size;
    const score = tagRefs.length + uniqueMoods * 2;

    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    }
  }

  if (!bestTag) return null;

  const tagRefs = tagCounts.get(bestTag)!;
  const sorted = [...tagRefs].sort((a, b) => a.timestamp - b.timestamp);
  const limited = sorted.slice(0, 8);

  return {
    name: `#${bestTag}`,
    narrative: generateTagNarrative(bestTag, limited),
    reflectionIds: limited.map(r => r.id),
    moods: limited.map(r => r.mood),
    primaryTag: bestTag,
    startDate: limited[0].timestamp,
    endDate: limited[limited.length - 1].timestamp,
    spanDays: daysBetween(limited[0].timestamp, limited[limited.length - 1].timestamp),
    trend: computeMoodTrendSimple(limited),
    assignedCount: 0,
    score: bestScore,
    type: 'tag',
    source: 'local',
  };
}

// ─── Dimension 3: Time pattern ───────────────────────────────────────

export function detectTimePattern(refs: MindReflection[]): TrailRecommendation | null {
  if (refs.length < 3) return null;

  const timeSlots = [
    { label: '深夜', range: [23, 0, 1, 2, 3], icon: '🌙' },
    { label: '清晨', range: [5, 6, 7], icon: '🌅' },
    { label: '午间', range: [12, 13], icon: '☀️' },
    { label: '傍晚', range: [17, 18, 19], icon: '🌇' },
  ];

  let bestSlot = timeSlots[0];
  let bestRefs: MindReflection[] = [];

  for (const slot of timeSlots) {
    const slotRefs = refs.filter(r => {
      const hour = new Date(r.timestamp).getHours();
      return slot.range.includes(hour);
    });
    if (slotRefs.length > bestRefs.length) {
      bestSlot = slot;
      bestRefs = slotRefs;
    }
  }

  if (bestRefs.length < 3) return null;

  const sorted = [...bestRefs].sort((a, b) => a.timestamp - b.timestamp);
  const limited = sorted.slice(0, 8);

  return {
    name: `${bestSlot.icon} ${bestSlot.label}的思考`,
    narrative: generateTimeNarrative(bestSlot.label, limited),
    reflectionIds: limited.map(r => r.id),
    moods: limited.map(r => r.mood),
    primaryTag: getMostFrequentTag(limited),
    startDate: limited[0].timestamp,
    endDate: limited[limited.length - 1].timestamp,
    spanDays: daysBetween(limited[0].timestamp, limited[limited.length - 1].timestamp),
    trend: computeMoodTrendSimple(limited),
    assignedCount: 0,
    score: bestRefs.length,
    type: 'time',
    source: 'local',
  };
}

// ─── Keyword matching ────────────────────────────────────────────────

export function matchByKeyword(
  query: string,
  candidates: MindReflection[],
): MindReflection[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = candidates.map(r => {
    let score = 0;
    const content = r.content.toLowerCase();
    const tags = r.tags.map(t => t.toLowerCase());
    const mood = (r.mood ?? '').toLowerCase();

    for (const term of terms) {
      if (content.includes(term)) score += 3;
      if (tags.some(t => t.includes(term))) score += 5;
      if (mood.includes(term)) score += 2;
    }

    return { ref: r, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.ref);
}

// ─── Narrative generation ────────────────────────────────────────────

export function generateNarrative(refs: MindReflection[]): string {
  if (refs.length < 2) return '';

  const firstMood = refs[0].mood;
  const lastMood = refs[refs.length - 1].mood;
  const primaryTag = getMostFrequentTag(refs);

  if (firstMood === lastMood) {
    return `持续的${firstMood}状态，围绕${primaryTag}的思考`;
  }

  const templates: Record<string, Record<string, string>> = {
    '焦虑': {
      '平静': `从${primaryTag}的焦虑中找到了平静`,
      '开心': `经历${primaryTag}的焦虑后收获了满足`,
      '释然': `在${primaryTag}中从焦虑走向释然`,
    },
    '难过': {
      '平静': `从${primaryTag}的低落中慢慢恢复`,
      '开心': `经历了${primaryTag}的低谷后重新振作`,
    },
    '平静': {
      '开心': `在${primaryTag}中保持平静并收获成长`,
    },
  };

  return templates[firstMood]?.[lastMood]
    ?? `从${firstMood}到${lastMood}的${primaryTag}之路`;
}

export function generateNarrativeName(refs: MindReflection[]): string {
  if (refs.length === 0) return '';
  const primaryTag = getMostFrequentTag(refs);
  const firstMood = refs[0].mood;
  const lastMood = refs[refs.length - 1].mood;

  if (primaryTag) {
    if (firstMood !== lastMood) {
      return `从${firstMood}到${lastMood}`;
    }
    return `${primaryTag}的思考`;
  }

  const content = refs[0].content.trim();
  return content.length <= 15 ? content : `${content.slice(0, 15)}...`;
}

function generateTagNarrative(tag: string, refs: MindReflection[]): string {
  const uniqueMoods = new Set(refs.map(r => r.mood)).size;
  const trend = computeMoodTrendSimple(refs);
  const trendText = trend === 'up' ? '逐渐好转' : trend === 'down' ? '有所波动' : '保持平稳';
  return `${tag}相关的情绪起伏和成长，整体${trendText}`;
}

function generateTimeNarrative(label: string, refs: MindReflection[]): string {
  const primaryTag = getMostFrequentTag(refs);
  return `${label}独处时围绕${primaryTag}的深度反思`;
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function computeMoodTrendSimple(refs: MindReflection[]): 'up' | 'down' | 'flat' {
  if (refs.length < 2) return 'flat';

  const scores = refs.map(r => MOOD_SCORES[r.mood] ?? 3);
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (avgSecond - avgFirst > 0.5) return 'up';
  if (avgFirst - avgSecond > 0.5) return 'down';
  return 'flat';
}

export function trendArrow(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
}

export function trendLabel(trend: 'up' | 'down' | 'flat', t?: (key: string) => string): string {
  if (t) {
    const keys = { up: 'quickTrailTrendUp', down: 'quickTrailTrendDown', flat: 'quickTrailTrendFlat' };
    return t(keys[trend]);
  }
  return trend === 'up' ? '上升' : trend === 'down' ? '下降' : '平稳';
}

export function trendColor(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : '#9E9E9E';
}

export function buildReflectionSummary(ref: MindReflection, language: string = 'zh'): string {
  const date = formatDate(new Date(ref.timestamp), language, {
    month: 'numeric', day: 'numeric',
  });
  const tags = ref.tags.length > 0 ? ` #${ref.tags.join(' #')}` : '';
  const content = ref.content.slice(0, 50);
  return `${date} ${ref.mood}${tags} "${content}${ref.content.length > 50 ? '...' : ''}"`;
}

export function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function daysBetween(a: number, b: number): number {
  return Math.round(Math.abs(b - a) / 86400000);
}

export function getMostFrequentTag(refs: MindReflection[]): string {
  const counts = new Map<string, number>();
  for (const r of refs) {
    for (const tag of r.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  let best = '';
  let bestCount = 0;
  for (const [tag, count] of counts) {
    if (count > bestCount) { best = tag; bestCount = count; }
  }
  return best;
}

function hasMoodTransition(moods: string[]): boolean {
  for (let i = 1; i < moods.length; i++) {
    if (moods[i] !== moods[i - 1]) return true;
  }
  return false;
}

// ─── Gap analysis ────────────────────────────────────────────────────

export interface TrailGap {
  type: 'time' | 'mood';
  message: string;
  startDate?: number;
  endDate?: number;
  fromMood?: string;
  toMood?: string;
  suggestion: string;
}

export function analyzeTrailGaps(refs: MindReflection[]): TrailGap[] {
  if (refs.length < 2) return [];

  const sorted = [...refs].sort((a, b) => a.timestamp - b.timestamp);
  const gaps: TrailGap[] = [];

  // Time gaps: detect gaps > 5 days between consecutive reflections
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = daysBetween(sorted[i - 1].timestamp, sorted[i].timestamp);
    if (gapDays > 5) {
      const startDate = formatDateShort(sorted[i - 1].timestamp);
      const endDate = formatDateShort(sorted[i].timestamp);
      gaps.push({
        type: 'time',
        message: `缺少 ${startDate} 到 ${endDate} 的记录`,
        startDate: sorted[i - 1].timestamp,
        endDate: sorted[i].timestamp,
        suggestion: `这段时间有 ${gapDays} 天空白，尝试回忆并补充记录`,
      });
    }
  }

  // Mood gaps: detect missing emotional transitions

  const moods = sorted.map(r => r.mood);
  const uniqueMoods = [...new Set(moods)];

  if (uniqueMoods.length >= 2) {
    const scores = uniqueMoods.map(m => ({ mood: m, score: MOOD_SCORES[m] ?? 3 }));
    scores.sort((a, b) => a.score - b.score);

    const lowest = scores[0];
    const highest = scores[scores.length - 1];

    if (highest.score - lowest.score >= 2) {
      // Check if there's a gradual transition
      const hasIntermediate = scores.some(s => s.score > lowest.score && s.score < highest.score);
      if (!hasIntermediate) {
        gaps.push({
          type: 'mood',
          message: `缺少从${lowest.mood}到${highest.mood}的转折感念`,
          fromMood: lowest.mood,
          toMood: highest.mood,
          suggestion: `记录从${lowest.mood}到${highest.mood}的心路历程`,
        });
      }
    }
  }

  return gaps;
}

// ─── Recommendation reason generation ─────────────────────────────────

export function generateRecommendationReason(rec: TrailRecommendation): string {
  const startDate = formatDateShort(rec.startDate);
  const endDate = formatDateShort(rec.endDate);

  switch (rec.type) {
    case 'mood': {
      const firstMood = rec.moods[0];
      const lastMood = rec.moods[rec.moods.length - 1];
      if (firstMood === lastMood) {
        return `发现你在 ${startDate}~${endDate} 期间持续的${firstMood}状态`;
      }
      return `发现你在 ${startDate}~${endDate} 的情绪从${firstMood}转向${lastMood}`;
    }
    case 'tag': {
      const count = rec.reflectionIds.length;
      return `围绕 #${rec.primaryTag} 的 ${count} 条感念，展现了持续的思考`;
    }
    case 'time': {
      const name = rec.name;
      return `${name}，记录了独处时的深度反思`;
    }
    default:
      return rec.narrative;
  }
}

// ─── Merge and rank recommendations ──────────────────────────────────

function calcOverlap(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  for (const id of setA) {
    if (setB.has(id)) overlap++;
  }
  const max = Math.max(setA.size, setB.size);
  return max === 0 ? 0 : overlap / max;
}

export function mergeAndRank(
  localRecs: TrailRecommendation[],
  aiRecs: TrailRecommendation[],
): TrailRecommendation[] {
  const merged: TrailRecommendation[] = [];
  const usedAiIndices = new Set<number>();

  // 先添加本地推荐
  for (const local of localRecs) {
    let bestOverlap = 0;
    let bestAiIdx = -1;

    for (let i = 0; i < aiRecs.length; i++) {
      if (usedAiIndices.has(i)) continue;
      const overlap = calcOverlap(local.reflectionIds, aiRecs[i].reflectionIds);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestAiIdx = i;
      }
    }

    if (bestOverlap > 0.5 && bestAiIdx >= 0) {
      // 高重叠度：合并，使用 AI 的 reason
      const ai = aiRecs[bestAiIdx];
      merged.push({
        ...local,
        reason: ai.reason || local.reason,
        source: 'hybrid',
      });
      usedAiIndices.add(bestAiIdx);
    } else {
      // 低重叠度：保留本地推荐
      merged.push(local);
    }
  }

  // 添加未使用的 AI 推荐
  for (let i = 0; i < aiRecs.length; i++) {
    if (!usedAiIndices.has(i)) {
      merged.push(aiRecs[i]);
    }
  }

  // 按 score 排序
  return merged.sort((a, b) => b.score - a.score);
}

// ─── Hybrid recommendations ──────────────────────────────────────────

export async function computeHybridRecommendations(
  candidates: MindReflection[],
  allTrails: ThoughtTrail[],
  aiAvailable: boolean,
): Promise<TrailRecommendation[]> {
  // 1. 本地推荐
  const localRecs = computeRecommendations(candidates, allTrails);
  const localWithReason = localRecs.map(rec => ({
    ...rec,
    reason: rec.reason || generateRecommendationReason(rec),
    source: 'local' as const,
  }));

  // 2. AI 推荐（如果可用）
  if (!aiAvailable) {
    return localWithReason;
  }

  try {
    const { recommendTrailsViaAI } = await import('../ai/trail-recommender');
    const aiResult = await recommendTrailsViaAI(candidates);

    if (aiResult.recommendations.length === 0) {
      return localWithReason;
    }

    // Map indices from targetReflections (RAG subset) back to candidates
    const tgt = aiResult.targetReflections;
    const aiRecs: TrailRecommendation[] = aiResult.recommendations.map(rec => {
      const validItems = rec.reflectionIndices.map(i => tgt[i]).filter(Boolean) as typeof tgt;
      const timestamps = validItems.map(r => r!.timestamp);
      return {
      name: rec.name,
      narrative: rec.description,
      reflectionIds: validItems.map(r => r!.id),
      moods: validItems.map(r => r!.mood ?? ''),
      primaryTag: getMostFrequentTag(validItems as unknown as MindReflection[]),
      startDate: timestamps.length > 0 ? Math.min(...timestamps) : Date.now(),
      endDate: timestamps.length > 0 ? Math.max(...timestamps) : Date.now(),
      spanDays: timestamps.length > 0 ? daysBetween(Math.min(...timestamps), Math.max(...timestamps)) : 1,
      trend: computeMoodTrendSimple(validItems as unknown as MindReflection[]),
      assignedCount: 0,
      score: rec.confidence * 10,
      type: 'mood',
      reason: rec.description,
      source: 'ai',
    }});

    // 3. 合并 + 去重 + 排序
    return mergeAndRank(localWithReason, aiRecs);
  } catch (e) {
    log.warn('HybridRecommend AI failed, using local only:', e);
    return localWithReason;
  }
}

// ─── User preferences ────────────────────────────────────────────────

export function buildIgnoredPattern(rec: TrailRecommendation): string {
  const ids = [...rec.reflectionIds].sort().join(',');
  let hash = 5381;
  for (let i = 0; i < ids.length; i++) {
    hash = ((hash << 5) + hash + ids.charCodeAt(i)) | 0;
  }
  return `${rec.type}:${hash}`;
}

export function applyUserPreferences(
  recs: TrailRecommendation[],
  ignored: string[],
): TrailRecommendation[] {
  if (ignored.length === 0) return recs;

  return recs.filter(rec => {
    const pattern = buildIgnoredPattern(rec);
    return !ignored.includes(pattern);
  });
}
