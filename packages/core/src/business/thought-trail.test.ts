import { describe, it, expect } from 'vitest';
import type { ThoughtTrail } from '../types/thought-trail';
import type { MindReflection } from '../types/reflection';
import type { TrailNote } from '../types/trail-note';
import { getTrailOverview, getRelatedTrails, getTrailTimelineItems } from './thought-trail';

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

const makeReflection = (overrides: Partial<MindReflection> = {}): MindReflection => ({
  id: 'r1',
  timestamp: 1000,
  content: 'hello',
  tags: ['t1'],
  mood: '开心',
  colors: ['#fff', '#000'] as unknown as readonly [string, string],
  isPinned: false,
  isPublished: false,
  updatedAt: 0,
  deleted: false,
  ...overrides,
});

const makeNote = (overrides: Partial<TrailNote> = {}): TrailNote => ({
  id: 'n1',
  trailId: 't1',
  content: 'note content',
  tags: ['t1'],
  source: 'free',
  order: 0,
  createdAt: 2000,
  updatedAt: 2000,
  deleted: false,
  ...overrides,
});

describe('getTrailOverview', () => {
  it('returns empty overview for empty trail', () => {
    const trail = makeTrail();
    const result = getTrailOverview(trail, [], []);
    expect(result.reflectionCount).toBe(0);
    expect(result.noteCount).toBe(0);
    expect(result.daySpan).toBe(0);
    expect(result.dateRange).toBeNull();
    expect(result.moodChanges).toEqual([]);
    expect(result.trend).toBe('flat');
    expect(result.topTags).toEqual([]);
  });

  it('counts reflections and notes correctly', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2'], noteIds: ['n1'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000 }),
      makeReflection({ id: 'r2', timestamp: 2000 }),
    ];
    const notes = [makeNote({ id: 'n1', createdAt: 3000 })];
    const result = getTrailOverview(trail, reflections, notes);
    expect(result.reflectionCount).toBe(2);
    expect(result.noteCount).toBe(1);
  });

  it('calculates day span correctly', () => {
    const DAY = 1000 * 60 * 60 * 24;
    const trail = makeTrail({ reflectionIds: ['r1', 'r2'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: Date.now() }),
      makeReflection({ id: 'r2', timestamp: Date.now() + 5 * DAY }),
    ];
    const result = getTrailOverview(trail, reflections, []);
    expect(result.daySpan).toBe(5);
  });

  it('detects mood changes', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2', 'r3'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000, mood: '开心' }),
      makeReflection({ id: 'r2', timestamp: 2000, mood: '焦虑' }),
      makeReflection({ id: 'r3', timestamp: 3000, mood: '平静' }),
    ];
    const result = getTrailOverview(trail, reflections, []);
    expect(result.moodChanges).toEqual(['开心', '焦虑', '平静']);
  });

  it('skips consecutive same moods', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2', 'r3'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000, mood: '开心' }),
      makeReflection({ id: 'r2', timestamp: 2000, mood: '开心' }),
      makeReflection({ id: 'r3', timestamp: 3000, mood: '平静' }),
    ];
    const result = getTrailOverview(trail, reflections, []);
    expect(result.moodChanges).toEqual(['开心', '平静']);
  });

  it('computes top tags', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2'], noteIds: ['n1'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000, tags: ['#a', '#b'] }),
      makeReflection({ id: 'r2', timestamp: 2000, tags: ['#a', '#c'] }),
    ];
    const notes = [makeNote({ id: 'n1', createdAt: 3000, tags: ['#a'] })];
    const result = getTrailOverview(trail, reflections, notes);
    expect(result.topTags[0].tag).toBe('#a');
    expect(result.topTags[0].count).toBe(3);
  });

  it('ignores deleted reflections and notes', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2'], noteIds: ['n1'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000, deleted: true }),
      makeReflection({ id: 'r2', timestamp: 2000 }),
    ];
    const notes = [makeNote({ id: 'n1', createdAt: 3000, deleted: true })];
    const result = getTrailOverview(trail, reflections, notes);
    expect(result.reflectionCount).toBe(1);
    expect(result.noteCount).toBe(0);
  });
});

describe('getRelatedTrails', () => {
  it('returns empty when current trail has no tags', () => {
    const current = makeTrail({ id: 't1', reflectionIds: ['r1'] });
    const reflections = [makeReflection({ id: 'r1', tags: [] })];
    const result = getRelatedTrails(current, [current], reflections, []);
    expect(result).toEqual([]);
  });

  it('returns trails with overlapping tags', () => {
    const t1 = makeTrail({ id: 't1', reflectionIds: ['r1', 'r2'] });
    const t2 = makeTrail({ id: 't2', reflectionIds: ['r3', 'r4'] });
    const reflections = [
      makeReflection({ id: 'r1', tags: ['#a', '#b'] }),
      makeReflection({ id: 'r2', tags: ['#a', '#b'] }),
      makeReflection({ id: 'r3', tags: ['#a', '#c'] }),
      makeReflection({ id: 'r4', tags: ['#a', '#c'] }),
    ];
    const result = getRelatedTrails(t1, [t1, t2], reflections, [], 3);
    expect(result.length).toBe(1);
    expect(result[0].trail.id).toBe('t2');
    expect(result[0].similarity).toBeGreaterThan(0);
  });

  it('excludes current trail from results', () => {
    const t1 = makeTrail({ id: 't1', reflectionIds: ['r1'] });
    const reflections = [makeReflection({ id: 'r1', tags: ['#a'] })];
    const result = getRelatedTrails(t1, [t1], reflections, []);
    expect(result).toEqual([]);
  });

  it('excludes deleted trails', () => {
    const t1 = makeTrail({ id: 't1', reflectionIds: ['r1', 'r2'] });
    const t2 = makeTrail({ id: 't2', reflectionIds: ['r3', 'r4'], deleted: true });
    const reflections = [
      makeReflection({ id: 'r1', tags: ['#a'] }),
      makeReflection({ id: 'r2', tags: ['#a'] }),
      makeReflection({ id: 'r3', tags: ['#a'] }),
      makeReflection({ id: 'r4', tags: ['#a'] }),
    ];
    const result = getRelatedTrails(t1, [t1, t2], reflections, []);
    expect(result).toEqual([]);
  });

  it('only considers tags with frequency >= 2', () => {
    const t1 = makeTrail({ id: 't1', reflectionIds: ['r1', 'r2'] });
    const t2 = makeTrail({ id: 't2', reflectionIds: ['r3', 'r4'] });
    const reflections = [
      makeReflection({ id: 'r1', tags: ['#a', '#x'] }),
      makeReflection({ id: 'r2', tags: ['#a', '#x'] }),
      makeReflection({ id: 'r3', tags: ['#a'] }),
      makeReflection({ id: 'r4', tags: ['#b'] }),
    ];
    // t1 tags: #a (2), #x (2) → {#a, #x}
    // t2 tags: #a (1), #b (1) → empty set (none >= 2)
    const result = getRelatedTrails(t1, [t1, t2], reflections, []);
    expect(result).toEqual([]);
  });

  it('respects limit parameter', () => {
    const t1 = makeTrail({ id: 't1', reflectionIds: ['r1', 'r2'] });
    const t2 = makeTrail({ id: 't2', reflectionIds: ['r3', 'r4'] });
    const t3 = makeTrail({ id: 't3', reflectionIds: ['r5', 'r6'] });
    const reflections = [
      makeReflection({ id: 'r1', tags: ['#a'] }),
      makeReflection({ id: 'r2', tags: ['#a'] }),
      makeReflection({ id: 'r3', tags: ['#a'] }),
      makeReflection({ id: 'r4', tags: ['#a'] }),
      makeReflection({ id: 'r5', tags: ['#a'] }),
      makeReflection({ id: 'r6', tags: ['#a'] }),
    ];
    const result = getRelatedTrails(t1, [t1, t2, t3], reflections, [], 1);
    expect(result.length).toBe(1);
  });
});

describe('getTrailTimelineItems', () => {
  it('returns empty for empty trail', () => {
    const trail = makeTrail();
    const result = getTrailTimelineItems(trail, [], []);
    expect(result).toEqual([]);
  });

  it('merges reflections and notes sorted by timestamp', () => {
    const trail = makeTrail({ reflectionIds: ['r1'], noteIds: ['n1'] });
    const reflections = [makeReflection({ id: 'r1', timestamp: 3000 })];
    const notes = [makeNote({ id: 'n1', createdAt: 1000 })];
    const result = getTrailTimelineItems(trail, reflections, notes);
    expect(result.length).toBe(2);
    expect(result[0].kind).toBe('note');
    expect(result[0].timestamp).toBe(1000);
    expect(result[1].kind).toBe('reflection');
    expect(result[1].timestamp).toBe(3000);
  });

  it('skips deleted reflections and notes', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'r2'], noteIds: ['n1'] });
    const reflections = [
      makeReflection({ id: 'r1', timestamp: 1000, deleted: true }),
      makeReflection({ id: 'r2', timestamp: 3000 }),
    ];
    const notes = [makeNote({ id: 'n1', createdAt: 2000, deleted: true })];
    const result = getTrailTimelineItems(trail, reflections, notes);
    expect(result.length).toBe(1);
    expect(result[0].kind).toBe('reflection');
  });

  it('handles missing reflections gracefully', () => {
    const trail = makeTrail({ reflectionIds: ['r1', 'missing'] });
    const reflections = [makeReflection({ id: 'r1', timestamp: 1000 })];
    const result = getTrailTimelineItems(trail, reflections, []);
    expect(result.length).toBe(1);
  });
});
