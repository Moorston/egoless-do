import type { MindReflection } from '../types/reflection';

// ── Mood scoring ──────────────────────────────────────────────

const MOOD_SCORES: Record<string, number> = {
  '开心': 5, '平静': 4, '感恩': 5, '满足': 4,
  '焦虑': 2, '难过': 1, '愤怒': 1, '疲惫': 2,
  '兴奋': 5, '感动': 4, '释然': 4, '迷茫': 2,
};

export function computeMoodScore(mood: string): number {
  return MOOD_SCORES[mood] ?? 3;
}

// ── Mood trend (last N days) ──────────────────────────────────

export interface MoodTrendPoint {
  date: string;
  avgScore: number;
  count: number;
  dominantMood: string;
}

export function computeMoodTrend(
  reflections: MindReflection[],
  days = 30,
): MoodTrendPoint[] {
  const today = new Date();
  const result: MoodTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayReflections = reflections.filter(r => {
      if (r.deleted) return false;
      const rDate = new Date(r.timestamp ?? 0).toISOString().slice(0, 10);
      return rDate === dateStr;
    });

    if (dayReflections.length === 0) {
      result.push({ date: dateStr, avgScore: 0, count: 0, dominantMood: '' });
    } else {
      const moodCounts: Record<string, number> = {};
      let totalScore = 0;
      let moodCount = 0;

      for (const r of dayReflections) {
        if (r.mood) {
          moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
          totalScore += computeMoodScore(r.mood);
          moodCount++;
        }
      }

      const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const avgScore = moodCount > 0 ? totalScore / moodCount : 0;

      result.push({ date: dateStr, avgScore: Math.round(avgScore * 10) / 10, count: dayReflections.length, dominantMood });
    }
  }

  return result;
}

// ── Writing heatmap ───────────────────────────────────────────

export interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
}

export function computeWritingHeatmap(
  reflections: MindReflection[],
  weeks = 20,
): HeatmapDay[] {
  const today = new Date();
  const totalDays = weeks * 7;
  const result: HeatmapDay[] = [];

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = reflections.filter(r => {
      if (r.deleted) return false;
      return new Date(r.timestamp ?? 0).toISOString().slice(0, 10) === dateStr;
    }).length;

    result.push({ date: dateStr, count, dayOfWeek: d.getDay() });
  }

  return result;
}

// ── Tag co-occurrence graph ───────────────────────────────────

export interface TagNode {
  tag: string;
  count: number;
  x?: number;
  y?: number;
}

export interface TagEdge {
  source: string;
  target: string;
  weight: number;
}

export interface TagGraph {
  nodes: TagNode[];
  edges: TagEdge[];
}

export function computeTagCooccurrence(reflections: MindReflection[]): TagGraph {
  const tagCounts: Record<string, number> = {};
  const pairCounts: Record<string, number> = {};

  for (const r of reflections) {
    if (r.deleted || !r.tags?.length) continue;

    for (const tag of r.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Count co-occurrences
    const tags = [...r.tags].sort();
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = `${tags[i]}|${tags[j]}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  }

  const nodes: TagNode[] = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 tags

  const nodeSet = new Set(nodes.map(n => n.tag));
  const edges: TagEdge[] = [];

  for (const [key, weight] of Object.entries(pairCounts)) {
    const [source, target] = key.split('|');
    if (nodeSet.has(source) && nodeSet.has(target) && weight >= 2) {
      edges.push({ source, target, weight });
    }
  }

  return { nodes, edges };
}

// ── Smart collections ─────────────────────────────────────────

export interface SmartCollection {
  id: string;
  name: string;
  icon: string;
  type: 'mood' | 'tag' | 'time' | 'category';
  filter: (r: MindReflection) => boolean;
  count: number;
}

export function computeSmartCollections(reflections: MindReflection[]): SmartCollection[] {
  const active = reflections.filter(r => !r.deleted);
  const collections: SmartCollection[] = [];

  // Mood-based collections
  const moodCounts: Record<string, number> = {};
  for (const r of active) {
    if (r.mood) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
  }
  for (const [mood, count] of Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    collections.push({
      id: `mood-${mood}`,
      name: mood,
      icon: mood === '开心' ? '😊' : mood === '平静' ? '🌿' : mood === '焦虑' ? '😰' : mood === '难过' ? '😢' : '💭',
      type: 'mood',
      filter: (r) => r.mood === mood,
      count,
    });
  }

  // Tag-based collections (top 5)
  const tagCounts: Record<string, number> = {};
  for (const r of active) {
    for (const t of r.tags ?? []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }
  for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    collections.push({
      id: `tag-${tag}`,
      name: tag,
      icon: '🏷️',
      type: 'tag',
      filter: (r) => r.tags?.includes(tag) ?? false,
      count,
    });
  }

  // Time-based collections
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * day;
  const monthAgo = now - 30 * day;

  collections.push({
    id: 'time-today',
    name: '今天',
    icon: '📌',
    type: 'time',
    filter: (r) => (r.timestamp ?? 0) > now - day,
    count: active.filter(r => (r.timestamp ?? 0) > now - day).length,
  });
  collections.push({
    id: 'time-week',
    name: '最近7天',
    icon: '📅',
    type: 'time',
    filter: (r) => (r.timestamp ?? 0) > weekAgo,
    count: active.filter(r => (r.timestamp ?? 0) > weekAgo).length,
  });
  collections.push({
    id: 'time-month',
    name: '最近30天',
    icon: '📆',
    type: 'time',
    filter: (r) => (r.timestamp ?? 0) > monthAgo,
    count: active.filter(r => (r.timestamp ?? 0) > monthAgo).length,
  });

  // Pinned collection
  const pinnedCount = active.filter(r => r.isPinned).length;
  if (pinnedCount > 0) {
    collections.push({
      id: 'pinned',
      name: '已置顶',
      icon: '📌',
      type: 'category',
      filter: (r) => r.isPinned,
      count: pinnedCount,
    });
  }

  return collections;
}

// ── Search highlight ──────────────────────────────────────────

export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

export function highlightSearchMatch(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) return [{ text, highlight: false }];

  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerText = text.toLowerCase();

  // Collect all match ranges
  const ranges: [number, number][] = [];
  for (const kw of keywords) {
    let start = 0;
    while (true) {
      const idx = lowerText.indexOf(kw, start);
      if (idx < 0) break;
      ranges.push([idx, idx + kw.length]);
      start = idx + 1;
    }
  }

  if (ranges.length === 0) return [{ text, highlight: false }];

  // Merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1]);
    } else {
      merged.push(ranges[i]);
    }
  }

  // Build segments
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) segments.push({ text: text.slice(cursor, s), highlight: false });
    segments.push({ text: text.slice(s, e), highlight: true });
    cursor = e;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false });
  return segments;
}
