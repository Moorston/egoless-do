import { describe, it, expect } from 'vitest';
import { aggregateMarkers, shouldCluster, getClusterStyle } from './markerAggregation';
import type { GlobalCheckin } from '../types/globalPulse';

function makeCheckin(overrides: Partial<GlobalCheckin> = {}): GlobalCheckin {
  return {
    checkin_id: 'c1',
    user_hash: 'u1',
    lat: 39.9,
    lng: 116.4,
    streak: 1,
    total_days: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  } as GlobalCheckin;
}

// ─── aggregateMarkers ────────────────────────────────────────
describe('aggregateMarkers', () => {
  it('returns individual markers when count <= 50', () => {
    const checkins = Array.from({ length: 10 }, (_, i) => makeCheckin({ checkin_id: `c${i}` }));
    const result = aggregateMarkers(checkins, 5);
    expect(result).toHaveLength(10);
    expect(result[0].count).toBe(1);
  });

  it('returns individual markers when zoom >= 10', () => {
    const checkins = Array.from({ length: 100 }, (_, i) => makeCheckin({ checkin_id: `c${i}` }));
    const result = aggregateMarkers(checkins, 10);
    expect(result).toHaveLength(100);
  });

  it('clusters nearby markers at low zoom', () => {
    // All at same location → should cluster into 1
    const checkins = Array.from({ length: 100 }, (_, i) => makeCheckin({
      checkin_id: `c${i}`, lat: 39.9, lng: 116.4,
    }));
    const result = aggregateMarkers(checkins, 3);
    expect(result.length).toBeLessThan(100);
    expect(result[0].count).toBeGreaterThan(1);
  });

  it('preserves checkin references in clusters', () => {
    // Need > 50 checkins for clustering to kick in
    const checkins = Array.from({ length: 60 }, (_, i) => makeCheckin({
      checkin_id: `c${i}`, lat: 39.9, lng: 116.4,
    }));
    const result = aggregateMarkers(checkins, 3);
    expect(result[0].checkins.length).toBeGreaterThan(1);
  });

  it('handles empty input', () => {
    expect(aggregateMarkers([], 5)).toEqual([]);
  });
});

// ─── shouldCluster ────────────────────────────────────────────
describe('shouldCluster', () => {
  it('returns true for same grid cell', () => {
    expect(shouldCluster({ lat: 39.9, lng: 116.4 }, { lat: 39.91, lng: 116.41 }, 5, 400)).toBe(true);
  });

  it('returns false for distant markers', () => {
    expect(shouldCluster({ lat: 39.9, lng: 116.4 }, { lat: 0, lng: 0 }, 5, 400)).toBe(false);
  });
});

// ─── getClusterStyle ──────────────────────────────────────────
describe('getClusterStyle', () => {
  it('returns large red style for 100+ count', () => {
    const style = getClusterStyle(100);
    expect(style.size).toBe(60);
    expect(style.color).toBe('#EF4444');
  });

  it('returns medium amber style for 50-99', () => {
    const style = getClusterStyle(50);
    expect(style.color).toBe('#F59E0B');
  });

  it('returns small indigo style for < 10', () => {
    const style = getClusterStyle(5);
    expect(style.size).toBe(32);
    expect(style.color).toBe('#6366F1');
  });

  it('returns decreasing sizes for increasing counts', () => {
    const small = getClusterStyle(5);
    const medium = getClusterStyle(15);
    const large = getClusterStyle(55);
    expect(large.size).toBeGreaterThan(medium.size);
    expect(medium.size).toBeGreaterThan(small.size);
  });
});
