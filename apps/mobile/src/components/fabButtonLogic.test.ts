// ─── fabButtonLogic tests ───────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { DRAG_THRESHOLD, isTap } from './fabButtonLogic';

describe('isTap', () => {
  it('treats a perfectly still tap (0,0) as a tap', () => {
    expect(isTap(0, 0)).toBe(true);
  });

  it('treats small finger jitter as a tap (real-device fix)', () => {
    // A real touchscreen tap jitters a few px; this must NOT be a drag.
    expect(isTap(3, 2)).toBe(true);
    expect(isTap(-4, 5)).toBe(true);
    expect(isTap(9, 0)).toBe(true);
  });

  it('uses the threshold as inclusive upper bound', () => {
    // Boundary: exactly the threshold is still a tap.
    expect(isTap(DRAG_THRESHOLD, 0)).toBe(true);
    expect(isTap(0, DRAG_THRESHOLD)).toBe(true);
  });

  it('treats movement beyond the threshold as a drag', () => {
    expect(isTap(DRAG_THRESHOLD + 1, 0)).toBe(false);
    expect(isTap(0, DRAG_THRESHOLD + 1)).toBe(false);
    expect(isTap(11, 11)).toBe(false);
  });

  it('treats one-axis movement beyond threshold as a drag', () => {
    expect(isTap(20, 1)).toBe(false);
    expect(isTap(1, -20)).toBe(false);
  });

  it('honours a custom threshold', () => {
    expect(isTap(8, 0, 5)).toBe(false);
    expect(isTap(4, 0, 5)).toBe(true);
  });
});
