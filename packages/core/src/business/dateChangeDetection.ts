// ─── Date change detection (pure logic, no React dependency) ────
import { dateStr } from '../utils';

/**
 * Creates a date-change detector that calls onDateChange when the date transitions.
 * Platform code wraps this in a React hook with visibility/activity listeners.
 */
export function createDateChangeDetector(
  onDateChange: (previousDate: string, newDate: string) => void,
) {
  let current = dateStr();

  const check = () => {
    const now = dateStr();
    if (now !== current) {
      const prev = current;
      current = now;
      onDateChange(prev, now);
    }
  };

  const getCurrent = () => current;

  return { check, getCurrent };
}
