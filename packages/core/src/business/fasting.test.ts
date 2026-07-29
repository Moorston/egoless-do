import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastingSession } from '../types';
import { startFastingSession, stopFastingSession } from './fasting';

const makeFasting = (overrides: Partial<FastingSession> = {}): FastingSession => ({
  id: 'f1', targetHours: 16, startedAt: Date.now() - 3600000 * 16,
  updatedAt: Date.now(), deleted: false, ...overrides,
});

describe('startFastingSession', () => {
  it('creates a new fasting session with given hours', () => {
    const result = startFastingSession(null, 16);
    expect(result).not.toBeNull();
    expect(result!.targetHours).toBe(16);
    expect(result!.startedAt).toBeDefined();
    expect(result!.deleted).toBe(false);
  });
  it('returns null when there is already an active fasting', () => {
    const active = makeFasting();
    const result = startFastingSession(active, 16);
    expect(result).toBeNull();
  });
  it('creates session with different target hours', () => {
    const result = startFastingSession(null, 24);
    expect(result!.targetHours).toBe(24);
  });
  it('creates session with zero hours edge case', () => {
    const result = startFastingSession(null, 0);
    expect(result).not.toBeNull();
    expect(result!.targetHours).toBe(0);
  });
});

describe('stopFastingSession', () => {
  let NOW: number;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    NOW = Date.now();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets endedAt and computes estimatedKcal', () => {
    const session = makeFasting({ startedAt: NOW - 3600000 * 16 });
    const result = stopFastingSession(session);
    expect(result.endedAt).toBe(NOW);
    expect(result.estimatedKcal).toBeGreaterThan(0);
  });
  it('uses default body params when opts not provided', () => {
    const session = makeFasting({ startedAt: NOW - 3600000 * 10 });
    const result = stopFastingSession(session);
    expect(result.estimatedKcal).toBeDefined();
    expect(result.updatedAt).toBe(NOW);
  });
  it('uses custom body params when provided', () => {
    const session = makeFasting({ startedAt: NOW - 3600000 * 12 });
    const result = stopFastingSession(session, { weight: 80, gender: 'female', age: 25, height: 165 });
    expect(result.estimatedKcal).toBeGreaterThan(0);
  });
  it('preserves original session fields', () => {
    const session = makeFasting({ id: 'abc', targetHours: 20 });
    const result = stopFastingSession(session);
    expect(result.id).toBe('abc');
    expect(result.targetHours).toBe(20);
  });
  it('handles very short fasting duration', () => {
    const session = makeFasting({ startedAt: NOW - 1000 });
    const result = stopFastingSession(session);
    expect(result.estimatedKcal).toBeGreaterThanOrEqual(0);
  });
});
