// ─── 数息轮纯逻辑测试 ────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { notifyBreath, computeRounds, initialRoundState } from '../index';

describe('notifyBreath() 数息轮', () => {
  it('初始态正确', () => {
    expect(initialRoundState).toEqual({
      totalBreaths: 0, cycles: 0, countedBreaths: 0, currentCycle: 1,
    });
  });

  it('首息后 total=1, counted=1, cycles=0, current=1', () => {
    const s = notifyBreath(initialRoundState);
    expect(s).toEqual({ totalBreaths: 1, cycles: 0, countedBreaths: 1, currentCycle: 1 });
  });

  it('13 息后 counted=3, cycles=1, current=2', () => {
    let s = initialRoundState;
    for (let i = 0; i < 13; i += 1) s = notifyBreath(s);
    expect(s.totalBreaths).toBe(13);
    expect(s.countedBreaths).toBe(3);
    expect(s.cycles).toBe(1);
    expect(s.currentCycle).toBe(2);
  });

  it('完成一轮（10 息）后 counted=10, cycles=0, current=1', () => {
    let s = initialRoundState;
    for (let i = 0; i < 10; i += 1) s = notifyBreath(s);
    expect(s.totalBreaths).toBe(10);
    expect(s.countedBreaths).toBe(10);
    expect(s.cycles).toBe(0);
    expect(s.currentCycle).toBe(1);
  });

  it('20 息后 cycles=1, counted=10, current=2', () => {
    let s = initialRoundState;
    for (let i = 0; i < 20; i += 1) s = notifyBreath(s);
    expect(s.totalBreaths).toBe(20);
    expect(s.cycles).toBe(1);
    expect(s.countedBreaths).toBe(10);
    expect(s.currentCycle).toBe(2);
  });
});

describe('computeRounds() 辅助函数', () => {
  it('0 息 → 0 轮 0 息', () => {
    expect(computeRounds(0)).toEqual({ cycles: 0, counted: 0, currentCycle: 1 });
  });
  it('10 息 0 轮 10 息', () => {
    expect(computeRounds(10)).toEqual({ cycles: 0, counted: 10, currentCycle: 1 });
  });
  it('13 息 1 轮 3 息', () => {
    const r = computeRounds(13);
    expect(r.cycles).toBe(1);
    expect(r.counted).toBe(3);
    expect(r.currentCycle).toBe(2);
  });
  it('25 息 2 轮 5 息', () => {
    const r = computeRounds(25);
    expect(r.cycles).toBe(2);
    expect(r.counted).toBe(5);
    expect(r.currentCycle).toBe(3);
  });
});
