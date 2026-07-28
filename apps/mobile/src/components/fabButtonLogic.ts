// ─── FabButton gesture logic (pure, unit-testable) ───────────────
// Extracted from FabButton.tsx so the tap-vs-drag decision can be
// tested without a React Native renderer (see fabButtonLogic.test.ts).

/** A finger tap on a real touchscreen jitters several px. A threshold this low
 * misclassifies a normal tap as a drag (which then hides the FAB and never calls
 * onPress). 10px tolerates jitter while still allowing deliberate reposition drags. */
export const DRAG_THRESHOLD = 10;

/**
 * Decide whether a PanResponder gesture should be treated as a TAP (fire
 * onPress) rather than a DRAG (reposition/hide the FAB).
 *
 * Uses the FINAL displacement (gs.dx / gs.dy at release), not mid-move jitter,
 * so a real-device tap that wobbles a few px still counts as a tap.
 *
 * @param dx final horizontal displacement from gesture start
 * @param dy final vertical displacement from gesture start
 * @param threshold max displacement (px) still considered a tap
 * @returns true when the gesture is a tap (should fire onPress), false for a drag
 */
export function isTap(dx: number, dy: number, threshold: number = DRAG_THRESHOLD): boolean {
  return Math.abs(dx) <= threshold && Math.abs(dy) <= threshold;
}
