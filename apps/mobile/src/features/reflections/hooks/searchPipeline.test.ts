/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks use any for partial API payloads */
import type { MindReflection, ReflectionIndex, ScoredReflection, TrailFilters } from '@egoless-do/core';
import {
  parseSmartQuery, computeCandidatePool, buildIndex,
  retrieveTopK, semanticSearchReflections,
} from '@egoless-do/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mergeResults, runAIPhase2, runAIPhase3, type SearchResult } from './searchPipeline';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('@egoless-do/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@egoless-do/core')>();
  return {
    ...actual,
    createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
    parseSmartQuery: vi.fn().mockResolvedValue({ topic: '', filters: {}, question: '' }),
    semanticSearchReflections: vi.fn().mockResolvedValue([]),
    computeCandidatePool: vi.fn().mockReturnValue([]),
    buildIndex: vi.fn().mockReturnValue({}),
    retrieveTopK: vi.fn().mockReturnValue([]),
    isAIRecommendAvailable: vi.fn().mockReturnValue(false),
  };
});

function makeReflection(id: string, overrides: Partial<MindReflection> = {}): MindReflection {
  return {
    id,
    content: `reflection ${id}`,
    timestamp: Date.now(),
    tags: [],
    mood: 'calm',
    deleted: false,
    ...overrides,
  } as MindReflection;
}

/** A valid, empty TrailFilters value — runAIPhase2 requires all three fields. */
const DEFAULT_FILTERS: TrailFilters = { timeRange: 'all', tags: [], moods: [] };

/** Build a full ReflectionIndex (all required fields) for retrieveTopK mocks. */
function makeIndex(id: string): ReflectionIndex {
  return {
    id,
    content: '',
    contentLower: '',
    keywords: [],
    mood: '',
    moodLower: '',
    tags: [],
    tagsLower: [],
    timestamp: 0,
  };
}

/** Build a valid ScoredReflection for retrieveTopK mocks. */
function makeScoredReflection(index: ReflectionIndex, score: number): ScoredReflection {
  return { index, score };
}

describe('searchPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mergeResults', () => {
    it('returns empty array for empty input', () => {
      expect(mergeResults([])).toEqual([]);
    });

    it('sorts direct results by score descending', () => {
      const r1 = makeReflection('a');
      const r2 = makeReflection('b');
      const r3 = makeReflection('c');
      const results = [
        { ref: r1, score: 0.5, source: 'direct' as const },
        { ref: r2, score: 0.9, source: 'direct' as const },
        { ref: r3, score: 0.7, source: 'direct' as const },
      ];
      const merged = mergeResults(results);
      expect(merged.map(r => r.id)).toEqual(['b', 'c', 'a']);
    });

    it('puts direct results before extended results', () => {
      const direct = makeReflection('direct', { content: 'direct' });
      const extended = makeReflection('extended', { content: 'extended' });
      const results = [
        { ref: extended, score: 0.99, source: 'extended' as const },
        { ref: direct, score: 0.5, source: 'direct' as const },
      ];
      const merged = mergeResults(results);
      expect(merged[0].id).toBe('direct');
      expect(merged[1].id).toBe('extended');
    });

    it('sorts extended results by score descending within group', () => {
      const e1 = makeReflection('e1');
      const e2 = makeReflection('e2');
      const results = [
        { ref: e1, score: 0.3, source: 'extended' as const },
        { ref: e2, score: 0.8, source: 'extended' as const },
      ];
      const merged = mergeResults(results);
      expect(merged.map(r => r.id)).toEqual(['e2', 'e1']);
    });

    it('handles mixed direct and extended with correct ordering', () => {
      const d1 = makeReflection('d1');
      const d2 = makeReflection('d2');
      const e1 = makeReflection('e1');
      const results = [
        { ref: e1, score: 0.95, source: 'extended' as const },
        { ref: d1, score: 0.3, source: 'direct' as const },
        { ref: d2, score: 0.8, source: 'direct' as const },
      ];
      const merged = mergeResults(results);
      expect(merged.map(r => r.id)).toEqual(['d2', 'd1', 'e1']);
    });

    it('handles single result', () => {
      const r = makeReflection('only');
      const merged = mergeResults([{ ref: r, score: 1.0, source: 'direct' as const }]);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('only');
    });
  });

  describe('runAIPhase2', () => {
    it('returns shouldReturn=true when result has question and chatHistory is short', async () => {
      const reflections = [makeReflection('r1')];
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: '', filters: {}, question: 'What do you mean?',
      } as any);

      const result = await runAIPhase2(reflections, 'test', DEFAULT_FILTERS, [], new Set(), []);

      expect(result).toEqual({
        smartResult: { topic: '', filters: {}, question: 'What do you mean?' },
        shouldReturn: true,
      });
    });

    it('does not return early when question exists but chatHistory is >= 3', async () => {
      const reflections = [makeReflection('r1')];
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: '', filters: {}, question: 'What do you mean?',
      } as any);

      const result = await runAIPhase2(
        reflections, 'test', DEFAULT_FILTERS, [], new Set(), ['a', 'b', 'c'],
      );

      // question path skipped, no topic/filters either → returns null
      expect(result.smartResult).toBeNull();
      expect(result.shouldReturn).toBe(false);
    });

    it('expands candidates when result has a topic', async () => {
      const r1 = makeReflection('r1');
      const r2 = makeReflection('r2');
      const reflections = [r1, r2];
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: 'meditation', filters: {}, question: '',
      } as any);
      vi.mocked(computeCandidatePool).mockReturnValue([r1, r2]);
      vi.mocked(buildIndex).mockReturnValue([]);
      vi.mocked(retrieveTopK).mockReturnValue([
        makeScoredReflection(makeIndex('r1'), 0.9),
        makeScoredReflection(makeIndex('r2'), 0.7),
      ]);

      const allResults: SearchResult[] = [];
      const existingIds = new Set<string>();
      const result = await runAIPhase2(
        reflections, 'meditation', DEFAULT_FILTERS, allResults, existingIds, [],
      );

      expect(computeCandidatePool).toHaveBeenCalled();
      expect(allResults).toHaveLength(2);
      expect(allResults[0].source).toBe('direct');
      expect(existingIds.has('r1')).toBe(true);
      expect(existingIds.has('r2')).toBe(true);
      expect(result.smartResult).toBeTruthy();
      expect(result.shouldReturn).toBe(false);
    });

    it('expands candidates when result has filters but no topic', async () => {
      const r1 = makeReflection('r1');
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: '', filters: { tags: ['yoga'] }, question: '',
      } as any);
      vi.mocked(computeCandidatePool).mockReturnValue([r1]);
      vi.mocked(buildIndex).mockReturnValue([]);
      vi.mocked(retrieveTopK).mockReturnValue([
        makeScoredReflection(makeIndex('r1'), 0.8),
      ]);

      const allResults: SearchResult[] = [];
      const result = await runAIPhase2(
        [r1], 'yoga', { timeRange: 'all', tags: ['old'], moods: [] }, allResults, new Set(), [],
      );

      expect(computeCandidatePool).toHaveBeenCalledWith(
        [r1],
        expect.objectContaining({ tags: ['yoga'] }),
      );
      expect(allResults).toHaveLength(1);
      expect(result.shouldReturn).toBe(false);
    });

    it('merges filters: uses currentFilters as fallback when result filters are empty', async () => {
      const r1 = makeReflection('r1');
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: '', filters: { tags: [], moods: [] }, question: '',
      } as any);
      vi.mocked(computeCandidatePool).mockReturnValue([r1]);
      vi.mocked(buildIndex).mockReturnValue([]);
      vi.mocked(retrieveTopK).mockReturnValue([]);

      const currentFilters: TrailFilters = { tags: ['meditation'], moods: ['calm'], timeRange: 'week' };
      await runAIPhase2(
        [r1], 'test', currentFilters, [], new Set(), [],
      );

      expect(computeCandidatePool).toHaveBeenCalledWith(
        [r1],
        expect.objectContaining({
          tags: ['meditation'],
          moods: ['calm'],
          timeRange: 'week',
        }),
      );
    });

    it('deduplicates results via existingIds', async () => {
      const r1 = makeReflection('r1');
      const r2 = makeReflection('r2');
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: 'mindfulness', filters: {}, question: '',
      } as any);
      vi.mocked(computeCandidatePool).mockReturnValue([r1, r2]);
      vi.mocked(buildIndex).mockReturnValue([]);
      vi.mocked(retrieveTopK).mockReturnValue([
        makeScoredReflection(makeIndex('r1'), 0.9),
        makeScoredReflection(makeIndex('r2'), 0.7),
      ]);

      const allResults: SearchResult[] = [];
      const existingIds = new Set(['r1']); // r1 already seen
      await runAIPhase2(
        [r1, r2], 'mindfulness', DEFAULT_FILTERS, allResults, existingIds, [],
      );

      // only r2 should be added
      expect(allResults).toHaveLength(1);
      expect(allResults[0].ref.id).toBe('r2');
    });

    it('returns null smartResult when no question, topic, or filters', async () => {
      vi.mocked(parseSmartQuery).mockResolvedValue({
        topic: '', filters: {}, question: '',
      } as any);

      const result = await runAIPhase2(
        [], 'query', DEFAULT_FILTERS, [], new Set(), [],
      );

      expect(result.smartResult).toBeNull();
      expect(result.shouldReturn).toBe(false);
    });

    it('returns null smartResult and shouldReturn=false on error', async () => {
      vi.mocked(parseSmartQuery).mockRejectedValue(new Error('AI down'));

      const result = await runAIPhase2(
        [makeReflection('r1')], 'test', DEFAULT_FILTERS, [], new Set(), [],
      );

      expect(result.smartResult).toBeNull();
      expect(result.shouldReturn).toBe(false);
    });
  });

  describe('runAIPhase3', () => {
    it('adds semantic results sorted by relevance with source=extended', async () => {
      const r1 = makeReflection('r1');
      const r2 = makeReflection('r2');
      vi.mocked(semanticSearchReflections).mockResolvedValue([
        { reflectionIndex: 1, relevance: 0.6 },
        { reflectionIndex: 0, relevance: 0.9 },
      ] as any);

      const allResults: SearchResult[] = [];
      const existingIds = new Set<string>();
      const result = await runAIPhase3([r1, r2], 'peace', allResults, existingIds);

      // sorted by relevance descending: index 0 (0.9) first, then index 1 (0.6)
      expect(allResults).toHaveLength(2);
      expect(allResults[0].ref.id).toBe('r1');
      expect(allResults[0].score).toBeCloseTo(0.45); // 0.9 * 0.5
      expect(allResults[0].source).toBe('extended');
      expect(allResults[1].ref.id).toBe('r2');
      expect(allResults[1].score).toBeCloseTo(0.3); // 0.6 * 0.5
      expect(existingIds.has('r1')).toBe(true);
      expect(existingIds.has('r2')).toBe(true);
      expect(result).toEqual({ count: 2, failed: false });
    });

    it('returns count=0 when semantic search returns empty', async () => {
      vi.mocked(semanticSearchReflections).mockResolvedValue([]);

      const allResults: SearchResult[] = [];
      const result = await runAIPhase3(
        [makeReflection('r1')], 'test', allResults, new Set(),
      );

      expect(allResults).toHaveLength(0);
      expect(result).toEqual({ count: 0, failed: false });
    });

    it('returns count=0 and failed=true on error', async () => {
      vi.mocked(semanticSearchReflections).mockRejectedValue(
        new Error('embedding service down'),
      );

      const result = await runAIPhase3(
        [makeReflection('r1')], 'test', [], new Set(),
      );

      expect(result).toEqual({ count: 0, failed: true });
    });

    it('deduplicates: skips reflections already in existingIds', async () => {
      const r1 = makeReflection('r1');
      const r2 = makeReflection('r2');
      vi.mocked(semanticSearchReflections).mockResolvedValue([
        { reflectionIndex: 0, relevance: 0.9 },
        { reflectionIndex: 1, relevance: 0.7 },
      ] as any);

      const allResults: SearchResult[] = [];
      const existingIds = new Set(['r1']); // r1 already seen
      const result = await runAIPhase3([r1, r2], 'test', allResults, existingIds);

      expect(allResults).toHaveLength(1);
      expect(allResults[0].ref.id).toBe('r2');
      // count reports total semantic matches, not added count
      expect(result.count).toBe(2);
    });

    it('skips results where reflectionIndex is out of bounds', async () => {
      const r1 = makeReflection('r1');
      vi.mocked(semanticSearchReflections).mockResolvedValue([
        { reflectionIndex: 0, relevance: 0.8 },
        { reflectionIndex: 5, relevance: 0.9 }, // out of bounds
      ] as any);

      const allResults: SearchResult[] = [];
      const result = await runAIPhase3([r1], 'test', allResults, new Set());

      // only r1 is added; index 5 is undefined → skipped
      expect(allResults).toHaveLength(1);
      expect(allResults[0].ref.id).toBe('r1');
      expect(result.count).toBe(2);
    });
  });
});
