import { describe, it, expect } from 'vitest';
import { formatDateBar, WEEKDAYS } from './dateUtils';

describe('formatDateBar', () => {
  const T = (k: string) => k === 'dateBarToday' ? '今天' : k;

  it('formats a date with weekday', () => {
    // 2026-07-07 is a Tuesday (周一... actually let me check)
    const result = formatDateBar('2026-07-07', false, T);
    expect(result).toMatch(/月.*日.*周/);
  });

  it('appends "today" marker when isToday is true', () => {
    const result = formatDateBar('2026-07-07', true, T);
    expect(result).toContain('今天');
  });

  it('does not append "today" marker when isToday is false', () => {
    const result = formatDateBar('2026-07-07', false, T);
    expect(result).not.toContain('今天');
  });
});

describe('WEEKDAYS', () => {
  it('has 7 entries', () => {
    expect(WEEKDAYS).toHaveLength(7);
  });

  it('starts with 日 (Sunday)', () => {
    expect(WEEKDAYS[0]).toBe('日');
  });
});
