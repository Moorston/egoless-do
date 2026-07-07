import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeLocalInsights } from './insight-profile';
import type { MindReflection } from '../types/reflection';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-07T12:00:00')); });
afterEach(() => { vi.useRealTimers(); });

function makeReflection(overrides: Partial<MindReflection> = {}): MindReflection {
  return {
    id: 'r1', content: 'test', mood: '开心', tags: [],
    timestamp: Date.now(), deleted: false,
    ...overrides,
  } as MindReflection;
}

// ─── computeLocalInsights ─────────────────────────────────────
describe('computeLocalInsights', () => {
  it('returns zero counts for empty input', () => {
    const result = computeLocalInsights([], 'week');
    expect(result.totalCount).toBe(0);
    expect(result.avgPerDay).toBe(0);
    expect(result.streakDays).toBe(0);
    expect(result.hotTags).toEqual([]);
    expect(result.moodDistribution).toEqual([]);
  });

  it('counts active reflections within time range', () => {
    const now = Date.now();
    const r = [
      makeReflection({ id: 'r1', timestamp: now - 86400000 }),      // 1 day ago
      makeReflection({ id: 'r2', timestamp: now - 2 * 86400000 }),  // 2 days ago
      makeReflection({ id: 'r3', timestamp: now - 40 * 86400000 }), // 40 days ago
    ];
    const week = computeLocalInsights(r, 'week');
    expect(week.totalCount).toBe(2);

    const month = computeLocalInsights(r, 'month'); // 30-day window
    expect(month.totalCount).toBe(2); // 40 days ago is outside 30-day window
  });

  it('excludes deleted reflections', () => {
    const r = [
      makeReflection({ id: 'r1', deleted: false, timestamp: Date.now() }),
      makeReflection({ id: 'r2', deleted: true, timestamp: Date.now() }),
    ];
    const result = computeLocalInsights(r, 'week');
    expect(result.totalCount).toBe(1);
  });

  it('computes mood distribution', () => {
    const r = [
      makeReflection({ mood: '开心', timestamp: Date.now() }),
      makeReflection({ mood: '开心', timestamp: Date.now() }),
      makeReflection({ mood: '焦虑', timestamp: Date.now() }),
    ];
    const result = computeLocalInsights(r, 'week');
    expect(result.moodDistribution).toHaveLength(2);
    expect(result.moodDistribution[0].mood).toBe('开心');
    expect(result.moodDistribution[0].count).toBe(2);
    expect(result.moodDistribution[0].percentage).toBe(67);
  });

  it('computes hot tags with trend', () => {
    const now = Date.now();
    const prev = Array.from({ length: 2 }, (_, i) => makeReflection({
      id: `prev${i}`, tags: ['工作'], timestamp: now - 15 * 86400000,
    }));
    const curr = Array.from({ length: 4 }, (_, i) => makeReflection({
      id: `curr${i}`, tags: ['工作'], timestamp: now - 2 * 86400000,
    }));
    const result = computeLocalInsights([...prev, ...curr], 'month');
    const workTag = result.hotTags.find(t => t.tag === '工作');
    expect(workTag).toBeDefined();
    expect(workTag!.trend).toBe('rising');
  });

  it('returns correct timeRange', () => {
    const result = computeLocalInsights([], 'month');
    expect(result.timeRange).toBe('month');
  });

  it('computes avgPerDay', () => {
    const r = Array.from({ length: 7 }, (_, i) => makeReflection({
      id: `r${i}`, timestamp: Date.now() - i * 86400000,
    }));
    const result = computeLocalInsights(r, 'week');
    expect(result.avgPerDay).toBe(1); // 7 / 7 = 1
  });
});
