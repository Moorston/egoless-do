// ─── 计时器纯函数测试 ────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { calcElapsed, accumulatePause, formatSec, isInClosingCountdown } from '../index';

describe('calcElapsed()', () => {
  it('无暂停时计算正确', () => {
    const startTs = 1_000_000;
    expect(calcElapsed(startTs, 0, startTs + 30_000)).toBe(30);
    expect(calcElapsed(startTs, 0, startTs + 60_000)).toBe(60);
    expect(calcElapsed(startTs, 0, startTs + 90_500)).toBe(90);
  });

  it('暂停 5s 后累计应减', () => {
    const startTs = 1_000_000;
    const pausedElapsed = 5_000;
    expect(calcElapsed(startTs, pausedElapsed, startTs + 30_000)).toBe(25);
  });

  it('不能为负数', () => {
    const startTs = 1_000_000;
    expect(calcElapsed(startTs, 100_000, startTs + 30_000)).toBe(0);
  });
});

describe('accumulatePause()', () => {
  it('单次暂停', () => {
    expect(accumulatePause(0, 1_000_000, 1_005_000)).toBe(5_000);
  });
  it('多次暂停叠加', () => {
    expect(accumulatePause(5_000, 1_000_000, 1_003_000)).toBe(8_000);
  });
});

describe('formatSec()', () => {
  it('90s → 01:30', () => {
    expect(formatSec(90)).toBe('01:30');
  });
  it('60s → 01:00', () => {
    expect(formatSec(60)).toBe('01:00');
  });
  it('5s → 00:05', () => {
    expect(formatSec(5)).toBe('00:05');
  });
});

describe('isInClosingCountdown()', () => {
  it('对应秒数 → 对应阈值', () => {
    expect(isInClosingCountdown(300)).toBe('active-5min');
    expect(isInClosingCountdown(1800)).toBe('active-30min');
    expect(isInClosingCountdown(3600)).toBe('active-60min');
  });
  it('其他秒数 → null', () => {
    expect(isInClosingCountdown(100)).toBeNull();
    expect(isInClosingCountdown(999)).toBeNull();
  });
});
