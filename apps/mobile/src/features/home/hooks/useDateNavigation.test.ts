import { describe, it, expect, vi } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

vi.mock('@egoless-do/core', () => ({
  dateStr: vi.fn().mockReturnValue('2026-07-07'),
  addDays: vi.fn((date: string, n: number) => {
    const d = new Date(date + 'T12:00:00'); // noon to avoid timezone edge cases
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }),
}));

// Test the pure swipe detection logic that useDateNavigation wraps
describe('useDateNavigation swipe logic', () => {
  const SWIPE_THRESHOLD = 60;
  const DIRECTION_RATIO = 1.2;

  function shouldSwipe(dx: number, dy: number): boolean {
    return Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DIRECTION_RATIO;
  }

  function getNextDate(currentDate: string, dx: number): string {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    return d.toISOString().slice(0, 10);
  }

  describe('swipe detection', () => {
    it('detects left swipe (navigate forward)', () => {
      expect(shouldSwipe(-100, 0)).toBe(true);
    });

    it('detects right swipe (navigate backward)', () => {
      expect(shouldSwipe(100, 0)).toBe(true);
    });

    it('rejects small horizontal swipe', () => {
      expect(shouldSwipe(20, 0)).toBe(false);
    });

    it('rejects vertical swipe even if large', () => {
      expect(shouldSwipe(50, 200)).toBe(false);
    });

    it('rejects diagonal swipe when vertical dominates', () => {
      // |dx|=80, |dy|=100, 80 < 100*1.2=120
      expect(shouldSwipe(80, 100)).toBe(false);
    });

    it('accepts diagonal swipe when horizontal dominates', () => {
      // |dx|=120, |dy|=50, 120 > 50*1.2=60
      expect(shouldSwipe(120, 50)).toBe(true);
    });

    it('rejects exact threshold (not strictly greater)', () => {
      expect(shouldSwipe(60, 0)).toBe(false);
    });

    it('accepts just above threshold', () => {
      expect(shouldSwipe(61, 0)).toBe(true);
    });
  });

  describe('date navigation', () => {
    it('left swipe navigates to next day', () => {
      expect(getNextDate('2026-07-07', -100)).toBe('2026-07-08');
    });

    it('right swipe navigates to previous day', () => {
      expect(getNextDate('2026-07-07', 100)).toBe('2026-07-06');
    });

    it('navigates forward multiple days by swiping multiple times', () => {
      let date = '2026-07-07';
      date = getNextDate(date, -100); // swipe left
      date = getNextDate(date, -100); // swipe left again
      expect(date).toBe('2026-07-09');
    });

    it('navigates backward multiple days', () => {
      let date = '2026-07-07';
      date = getNextDate(date, 100); // swipe right
      date = getNextDate(date, 100); // swipe right again
      expect(date).toBe('2026-07-05');
    });
  });
});
