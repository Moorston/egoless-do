// ─── 连续天数计算测试 ────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { computeStreakDays, dateStr } from '../index';

describe('computeStreakDays()', () => {
  it('空 → 0/0', () => {
    const r = computeStreakDays(new Set<string>());
    expect(r.current).toBe(0);
    expect(r.longest).toBe(0);
  });

  it('仅今天有记录 → current=1', () => {
    const today = dateStr();
    const r = computeStreakDays(new Set([today]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
  });

  it('仅昨天有记录 → current=1（允许昨日首坐算 current）', () => {
    const d = new Date(Date.now() - 86400000);
    const yesterday = dateStr(d);
    const r = computeStreakDays(new Set([yesterday]));
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
  });

  it('3 天连续 → longest=3, current=3', () => {
    const today = new Date();
    const a = dateStr(new Date(today.getTime() - 86400000 * 2));
    const b = dateStr(new Date(today.getTime() - 86400000));
    const c = dateStr(today);
    const r = computeStreakDays(new Set([a, b, c]));
    expect(r.longest).toBe(3);
    expect(r.current).toBe(3);
  });

  it('中间断 1 天，只计当前连续段', () => {
    const today = new Date();
    const b = dateStr(new Date(today.getTime() - 86400000));
    const c = dateStr(today);
    const r = computeStreakDays(new Set([b, c]));
    expect(r.current).toBe(2);
    expect(r.longest).toBe(2);
  });

  it('最近 2 天无记录 → current=0', () => {
    const d = new Date(Date.now() - 86400000 * 5);
    const old = dateStr(d);
    const r = computeStreakDays(new Set([old]));
    expect(r.current).toBe(0);
    expect(r.longest).toBe(1);
  });
});
