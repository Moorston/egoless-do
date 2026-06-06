// ─── ThoughtTrail business logic (pure functions) ────────────────
import type { ThoughtTrail } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';

/**
 * 自动生成思路脉络名称
 * 优先使用第一个标签，无标签时使用内容前 20 字
 */
export function generateTrailName(reflections: MindReflection[]): string {
  if (reflections.length === 0) return '新思路脉络';

  const first = reflections[0];
  if (first.tags.length > 0) {
    return `${first.tags[0]}的思维脉络`;
  }

  const content = first.content.trim();
  if (content.length <= 20) return content;
  return `${content.slice(0, 20)}...`;
}

/**
 * 获取思路脉络统计信息
 */
export function getTrailStats(
  trail: ThoughtTrail,
  reflections: MindReflection[],
): {
  count: number;
  dateRange: { start: string; end: string } | null;
  moodChanges: string[];
} {
  const trailReflections = trail.reflectionIds
    .map(id => reflections.find(r => r.id === id))
    .filter((r): r is MindReflection => r != null);

  if (trailReflections.length === 0) {
    return { count: 0, dateRange: null, moodChanges: [] };
  }

  // Sort by timestamp
  const sorted = [...trailReflections].sort((a, b) => a.timestamp - b.timestamp);

  const startDate = new Date(sorted[0].timestamp).toISOString().slice(0, 10);
  const endDate = new Date(sorted[sorted.length - 1].timestamp).toISOString().slice(0, 10);

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
 * 获取感念所属的思路脉络
 */
export function getTrailsByReflection(
  reflectionId: string,
  thoughtTrails: ThoughtTrail[],
): ThoughtTrail[] {
  return thoughtTrails.filter(t => !t.deleted && t.reflectionIds.includes(reflectionId));
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
    for (const tag of r.tags) {
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
    case '开心': return '😊';
    case '平静': return '🌿';
    case '焦虑': return '😰';
    case '难过': return '😢';
    case '兴奋': return '🎉';
    case '感恩': return '🙏';
    default: return '💭';
  }
}
