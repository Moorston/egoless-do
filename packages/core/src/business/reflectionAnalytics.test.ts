import { describe, it, expect } from 'vitest';
import type { MindReflection } from '../types/reflection';
import {
  computeMoodScore,
  computeMoodTrend,
  computeWritingHeatmap,
  computeTagCooccurrence,
  computeSmartCollections,
  highlightSearchMatch,
} from './reflectionAnalytics';

// ── 构造测试数据 ─────────────────────────────────────────────

const makeRef = (overrides: Partial<MindReflection> = {}): MindReflection => ({
  id: 'r1',
  timestamp: Date.now(),
  content: '今日心情不错',
  mood: '开心',
  tags: ['成长', '感恩'],
  colors: ['#fff', '#000'] as unknown as readonly [string, string],
  isPinned: false,
  isPublished: false,
  updatedAt: 0,
  deleted: false,
  ...overrides,
});

// ── computeMoodScore ──────────────────────────────────────────

describe('computeMoodScore', () => {
  it('should return score for known positive mood', () => {
    expect(computeMoodScore('开心')).toBe(5);
    expect(computeMoodScore('平静')).toBe(4);
    expect(computeMoodScore('感恩')).toBe(5);
  });

  it('should return low score for negative mood', () => {
    expect(computeMoodScore('难过')).toBe(1);
    expect(computeMoodScore('愤怒')).toBe(1);
    expect(computeMoodScore('焦虑')).toBe(2);
  });

  it('should return default score 3 for unknown mood', () => {
    expect(computeMoodScore('未知情绪')).toBe(3);
    expect(computeMoodScore('')).toBe(3);
  });
});

// ── computeMoodTrend ──────────────────────────────────────────

describe('computeMoodTrend', () => {
  it('should return one point per day in range', () => {
    const refs = [makeRef()];
    const trend = computeMoodTrend(refs, 7);
    expect(trend).toHaveLength(7);
  });

  it('should compute avgScore from reflection moods', () => {
    const today = new Date();
    const refs = [
      makeRef({ id: 'r1', mood: '开心', timestamp: today.getTime() }),
      makeRef({ id: 'r2', mood: '平静', timestamp: today.getTime() }),
    ];

    const trend = computeMoodTrend(refs, 1);
    expect(trend[0].avgScore).toBe(4.5);
    expect(trend[0].count).toBe(2);
  });

  it('should skip deleted reflections', () => {
    const today = Date.now();
    const refs = [
      makeRef({ id: 'r1', mood: '开心', timestamp: today, deleted: false }),
      makeRef({ id: 'r2', mood: '难过', timestamp: today, deleted: true }),
    ];

    const trend = computeMoodTrend(refs, 1);
    expect(trend[0].count).toBe(1);
    expect(trend[0].avgScore).toBe(5);
  });

  it('should return zero score for empty days', () => {
    const trend = computeMoodTrend([], 3);
    expect(trend).toHaveLength(3);
    for (const point of trend) {
      expect(point.avgScore).toBe(0);
      expect(point.count).toBe(0);
      expect(point.dominantMood).toBe('');
    }
  });
});

// ── computeWritingHeatmap ──────────────────────────────────────

describe('computeWritingHeatmap', () => {
  it('should return correct number of weeks', () => {
    const refs = [makeRef()];
    const heatmap = computeWritingHeatmap(refs, 1); // 1 week = 7 days
    expect(heatmap).toHaveLength(7);
  });

  it('should handle empty reflections', () => {
    const heatmap = computeWritingHeatmap([], 1); // 1 week = 7 days
    expect(heatmap).toHaveLength(7);
    expect(heatmap.every(h => h.count === 0)).toBe(true);
  });
});

// ── computeTagCooccurrence ────────────────────────────────────

describe('computeTagCooccurrence', () => {
  it('should count tag frequency', () => {
    const refs = [
      makeRef({ id: 'r1', tags: ['成长', '感恩'] }),
      makeRef({ id: 'r2', tags: ['成长', '冥想'] }),
    ];

    const graph = computeTagCooccurrence(refs);
    // 3 unique tags → 3 nodes
    expect(graph.nodes).toHaveLength(3);

    // 成长 appears in 2 reflections
    const growthNode = graph.nodes.find(n => n.tag === '成长');
    expect(growthNode?.count).toBe(2);
  });

  it('should create edges only when weight >= 2', () => {
    // Pair (成长, 感恩) appears twice → edge created
    const refs = [
      makeRef({ id: 'r1', tags: ['成长', '感恩'] }),
      makeRef({ id: 'r2', tags: ['成长', '感恩'] }),
    ];

    const graph = computeTagCooccurrence(refs);
    const growthGrateful = graph.edges.find(
      e => (e.source === '成长' && e.target === '感恩') || (e.source === '感恩' && e.target === '成长')
    );
    expect(growthGrateful).toBeDefined();
    expect(growthGrateful!.weight).toBe(2);
  });

  it('should handle single tag reflections', () => {
    const refs = [
      makeRef({ id: 'r1', tags: ['独处'] }),
      makeRef({ id: 'r2', tags: ['独处'] }),
    ];

    const graph = computeTagCooccurrence(refs);
    expect(graph.nodes).toHaveLength(1); // only one unique tag
    expect(graph.edges).toHaveLength(0); // no co-occurrence
    expect(graph.nodes[0].count).toBe(2);
  });

  it('should handle empty reflections', () => {
    const graph = computeTagCooccurrence([]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});

// ── computeSmartCollections ────────────────────────────────────

describe('computeSmartCollections', () => {
  it('should return collections including time-based ones', () => {
    const refs = [makeRef()];
    const collections = computeSmartCollections(refs);
    expect(collections.length).toBeGreaterThan(0);
    // Always includes time-based collections (today, this week, this month)
    const timeColl = collections.find(c => c.type === 'time');
    expect(timeColl).toBeDefined();
  });

  it('should handle empty reflections gracefully', () => {
    const collections = computeSmartCollections([]);
    // Still returns time-based collections even when empty
    expect(collections.length).toBeGreaterThan(0);
    const timeColl = collections.find(c => c.type === 'time');
    expect(timeColl).toBeDefined();
  });
});

// ── highlightSearchMatch ──────────────────────────────────────

describe('highlightSearchMatch', () => {
  it('should highlight matching portion', () => {
    const segments = highlightSearchMatch('今日心情很好', '心情');
    const match = segments.find(s => s.highlight);
    expect(match).toBeDefined();
    expect(match!.text).toBe('心情');
  });

  it('should return full text as non-highlight when no match', () => {
    const segments = highlightSearchMatch('今日心情很好', 'abc');
    expect(segments).toHaveLength(1);
    expect(segments[0].highlight).toBe(false);
    expect(segments[0].text).toBe('今日心情很好');
  });

  it('should handle empty text', () => {
    const segments = highlightSearchMatch('', '心情');
    // Returns one empty segment
    expect(segments).toHaveLength(1);
    expect(segments[0].highlight).toBe(false);
  });

  it('should handle empty query', () => {
    const segments = highlightSearchMatch('今日心情很好', '');
    expect(segments).toHaveLength(1);
    expect(segments[0].highlight).toBe(false);
  });
});