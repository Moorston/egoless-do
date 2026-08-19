import { dateStr } from '@egoless-do/core';
import React, { act, type ReactElement } from 'react';
import { create as createTestRenderer } from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useDateNavigation } from './useDateNavigation';

/** Typed wrapper around react-test-renderer create (no installed types for the package). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTestRoot = (element: ReactElement): TestRenderer =>
  (createTestRenderer as (el: ReactElement) => TestRenderer)(element);

/** Minimal react-test-renderer handle (no installed types for react-test-renderer). */
interface TestRenderer {
  update: (element: React.ReactElement) => void;
  unmount: () => void;
}

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;
// @ts-expect-error — required for React 19 act() in non-browser env
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@egoless-do/core', () => ({
  dateStr: vi.fn().mockReturnValue('2026-07-07'),
  addDays: vi.fn((date: string, n: number) => {
    // Use UTC to avoid timezone-dependent date shifts
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }),
}));

/** Minimal renderHook using react-test-renderer (works in Node env without react-dom).
 *  React 19 act() is async — all mutation helpers return Promises. */
async function renderHook<T>(hookFn: () => T) {
  let hookRef!: { current: T };

  function TestComponent() {
    hookRef = { current: hookFn() };
    return null;
  }

  let root: TestRenderer;
  await act(async () => {
    root = createTestRoot(React.createElement(TestComponent));
  });

  return {
    get result() {
      return hookRef.current;
    },
    /** Run a callback that may trigger state updates, then flush. */
    act: async (fn: () => void) => {
      await act(async () => fn());
    },
    rerender: async () => {
      await act(async () => root!.update(React.createElement(TestComponent)));
    },
    unmount: () => root!.unmount(),
  };
}

/** Create a touch event with nativeEvent coordinates. */
function touchEvent(pageX: number, pageY: number) {
  return { nativeEvent: { pageX, pageY } };
}

// Test the pure swipe detection logic that useDateNavigation wraps
describe('useDateNavigation swipe logic', () => {
  const SWIPE_THRESHOLD = 60;
  const DIRECTION_RATIO = 1.2;

  function shouldSwipe(dx: number, dy: number): boolean {
    return Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * DIRECTION_RATIO;
  }

  function getNextDate(currentDate: string, dx: number): string {
    const d = new Date(currentDate + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + (dx < 0 ? 1 : -1));
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

// ─── Hook-level tests using renderHook ────────────────────────────────────────
// These exercise the actual React hook wiring (useState, useRef, useCallback).

describe('useDateNavigation hook', () => {
  beforeEach(() => {
    // Reset dateStr mock to today before each test
    vi.mocked(dateStr).mockReturnValue('2026-07-07');
  });

  it('initializes viewDate to today and isToday to true', async () => {
    const { result } = await renderHook(() => useDateNavigation());
    expect(result.viewDate).toBe('2026-07-07');
    expect(result.isToday).toBe(true);
  });

  it('swipe left navigates forward one day', async () => {
    const h = await renderHook(() => useDateNavigation());

    // First swipe right to go to yesterday (07-06), then swipe left to go back (07-07)
    // This proves forward navigation works within the future-date guard
    await h.act(() => h.result.onTouchStart(touchEvent(50, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(200, 300)));
    expect(h.result.viewDate).toBe('2026-07-06');

    // Swipe left: startX=200, endX=50 (dx=-150, horizontal)
    await h.act(() => h.result.onTouchStart(touchEvent(200, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(50, 300)));

    expect(h.result.viewDate).toBe('2026-07-07');
    expect(h.result.isToday).toBe(true);
  });

  it('swipe right navigates backward one day', async () => {
    const h = await renderHook(() => useDateNavigation());

    // Swipe right: startX=50, endX=200 (dx=150, horizontal)
    await h.act(() => h.result.onTouchStart(touchEvent(50, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(200, 300)));

    expect(h.result.viewDate).toBe('2026-07-06');
    expect(h.result.isToday).toBe(false);
  });

  it('prevents navigating past today via left swipe', async () => {
    const h = await renderHook(() => useDateNavigation());

    // Already on today (2026-07-07), swipe left should be blocked
    await h.act(() => h.result.onTouchStart(touchEvent(200, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(50, 300)));

    // dateStr() returns 2026-07-07, nextDate = 2026-07-08 > 2026-07-07 -> blocked
    expect(h.result.viewDate).toBe('2026-07-07');
    expect(h.result.isToday).toBe(true);
  });

  it('goToDate sets viewDate directly', async () => {
    const h = await renderHook(() => useDateNavigation());

    await h.act(() => h.result.goToDate('2026-07-01'));

    expect(h.result.viewDate).toBe('2026-07-01');
    expect(h.result.isToday).toBe(false);
  });

  it('swipe left after goToDate navigates forward from that date', async () => {
    const h = await renderHook(() => useDateNavigation());

    // Navigate to a past date via goToDate
    await h.act(() => h.result.goToDate('2026-07-05'));
    expect(h.result.viewDate).toBe('2026-07-05');

    // Swipe left from that date
    await h.act(() => h.result.onTouchStart(touchEvent(200, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(50, 300)));

    expect(h.result.viewDate).toBe('2026-07-06');
  });

  it('isToday transitions correctly when navigating away and back', async () => {
    const h = await renderHook(() => useDateNavigation());

    // Initially today
    expect(h.result.isToday).toBe(true);

    // Navigate to yesterday
    await h.act(() => h.result.onTouchStart(touchEvent(50, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(200, 300)));
    expect(h.result.isToday).toBe(false);

    // Navigate back to today
    await h.act(() => h.result.onTouchStart(touchEvent(200, 300)));
    await h.act(() => h.result.onTouchEnd(touchEvent(50, 300)));
    expect(h.result.isToday).toBe(true);
    expect(h.result.viewDate).toBe('2026-07-07');
  });

  it('vertical swipe does not change date', async () => {
    const h = await renderHook(() => useDateNavigation());

    // Vertical swipe: dx=30, dy=150
    await h.act(() => h.result.onTouchStart(touchEvent(100, 100)));
    await h.act(() => h.result.onTouchEnd(touchEvent(130, 250)));

    expect(h.result.viewDate).toBe('2026-07-07');
  });
});
