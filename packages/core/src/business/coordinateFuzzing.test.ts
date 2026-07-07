import { describe, it, expect } from 'vitest';
import { fuzzCoordinate, isValidCoordinate, calculateDistance } from './coordinateFuzzing';

// ─── isValidCoordinate ───────────────────────────────────────
describe('isValidCoordinate', () => {
  it('accepts valid coordinates', () => {
    expect(isValidCoordinate(39.9, 116.4)).toBe(true);   // Beijing
    expect(isValidCoordinate(-33.8, 151.2)).toBe(true);   // Sydney
    expect(isValidCoordinate(0, 0)).toBe(true);            // Null Island
  });

  it('rejects out-of-range latitude', () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
  });

  it('rejects out-of-range longitude', () => {
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(0, -181)).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
  });
});

// ─── calculateDistance ───────────────────────────────────────
describe('calculateDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateDistance(39.9, 116.4, 39.9, 116.4)).toBe(0);
  });

  it('calculates approximate distance between Beijing and Shanghai', () => {
    // ~1,068 km
    const dist = calculateDistance(39.9, 116.4, 31.2, 121.5);
    expect(dist).toBeGreaterThan(1000000); // > 1000km
    expect(dist).toBeLessThan(1200000);    // < 1200km
  });

  it('is symmetric', () => {
    const d1 = calculateDistance(0, 0, 10, 10);
    const d2 = calculateDistance(10, 10, 0, 0);
    expect(d1).toBeCloseTo(d2, 0);
  });
});

// ─── fuzzCoordinate ──────────────────────────────────────────
describe('fuzzCoordinate', () => {
  it('returns valid coordinates', () => {
    const [lat, lng] = fuzzCoordinate(39.9, 116.4, 'test-secret');
    expect(isValidCoordinate(lat, lng)).toBe(true);
  });

  it('produces different results for different secrets', () => {
    const [lat1, lng1] = fuzzCoordinate(39.9, 116.4, 'secret-a');
    const [lat2, lng2] = fuzzCoordinate(39.9, 116.4, 'secret-b');
    expect(lat1 !== lat2 || lng1 !== lng2).toBe(true);
  });

  it('produces consistent results for same inputs', () => {
    const r1 = fuzzCoordinate(39.9, 116.4, 'test-secret');
    const r2 = fuzzCoordinate(39.9, 116.4, 'test-secret');
    expect(r1).toEqual(r2);
  });

  it('offsets are within ~500m of original', () => {
    const lat = 39.9, lng = 116.4;
    const [fuzzedLat, fuzzedLng] = fuzzCoordinate(lat, lng, 'test');
    const dist = calculateDistance(lat, lng, fuzzedLat, fuzzedLng);
    expect(dist).toBeLessThan(600); // allow small margin for rounding
  });

  it('clamps coordinates to valid range', () => {
    // Near the poles
    const [lat, lng] = fuzzCoordinate(89.99, 0, 'test');
    expect(lat).toBeLessThanOrEqual(90);
    expect(lat).toBeGreaterThanOrEqual(-90);
  });
});
