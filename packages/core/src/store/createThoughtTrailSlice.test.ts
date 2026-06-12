import { describe, it, expect } from 'vitest';
import { createThoughtTrailSlice } from './createThoughtTrailSlice';
import type { ThoughtTrail } from '../types/thought-trail';

function makeTestStore(initialState: any = {}) {
  let state: any = {
    thoughtTrails: [],
    reflections: [],
    trailNotes: [],
    planItems: [],
    ...initialState,
  };
  const set = (fn: any) => {
    const patch = typeof fn === 'function' ? fn(state) : fn;
    state = { ...state, ...patch };
  };
  const get = () => state;
  return { state, set, get: get as any };
}

const makeTrail = (overrides: Partial<ThoughtTrail> = {}): ThoughtTrail => ({
  id: 't1',
  name: 'Test Trail',
  reflectionIds: [],
  noteIds: [],
  source: 'manual',
  createdAt: 1000,
  updatedAt: 1000,
  deleted: false,
  ...overrides,
});

describe('createThoughtTrailSlice', () => {
  describe('setInsightCache', () => {
    it('sets insightCache on the trail', () => {
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail()],
      });
      const slice = createThoughtTrailSlice()(set, get);

      const cache = {
        summary: 'test summary',
        keyPoints: ['point 1'],
        turningPoints: ['turn 1'],
        suggestions: ['suggest 1'],
        generatedAt: Date.now(),
        source: 'local' as const,
      };

      slice.setInsightCache('t1', cache);

      const trail = get().thoughtTrails.find((t: any) => t.id === 't1');
      expect(trail.insightCache).toEqual(cache);
    });

    it('overwrites existing insightCache', () => {
      const existingCache = {
        summary: 'old',
        keyPoints: [],
        turningPoints: [],
        suggestions: [],
        generatedAt: 1000,
        source: 'local' as const,
      };
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail({ insightCache: existingCache })],
      });
      const slice = createThoughtTrailSlice()(set, get);

      const newCache = { ...existingCache, summary: 'new', generatedAt: 2000 };
      slice.setInsightCache('t1', newCache);

      const trail = get().thoughtTrails.find((t: any) => t.id === 't1');
      expect(trail.insightCache.summary).toBe('new');
    });
  });

  describe('setReviewCache', () => {
    it('sets reviewCache on the trail', () => {
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail()],
      });
      const slice = createThoughtTrailSlice()(set, get);

      const cache = {
        questions: ['q1', 'q2'],
        observations: ['obs1'],
        suggestions: ['s1'],
        generatedAt: Date.now(),
        source: 'cloud' as const,
      };

      slice.setReviewCache('t1', cache);

      const trail = get().thoughtTrails.find((t: any) => t.id === 't1');
      expect(trail.reviewCache).toEqual(cache);
    });
  });

  describe('createPlanItemFromTrail', () => {
    it('returns false when trail not found', () => {
      const { set, get } = makeTestStore();
      const slice = createThoughtTrailSlice()(set, get);
      const result = slice.createPlanItemFromTrail('missing', {
        name: 'test',
        description: '',
        priority: 'medium',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      expect(result).toBe(false);
    });

    it('returns false when no active plan', () => {
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail()],
      });
      const slice = createThoughtTrailSlice()(set, get);
      const result = slice.createPlanItemFromTrail('t1', {
        name: 'test',
        description: '',
        priority: 'medium',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      expect(result).toBe(false);
    });
  });

  describe('getTrailPlanItems', () => {
    it('returns plan items with matching trailId', () => {
      const { set, get } = makeTestStore({
        planItems: [
          { id: 'p1', trailId: 't1', name: 'task 1', deleted: false },
          { id: 'p2', trailId: 't1', name: 'task 2', deleted: false },
          { id: 'p3', trailId: 't2', name: 'task 3', deleted: false },
          { id: 'p4', trailId: 't1', name: 'task 4', deleted: true },
        ],
      });
      const slice = createThoughtTrailSlice()(set, get);
      const items = slice.getTrailPlanItems('t1');
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('p1');
      expect(items[1].id).toBe('p2');
    });

    it('returns empty array when no matching items', () => {
      const { set, get } = makeTestStore({
        planItems: [{ id: 'p1', trailId: 't2', name: 'task', deleted: false }],
      });
      const slice = createThoughtTrailSlice()(set, get);
      const items = slice.getTrailPlanItems('t1');
      expect(items).toEqual([]);
    });
  });

  describe('deleteThoughtTrail', () => {
    it('cascade deletes trail notes', () => {
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail({ noteIds: ['n1', 'n2'] })],
        trailNotes: [
          { id: 'n1', trailId: 't1', content: 'a', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
          { id: 'n2', trailId: 't1', content: 'b', tags: [], source: 'free', order: 1, createdAt: 2000, updatedAt: 2000, deleted: false },
          { id: 'n3', trailId: 't2', content: 'c', tags: [], source: 'free', order: 0, createdAt: 1000, updatedAt: 1000, deleted: false },
        ],
      });
      const slice = createThoughtTrailSlice()(set, get);

      slice.deleteThoughtTrail('t1');

      const state = get();
      expect(state.thoughtTrails).toHaveLength(0);
      expect(state.trailNotes).toHaveLength(1);
      expect(state.trailNotes[0].id).toBe('n3');
    });

    it('removes trail ID from reflections', () => {
      const { set, get } = makeTestStore({
        thoughtTrails: [makeTrail({ reflectionIds: ['r1', 'r2'] })],
        reflections: [
          { id: 'r1', thoughtTrailIds: ['t1'], updatedAt: 0, deleted: false },
          { id: 'r2', thoughtTrailIds: ['t1', 't2'], updatedAt: 0, deleted: false },
        ],
      });
      const slice = createThoughtTrailSlice()(set, get);

      slice.deleteThoughtTrail('t1');

      const state = get();
      expect(state.reflections[0].thoughtTrailIds).not.toContain('t1');
      expect(state.reflections[1].thoughtTrailIds).toContain('t2');
      expect(state.reflections[1].thoughtTrailIds).not.toContain('t1');
    });
  });
});
