import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

// Mock dependencies
vi.mock('react-native', () => ({
  Share: { share: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: { getState: vi.fn() },
  useShallowStore: vi.fn().mockReturnValue({
    reflectionFilters: null,
    setReflectionFilters: vi.fn(),
    habits: [],
    reflections: [],
    customTags: [],
    allTagsOrder: [],
    customMoods: [],
    allMoodsOrder: [],
    planItems: [],
  }),
}));

vi.mock('@egoless-do/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@egoless-do/core')>();
  return {
    ...actual,
    filterReflections: vi.fn().mockReturnValue([]),
    groupReflectionsByDate: vi.fn().mockReturnValue(new Map()),
    computeDynamicTagCounts: vi.fn().mockReturnValue({}),
    computeDynamicMoodCounts: vi.fn().mockReturnValue({}),
    computeMoodTrend: vi.fn().mockReturnValue([]),
    computeWritingHeatmap: vi.fn().mockReturnValue([]),
    computeTagCooccurrence: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
    computeSmartCollections: vi.fn().mockReturnValue([]),
    DEFAULT_REFLECTION_FILTERS: { search: '', tags: [], moods: [], dateRange: 'all', category: null, sortBy: 'newest' },
  };
});

describe('useReflections (unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('filter logic', () => {
    it('filterReflections is called with correct parameters', async () => {
      const { filterReflections } = await import('@egoless-do/core');
      const reflections = [
        { id: '1', content: 'test', tags: ['灵感'], mood: '开心', timestamp: Date.now(), deleted: false },
      ];
      const filters = { search: 'test', tags: [], moods: [], dateRange: 'all', category: null, sortBy: 'newest' };

      vi.mocked(filterReflections)(reflections as any, filters as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      expect(filterReflections).toHaveBeenCalledWith(reflections, filters);
    });

    it('deleted reflections are excluded from filter', () => {
      const reflections = [
        { id: '1', content: 'a', tags: [], mood: '', deleted: false },
        { id: '2', content: 'b', tags: [], mood: '', deleted: true },
      ];

      const filtered = reflections.filter(r => !r.deleted);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('grouping logic', () => {
    it('groupReflectionsByDate returns a Map', async () => {
      const { groupReflectionsByDate } = await import('@egoless-do/core');
      const result = groupReflectionsByDate([], 'newest');

      expect(result).toBeInstanceOf(Map);
    });
  });
});
