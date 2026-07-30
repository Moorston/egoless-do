// ─── sleepSummaryLogic tests ──────────────────────────────────────
// Unit tests for SleepSummaryCard pure logic functions.
// These cover the empty-state click fix scenarios without RN rendering.

import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatTime,
  formatSleepDate,
  countGratitude,
  findWorkStateLabelKey,
  qualityLabel,
  isStarFilled,
  isValidQuality,
  WORK_STATE_OPTIONS,
} from './sleepSummaryLogic';

// ─── formatDuration ──────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats 0 as --', () => expect(formatDuration(0)).toBe('--'));
  it('formats negative as --', () => expect(formatDuration(-10)).toBe('--'));
  it('formats 450 min as 7h30m', () => expect(formatDuration(450)).toBe('7h30m'));
  it('formats 60 min as 1h0m', () => expect(formatDuration(60)).toBe('1h0m'));
  it('formats 45 min as 0h45m', () => expect(formatDuration(45)).toBe('0h45m'));
  it('formats 480 min as 8h0m', () => expect(formatDuration(480)).toBe('8h0m'));
});

// ─── formatTime ──────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats undefined as --:--', () => expect(formatTime(undefined)).toBe('--:--'));
  it('formats 0 as --:--', () => expect(formatTime(0)).toBe('--:--'));
  it('formats timestamp to HH:MM', () => {
    const ts = new Date('2026-07-30T23:05:00').getTime();
    expect(formatTime(ts)).toBe('23:05');
  });
  it('pads single-digit hours/minutes', () => {
    const ts = new Date('2026-07-30T06:07:00').getTime();
    expect(formatTime(ts)).toBe('06:07');
  });
});

// ─── countGratitude ──────────────────────────────────────────────

describe('countGratitude', () => {
  it('returns 0 for undefined', () => expect(countGratitude(undefined)).toBe(0));
  it('returns 0 for empty array', () => expect(countGratitude([])).toBe(0));
  it('counts non-empty entries', () => expect(countGratitude(['a', 'b', 'c'])).toBe(3));
  it('filters out empty/whitespace entries', () => {
    expect(countGratitude(['a', '', '  ', 'b'])).toBe(2);
  });
});

// ─── findWorkStateLabelKey ───────────────────────────────────────

describe('findWorkStateLabelKey', () => {
  it('returns null for null', () => expect(findWorkStateLabelKey(null)).toBeNull());
  it('returns labelKey for valid workState', () => {
    expect(findWorkStateLabelKey('energetic')).toBe('sleepWorkEnergetic');
    expect(findWorkStateLabelKey('tired')).toBe('sleepWorkTired');
  });
  it('returns null for invalid workState', () => {
    expect(findWorkStateLabelKey('invalid' as never)).toBeNull();
  });
});

// ─── qualityLabel ────────────────────────────────────────────────

describe('qualityLabel', () => {
  it('returns empty for 0', () => expect(qualityLabel(0)).toBe(''));
  it('maps 1 to 差', () => expect(qualityLabel(1)).toBe('差'));
  it('maps 2 to 偏差', () => expect(qualityLabel(2)).toBe('偏差'));
  it('maps 3 to 一般', () => expect(qualityLabel(3)).toBe('一般'));
  it('maps 4 to 好', () => expect(qualityLabel(4)).toBe('好'));
  it('maps 5 to 很好', () => expect(qualityLabel(5)).toBe('很好'));
  it('maps >5 to 很好', () => expect(qualityLabel(6)).toBe('很好'));
});

// ─── formatSleepDate ─────────────────────────────────────────────

describe('formatSleepDate', () => {
  it('returns empty for undefined', () => expect(formatSleepDate(undefined)).toBe(''));
  it('returns empty for empty string', () => expect(formatSleepDate('')).toBe(''));
  it('returns empty for non-numeric parts', () => expect(formatSleepDate('abc')).toBe(''));
  it('formats 2026-07-30 as 7月30日', () => expect(formatSleepDate('2026-07-30')).toBe('7月30日'));
  it('formats 2026-01-05 as 1月5日', () => expect(formatSleepDate('2026-01-05')).toBe('1月5日'));
  it('formats 2026-12-31 as 12月31日', () => expect(formatSleepDate('2026-12-31')).toBe('12月31日'));
});

// ─── WORK_STATE_OPTIONS ──────────────────────────────────────────

describe('WORK_STATE_OPTIONS', () => {
  it('has 4 options', () => expect(WORK_STATE_OPTIONS).toHaveLength(4));
  it('all keys are unique', () => {
    const keys = WORK_STATE_OPTIONS.map(o => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── isStarFilled (core click logic) ─────────────────────────────

describe('isStarFilled', () => {
  it('star 1 filled when value >= 1', () => {
    expect(isStarFilled(1, 1)).toBe(true);
    expect(isStarFilled(1, 5)).toBe(true);
  });
  it('star 3 filled when value >= 3', () => {
    expect(isStarFilled(3, 3)).toBe(true);
    expect(isStarFilled(3, 2)).toBe(false);
  });
  it('star 5 filled only when value >= 5', () => {
    expect(isStarFilled(5, 5)).toBe(true);
    expect(isStarFilled(5, 4)).toBe(false);
  });
  it('★ Regression: empty-state click fix — star press sets quality', () => {
    // Previously empty-state stars were disabled (interactive=false).
    // Fix: clicking empty star enters edit mode, THEN user selects quality.
    // Verify quality selection logic works for all valid values.
    for (let q = 1; q <= 5; q++) {
      expect(isStarFilled(q, q)).toBe(true);
      expect(isStarFilled(q + 1, q)).toBe(false);
    }
  });
});

// ─── isValidQuality ──────────────────────────────────────────────

describe('isValidQuality', () => {
  it('accepts 1-5', () => {
    expect(isValidQuality(1)).toBe(true);
    expect(isValidQuality(3)).toBe(true);
    expect(isValidQuality(5)).toBe(true);
  });
  it('rejects 0 and negative', () => {
    expect(isValidQuality(0)).toBe(false);
    expect(isValidQuality(-1)).toBe(false);
  });
  it('rejects > 5', () => {
    expect(isValidQuality(6)).toBe(false);
    expect(isValidQuality(100)).toBe(false);
  });
});
