// ─── ThoughtTrail business logic (pure functions) ────────────────
import type { ThoughtTrail } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { TrailNote } from '../types/trail-note';
import { dateStr, activeOnly } from '../utils';

/** 时间线条目类型 */
export type TimelineItem =
  | { kind: 'reflection'; data: MindReflection; timestamp: number }
  | { kind: 'note'; data: TrailNote; timestamp: number };

/** 脉络概览统计 */
export interface TrailOverview {
  reflectionCount: number;
  noteCount: number;
  daySpan: number;
  dateRange: { start: string; end: string } | null;
  moodChanges: string[];
  trend: 'up' | 'down' | 'flat';
  topTags: { tag: string; count: number }[];
}

/**
 * 自动生成思维脉络名称
 * 综合分析所有感念的情绪变化和主题标签
 * @param t optional i18n translation function for localized default names
 */
export function generateTrailName(reflections: MindReflection[], t?: (key: string, vars?: Record<string, string>) => string): string {
  const active = activeOnly(reflections);
  if (active.length === 0) return t?.('thoughtTrailEmpty') ?? 'New Trail';
  reflections = active;

  if (reflections.length === 1) {
    const r = reflections[0];
    if ((r.tags ?? []).length > 0) return `${r.tags[0]}的${r.mood}`;
    const content = r.content.trim();
    return content.length <= 20 ? content : `${content.slice(0, 20)}...`;
  }

  // 按时间排序
  const sorted = [...reflections].sort((a, b) => a.timestamp - b.timestamp);
  const firstMood = sorted[0].mood;
  const lastMood = sorted[sorted.length - 1].mood;

  // 找最常出现的标签
  const tagCounts = new Map<string, number>();
  for (const r of reflections) {
    for (const tag of (r.tags ?? [])) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  let primaryTag = '';
  let bestCount = 0;
  for (const [tag, count] of tagCounts) {
    if (count > bestCount) { primaryTag = tag; bestCount = count; }
  }

  // 情绪有变化
  if (firstMood !== lastMood) {
    if (primaryTag) return `${primaryTag}·从${firstMood}到${lastMood}`;
    return `从${firstMood}到${lastMood}`;
  }

  // 情绪一致
  if (primaryTag) return `${primaryTag}的${firstMood}`;

  // 无标签：取第一条有内容的感念
  const content = sorted[0].content.trim();
  if (content.length <= 20) return content;
  return `${content.slice(0, 20)}...`;
}

/**
 * 获取思维脉络统计信息
 */
export function getTrailStats(
  trail: ThoughtTrail,
  reflections: MindReflection[],
): {
  count: number;
  dateRange: { start: string; end: string } | null;
  moodChanges: string[];
} {
  const trailReflections = (trail.reflectionIds ?? [])
    .map(id => reflections.find(r => !r.deleted && r.id === id))
    .filter((r): r is MindReflection => r != null);

  if (trailReflections.length === 0) {
    return { count: 0, dateRange: null, moodChanges: [] };
  }

  // Sort by timestamp
  const sorted = [...trailReflections].sort((a, b) => a.timestamp - b.timestamp);

  const startDate = dateStr(new Date(sorted[0].timestamp));
  const endDate = dateStr(new Date(sorted[sorted.length - 1].timestamp));

  // Extract mood changes (consecutive different moods)
  const moodChanges: string[] = [];
  let lastMood = '';
  for (const r of sorted) {
    if (r.mood && r.mood !== lastMood) {
      moodChanges.push(r.mood);
      lastMood = r.mood;
    }
  }

  return {
    count: trailReflections.length,
    dateRange: { start: startDate, end: endDate },
    moodChanges,
  };
}

/**
 * 获取感念所属的思维脉络
 */
export function getTrailsByReflection(
  reflectionId: string,
  thoughtTrails: ThoughtTrail[],
): ThoughtTrail[] {
  return thoughtTrails.filter(t => !t.deleted && (t.reflectionIds ?? []).includes(reflectionId));
}

/**
 * 按标签聚合感念
 */
export function getReflectionsByTag(
  reflections: MindReflection[],
): Map<string, MindReflection[]> {
  const tagMap = new Map<string, MindReflection[]>();

  for (const r of reflections) {
    if (r.deleted) continue;
    for (const tag of (r.tags ?? [])) {
      const existing = tagMap.get(tag) ?? [];
      existing.push(r);
      tagMap.set(tag, existing);
    }
  }

  // Sort by count descending
  return new Map([...tagMap.entries()].sort((a, b) => b[1].length - a[1].length));
}

/**
 * 获取心情图标
 */
export function getMoodIcon(mood: string): string {
  switch (mood) {
    case 'happy':
    case '开心': return '😊';
    case 'calm':
    case '平静': return '🌿';
    case 'neutral':
    case '平常': return '😐';
    case 'anxious':
    case '焦虑': return '😰';
    case 'sad':
    case '难过': return '😢';
    case 'excited':
    case '兴奋': return '🎉';
    case 'grateful':
    case '感恩': return '🙏';
    default: return '💭';
  }
}

/**
 * 获取脉络概览统计（增强版）
 */
export function getTrailOverview(
  trail: ThoughtTrail,
  reflections: MindReflection[],
  trailNotes: TrailNote[],
): TrailOverview {
  const trailReflections = (trail.reflectionIds ?? [])
    .map(id => reflections.find(r => r.id === id))
    .filter((r): r is MindReflection => r != null && !r.deleted);

  const trailNoteItems = (trail.noteIds ?? [])
    .map(id => trailNotes.find(n => n.id === id))
    .filter((n): n is TrailNote => n != null && !n.deleted);

  const allItems = [
    ...trailReflections.map(r => r.timestamp),
    ...trailNoteItems.map(n => n.createdAt),
  ].sort((a, b) => a - b);

  if (allItems.length === 0) {
    return {
      reflectionCount: 0,
      noteCount: 0,
      daySpan: 0,
      dateRange: null,
      moodChanges: [],
      trend: 'flat',
      topTags: [],
    };
  }

  const startDate = dateStr(new Date(allItems[0]));
  const endDate = dateStr(new Date(allItems[allItems.length - 1]));
  const daySpan = Math.ceil((allItems[allItems.length - 1] - allItems[0]) / (1000 * 60 * 60 * 24));

  // 心情变化
  const sorted = [...trailReflections].sort((a, b) => a.timestamp - b.timestamp);
  const moodChanges: string[] = [];
  let lastMood = '';
  for (const r of sorted) {
    if (r.mood && r.mood !== lastMood) {
      moodChanges.push(r.mood);
      lastMood = r.mood;
    }
  }

  // 趋势判断（基于最近 3 条感念的情绪）
  const moodOrder: Record<string, number> = {
    '难过': 0, 'sad': 0, '焦虑': 1, 'anxious': 1, '平静': 2, 'calm': 2,
    '开心': 3, 'happy': 3, '兴奋': 4, 'excited': 4, '感恩': 3, 'grateful': 3,
  };
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (sorted.length >= 3) {
    const recent3 = sorted.slice(-3).map(r => moodOrder[r.mood] ?? 2);
    const avg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
    const firstAvg = sorted.length >= 6
      ? sorted.slice(-6, -3).map(r => moodOrder[r.mood] ?? 2).reduce((a, b) => a + b, 0) / 3
      : avg;
    if (avg > firstAvg + 0.3) trend = 'up';
    else if (avg < firstAvg - 0.3) trend = 'down';
  }

  // 标签聚合
  const tagCounts = new Map<string, number>();
  for (const r of trailReflections) {
    for (const tag of r.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  for (const n of trailNoteItems) {
    for (const tag of n.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    reflectionCount: trailReflections.length,
    noteCount: trailNoteItems.length,
    daySpan,
    dateRange: { start: startDate, end: endDate },
    moodChanges,
    trend,
    topTags,
  };
}

/**
 * 获取相关脉络（基于标签 Jaccard 相似度）
 */
export function getRelatedTrails(
  currentTrail: ThoughtTrail,
  allTrails: ThoughtTrail[],
  reflections: MindReflection[],
  trailNotes: TrailNote[],
  limit = 3,
): { trail: ThoughtTrail; similarity: number }[] {
  // 收集当前脉络的标签（出现频率 >= 2）
  const currentTags = getTrailTagSet(currentTrail, reflections, trailNotes);

  if (currentTags.size === 0) return [];

  const results: { trail: ThoughtTrail; similarity: number }[] = [];

  for (const trail of allTrails) {
    if (trail.id === currentTrail.id || trail.deleted) continue;

    const otherTags = getTrailTagSet(trail, reflections, trailNotes);
    if (otherTags.size === 0) continue;

    // Jaccard 相似度
    const intersection = new Set([...currentTags].filter(t => otherTags.has(t)));
    const union = new Set([...currentTags, ...otherTags]);
    const similarity = intersection.size / union.size;

    if (similarity > 0) {
      results.push({ trail, similarity });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/** 获取脉络的标签集合（只保留出现频率 >= 2 的） */
function getTrailTagSet(
  trail: ThoughtTrail,
  reflections: MindReflection[],
  trailNotes: TrailNote[],
): Set<string> {
  const tagCounts = new Map<string, number>();

  for (const id of trail.reflectionIds ?? []) {
    const r = reflections.find(r => r.id === id);
    if (r && !r.deleted) {
      for (const tag of r.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  for (const id of trail.noteIds ?? []) {
    const n = trailNotes.find(n => n.id === id);
    if (n && !n.deleted) {
      for (const tag of n.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }

  return new Set(
    [...tagCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([tag]) => tag)
  );
}

/**
 * 将普通感念和脉络感念混排为时间线
 */
export function getTrailTimelineItems(
  trail: ThoughtTrail,
  reflections: MindReflection[],
  trailNotes: TrailNote[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const id of trail.reflectionIds ?? []) {
    const r = reflections.find(r => r.id === id);
    if (r && !r.deleted) {
      items.push({ kind: 'reflection', data: r, timestamp: r.timestamp });
    }
  }

  for (const id of trail.noteIds ?? []) {
    const n = trailNotes.find(n => n.id === id);
    if (n && !n.deleted) {
      items.push({ kind: 'note', data: n, timestamp: n.createdAt });
    }
  }

  return items.sort((a, b) => a.timestamp - b.timestamp);
}
