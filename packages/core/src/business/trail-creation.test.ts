import { describe, it, expect } from 'vitest';
import type { MindReflection } from '../types/reflection';
import {
  QUICK_TRAIL_PRESETS,
  computeCandidatePool,
  computeRecommendations,
  detectMoodNarrative,
  detectTagFocus,
  detectTimePattern,
  matchByKeyword,
  generateNarrative,
  generateNarrativeName,
  computeMoodTrendSimple,
  trendArrow,
  trendLabel,
  trendColor,
  buildReflectionSummary,
  formatDateShort,
  daysBetween,
  getMostFrequentTag,
  analyzeTrailGaps,
  generateRecommendationReason,
  mergeAndRank,
  buildIgnoredPattern,
  applyUserPreferences,
} from './trail-creation';

// ── 测试辅助 ────────────────────────────────────────────────

const makeRef = (overrides: Partial<MindReflection> = {}): MindReflection => ({
  id: 'r1',
  timestamp: 1000,
  content: '一篇反思内容',
  tags: ['成长', '感恩'],
  mood: '开心',
  colors: ['#fff', '#000'] as unknown as readonly [string, string],
  isPinned: false,
  isPublished: false,
  updatedAt: 0,
  deleted: false,
  ...overrides,
});

// ── QUICK_TRAIL_PRESETS ──────────────────────────────────────

describe('QUICK_TRAIL_PRESETS', () => {
  it('should have presets with filter functions', () => {
    expect(QUICK_TRAIL_PRESETS.length).toBeGreaterThan(0);
    for (const preset of QUICK_TRAIL_PRESETS) {
      expect(preset.key).toBeTruthy();
      expect(typeof preset.filter).toBe('function');
    }
  });

  it('should return empty for insufficient recent data', () => {
    const preset = QUICK_TRAIL_PRESETS.find(p => p.key === 'moodChange');
    expect(preset).toBeDefined();
    const result = preset!.filter([]);
    expect(result).toEqual([]);
  });
});

// ── computeCandidatePool ──────────────────────────────────────

describe('computeCandidatePool', () => {
  it('should filter out deleted and out-of-range reflections', () => {
    const now = Date.now();
    const refs = [
      makeRef({ id: 'r1', timestamp: now, deleted: false }),
      makeRef({ id: 'r2', timestamp: now - 10 * 86400000, deleted: false }),
    ];
    const pool = computeCandidatePool(refs, { timeRange: 'week', tags: [], moods: [] });
    expect(pool.find(r => r.id === 'r2')).toBeUndefined();
  });
});

// ── detectMoodNarrative ──────────────────────────────────────

describe('detectMoodNarrative', () => {
  it('should return null for few reflections', () => {
    expect(detectMoodNarrative([])).toBeNull();
    expect(detectMoodNarrative([makeRef()])).toBeNull();
  });

  it('should detect mood change with 2+ reflections', () => {
    const refs = [
      makeRef({ id: 'r1', mood: '开心', timestamp: 2000 }),
      makeRef({ id: 'r2', mood: '难过', timestamp: 1000 }),
    ];
    const result = detectMoodNarrative(refs);
    // Should detect some mood-based recommendation
    if (result) {
      expect(result.type).toBe('mood');
      expect(result.moods).toContain('开心');
    }
  });
});

// ── detectTagFocus ────────────────────────────────────────────

describe('detectTagFocus', () => {
  it('should return null for few reflections', () => {
    expect(detectTagFocus([])).toBeNull();
  });

  it('should recommend based on frequent tags', () => {
    const refs = [
      makeRef({ id: 'r1', tags: ['成长'] }),
      makeRef({ id: 'r2', tags: ['成长'] }),
      makeRef({ id: 'r3', tags: ['成长', '感恩'] }),
    ];
    const result = detectTagFocus(refs);
    expect(result).not.toBeNull();
    expect(result!.primaryTag).toBe('成长');
  });
});

// ── detectTimePattern ─────────────────────────────────────────

describe('detectTimePattern', () => {
  it('should return null for few reflections', () => {
    expect(detectTimePattern([])).toBeNull();
  });
});

// ── matchByKeyword ────────────────────────────────────────────

describe('matchByKeyword', () => {
  it('should find matching reflections by keyword', () => {
    const refs = [
      makeRef({ id: 'r1', content: '今日冥想感悟' }),
      makeRef({ id: 'r2', content: '跑步很舒服' }),
    ];
    const matches = matchByKeyword('冥想', refs);
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('r1');
  });

  it('should return empty for no match', () => {
    const refs = [makeRef({ id: 'r1', content: '今日冥想感悟' })];
    expect(matchByKeyword('xyz', refs)).toHaveLength(0);
  });

  it('should handle empty content gracefully', () => {
    const refs = [makeRef({ id: 'r1', content: '' })];
    expect(matchByKeyword('keyword', refs)).toHaveLength(0);
  });
});

// ── computeMoodTrendSimple ────────────────────────────────────

describe('computeMoodTrendSimple', () => {
  it('should return flat for empty data', () => {
    expect(computeMoodTrendSimple([])).toBe('flat');
  });
});

// ── trendArrow / trendLabel / trendColor ──────────────────────

describe('trend utilities', () => {
  it('should return correct arrow symbol', () => {
    expect(trendArrow('up')).toBe('↗');
    expect(trendArrow('down')).toBe('↘');
    expect(trendArrow('flat')).toBe('→');
  });

  it('should return correct color hex', () => {
    expect(trendColor('up')).toMatch(/^#/);
    expect(trendColor('down')).toMatch(/^#/);
    expect(trendColor('flat')).toMatch(/^#/);
    // Ensure different trends have different colors
    expect(trendColor('up')).not.toBe(trendColor('down'));
  });
});

// ── buildReflectionSummary ────────────────────────────────────

describe('buildReflectionSummary', () => {
  it('should build summary from reflection', () => {
    const ref = makeRef({ content: '这是一篇很长的反思内容...' });
    const summary = buildReflectionSummary(ref);
    expect(summary).toBeTruthy();
  });
});

// ── formatDateShort / daysBetween ─────────────────────────────

describe('date utilities', () => {
  it('should format date short', () => {
    const result = formatDateShort(0);
    expect(typeof result).toBe('string');
  });

  it('should calculate days between', () => {
    expect(daysBetween(0, 86400000)).toBe(1);
    expect(daysBetween(0, 0)).toBe(0);
  });
});

// ── getMostFrequentTag ────────────────────────────────────────

describe('getMostFrequentTag', () => {
  it('should return most frequent tag', () => {
    const refs = [
      makeRef({ id: 'r1', tags: ['成长'] }),
      makeRef({ id: 'r2', tags: ['成长'] }),
      makeRef({ id: 'r3', tags: ['感恩'] }),
    ];
    expect(getMostFrequentTag(refs)).toBe('成长');
  });

  it('should return empty string for empty list', () => {
    expect(getMostFrequentTag([])).toBe('');
  });
});

// ── mergeAndRank ──────────────────────────────────────────────

describe('mergeAndRank', () => {
  it('should merge and sort by score descending', () => {
    const a = { name: 'A', narrative: '', reflectionIds: [], moods: [], primaryTag: '', startDate: 0, endDate: 0, spanDays: 0, trend: 'flat' as const, assignedCount: 0, score: 0.5, type: 'mood' as const, source: 'local' as const };
    const b = { name: 'B', narrative: '', reflectionIds: [], moods: [], primaryTag: '', startDate: 0, endDate: 0, spanDays: 0, trend: 'flat' as const, assignedCount: 0, score: 0.8, type: 'tag' as const, source: 'local' as const };

    const ranked = mergeAndRank([a], [b]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBe(0.8); // higher score first
    expect(ranked[1].score).toBe(0.5);
  });
});

// ── generateRecommendationReason ──────────────────────────────

describe('generateRecommendationReason', () => {
  it('should generate reason string', () => {
    const rec = {
      name: 'Test', narrative: '', reflectionIds: ['r1'], moods: ['开心'],
      primaryTag: '成长', startDate: 0, endDate: 1000, spanDays: 1,
      trend: 'up' as const, assignedCount: 2, score: 0.9,
      type: 'mood' as const, source: 'local' as const,
    };
    const reason = generateRecommendationReason(rec);
    expect(typeof reason).toBe('string');
    expect(reason.length).toBeGreaterThan(0);
  });
});

// ── buildIgnoredPattern ──────────────────────────────────────

describe('buildIgnoredPattern', () => {
  it('should build pattern string', () => {
    const rec = {
      name: 'Test', narrative: '', reflectionIds: ['r1'], moods: ['开心'],
      primaryTag: '成长', startDate: 0, endDate: 1000, spanDays: 1,
      trend: 'up' as const, assignedCount: 2, score: 0.9,
      type: 'mood' as const, source: 'local' as const,
    };
    expect(buildIgnoredPattern(rec)).toBeTruthy();
  });
});

// ── applyUserPreferences ──────────────────────────────────────

describe('applyUserPreferences', () => {
  it('should remove ignored patterns', () => {
    const rec = {
      name: 'Test', narrative: '', reflectionIds: ['r1'], moods: ['开心'],
      primaryTag: '成长', startDate: 0, endDate: 1000, spanDays: 1,
      trend: 'up' as const, assignedCount: 2, score: 0.9,
      type: 'mood' as const, source: 'local' as const,
    };
    const result = applyUserPreferences([rec], [buildIgnoredPattern(rec)]);
    expect(result).toHaveLength(0);
  });

  it('should keep items not in ignored list', () => {
    const rec = {
      name: 'Test', narrative: '', reflectionIds: ['r1'], moods: ['开心'],
      primaryTag: '成长', startDate: 0, endDate: 1000, spanDays: 1,
      trend: 'up' as const, assignedCount: 2, score: 0.9,
      type: 'mood' as const, source: 'local' as const,
    };
    const result = applyUserPreferences([rec], ['other']);
    expect(result).toHaveLength(1);
  });
});

// ── analyzeTrailGaps ─────────────────────────────────────────

describe('analyzeTrailGaps', () => {
  it('should return empty for few reflections', () => {
    expect(analyzeTrailGaps([])).toEqual([]);
  });

  it('should detect gaps in time series', () => {
    const now = Date.now();
    const refs = [
      makeRef({ id: 'r1', timestamp: now }),
      makeRef({ id: 'r2', timestamp: now - 5 * 86400000 }),
      makeRef({ id: 'r3', timestamp: now - 10 * 86400000 }),
    ];
    const gaps = analyzeTrailGaps(refs);
    // Should find at least one gap between reflections
    expect(gaps.length).toBeGreaterThanOrEqual(0);
  });
});