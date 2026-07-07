import { describe, it, expect } from 'vitest';
import {
  BREATHING_PRESETS,
  cycleDuration,
  phaseLabelKey,
  getDescKey,
  getTipsKey,
} from './breathing';

describe('BREATHING_PRESETS', () => {
  it('has at least 3 presets', () => {
    expect(BREATHING_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it('each preset has phases with positive durations', () => {
    for (const preset of BREATHING_PRESETS) {
      for (const phase of preset.phases) {
        expect(phase.durationSec).toBeGreaterThan(0);
      }
    }
  });
});

describe('cycleDuration', () => {
  it('calculates total seconds for box breathing (4+4+4+4=16)', () => {
    const box = BREATHING_PRESETS.find(p => p.key === 'box')!;
    expect(cycleDuration(box)).toBe(16);
  });

  it('calculates total seconds for 478 breathing (4+7+8=19)', () => {
    const p478 = BREATHING_PRESETS.find(p => p.key === '478')!;
    expect(cycleDuration(p478)).toBe(19);
  });
});

describe('phaseLabelKey', () => {
  it('returns correct key for each phase type', () => {
    expect(phaseLabelKey('inhale')).toBe('breathInhale');
    expect(phaseLabelKey('hold')).toBe('breathHold');
    expect(phaseLabelKey('exhale')).toBe('breathExhale');
  });
});

describe('getDescKey', () => {
  it('returns scientific key for scientific style', () => {
    const box = BREATHING_PRESETS[0];
    expect(getDescKey(box, 'scientific')).toBe(box.descSciKey);
  });

  it('returns spiritual key for spiritual style', () => {
    const box = BREATHING_PRESETS[0];
    expect(getDescKey(box, 'spiritual')).toBe(box.descSprKey);
  });
});

describe('getTipsKey', () => {
  it('returns correct tips key for each style', () => {
    const box = BREATHING_PRESETS[0];
    expect(getTipsKey(box, 'scientific')).toBe(box.tipsSciKey);
    expect(getTipsKey(box, 'spiritual')).toBe(box.tipsSprKey);
  });
});
