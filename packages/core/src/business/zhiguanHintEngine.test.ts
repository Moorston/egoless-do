// ─── 五盖推荐引擎测试 ────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { recommendMethod } from '../index';
import type { FiveHindranceRadar } from '../index';

const EMPTY_RADAR: FiveHindranceRadar = {
  greed: 0, aversion: 0, sloth: 0, restlessness: 0, doubt: 0,
};

const ALL_SEVEN: FiveHindranceRadar = {
  greed: 7, aversion: 7, sloth: 7, restlessness: 7, doubt: 7,
};

describe('recommendMethod() 规则引擎', () => {
  it('空雷达 → 默认推荐数息观', () => {
    const r = recommendMethod(EMPTY_RADAR);
    expect(r.primaryMethod).toBe('anapanasati');
    expect(r.message).toBe('zhiguanRuleDefault');
  });

  it('昏沉 >= 7 → 推荐 kasina (体真止/经行)', () => {
    const radar = { ...EMPTY_RADAR, sloth: 8 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('kasina');
    expect(r.message).toBe('zhiguanRuleSloth');
  });

  it('掉悔 >= 7 → 推荐 anapanasati (数息观)', () => {
    const radar = { ...EMPTY_RADAR, restlessness: 9 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('anapanasati');
  });

  it('贪欲 >= 7 → 推荐 kasina (不净观)', () => {
    const radar = { ...EMPTY_RADAR, greed: 7 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('kasina');
  });

  it('嗔恚 >= 7 → 推荐 metta (慈心观)', () => {
    const radar = { ...EMPTY_RADAR, aversion: 8 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('metta');
  });

  it('疑 >= 7 → 推荐 self_inquiry (体真止)', () => {
    const radar = { ...EMPTY_RADAR, doubt: 10 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('self_inquiry');
  });

  it('全部 >= 7 时优先级最高的是 sloth', () => {
    const r = recommendMethod(ALL_SEVEN);
    expect(r.primaryMethod).toBe('kasina');
  });

  it('只有 restlessness = 6（低于阈值）→ 仍然推荐默认', () => {
    const radar = { ...EMPTY_RADAR, restlessness: 6 };
    const r = recommendMethod(radar);
    expect(r.primaryMethod).toBe('anapanasati');
    expect(r.message).toBe('zhiguanRuleDefault');
  });

  it('hintranceTrigger 是最重的盖', () => {
    const radar = { ...EMPTY_RADAR, aversion: 5, restlessness: 9, doubt: 8 };
    const r = recommendMethod(radar);
    expect(r.hindranceTrigger).toBe('restlessness');
  });
});
