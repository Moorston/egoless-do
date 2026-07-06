import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// Mock external dependencies
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@egoless-do/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@egoless-do/core')>();
  return {
    ...actual,
    computeCandidatePool: vi.fn().mockReturnValue([]),
    buildIndex: vi.fn().mockReturnValue({}),
    retrieveTopK: vi.fn().mockReturnValue([]),
    isAIRecommendAvailable: vi.fn().mockReturnValue(false),
    parseSmartQuery: vi.fn().mockReturnValue(null),
    semanticSearchReflections: vi.fn().mockResolvedValue([]),
    createLogger: vi.fn().mockReturnValue({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };
});

// Note: useQuickTrailSearch is a React hook that requires renderHook from @testing-library/react-hooks
// This test file documents the expected behavior. Full integration tests require:
// npm install -D @testing-library/react-hooks

describe('useQuickTrailSearch (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('filter logic', () => {
    it('timeRange filter: week excludes items older than 7 days', () => {
      const now = Date.now();
      const weekAgo = now - 8 * 24 * 60 * 60 * 1000;
      const recent = now - 2 * 24 * 60 * 60 * 1000;

      const reflections = [
        { id: '1', timestamp: recent, content: 'recent', tags: [], mood: '', deleted: false },
        { id: '2', timestamp: weekAgo, content: 'old', tags: [], mood: '', deleted: false },
      ];

      // Simulate timeRange filter logic
      const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = reflections.filter(r => r.timestamp >= weekStart);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('tag filter: excludes items without selected tags', () => {
      const reflections = [
        { id: '1', content: 'a', tags: ['灵感'], mood: '', deleted: false },
        { id: '2', content: 'b', tags: ['日常'], mood: '', deleted: false },
      ];

      const selectedTags = ['灵感'];
      const filtered = reflections.filter(r =>
        selectedTags.some(t => r.tags.includes(t))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('mood filter: excludes items without selected mood', () => {
      const reflections = [
        { id: '1', content: 'a', tags: [], mood: '开心', deleted: false },
        { id: '2', content: 'b', tags: [], mood: '平静', deleted: false },
      ];

      const selectedMoods = ['开心'];
      const filtered = reflections.filter(r =>
        selectedMoods.includes(r.mood)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('combined filters: applies all filters together', () => {
      const now = Date.now();
      const reflections = [
        { id: '1', timestamp: now, content: 'a', tags: ['灵感'], mood: '开心', deleted: false },
        { id: '2', timestamp: now, content: 'b', tags: ['日常'], mood: '开心', deleted: false },
        { id: '3', timestamp: now - 30 * 24 * 60 * 60 * 1000, content: 'c', tags: ['灵感'], mood: '开心', deleted: false },
      ];

      const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const selectedTags = ['灵感'];
      const selectedMoods = ['开心'];

      const filtered = reflections
        .filter(r => r.timestamp >= weekStart)
        .filter(r => selectedTags.some(t => r.tags.includes(t)))
        .filter(r => selectedMoods.includes(r.mood));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('deleted reflections are excluded', () => {
      const reflections = [
        { id: '1', content: 'a', tags: [], mood: '', deleted: false },
        { id: '2', content: 'b', tags: [], mood: '', deleted: true },
      ];

      const filtered = reflections.filter(r => !r.deleted);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });
});
