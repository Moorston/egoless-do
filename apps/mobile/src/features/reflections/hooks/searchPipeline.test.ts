import { describe, it, expect, vi } from 'vitest';
import { mergeResults } from './searchPipeline';
import type { MindReflection } from '@egoless-do/core';

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

describe('searchPipeline', () => {
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
});
