// ─── Daily Reset Service ──────────────────────────────────────────
// Handles resetting daily data at midnight
import { dateStr } from './utils';
import type { AppState } from './types';

export const DAILY_RESET_KEY = 'egoless-do-last-reset-date';

/** Check if daily reset is needed, return patch to apply */
export function getDailyResetPatch(lastResetDate: string | null): Partial<AppState> | null {
  const today = dateStr();
  if (lastResetDate === today) return null; // Already reset today

  return {
    waterMl: 0,         // Reset daily water intake
    foodLog: [],        // Clear daily food log
    // Note: Do NOT reset activeFasting, streak, totalMedMinutes, etc.
  };
}

/** Check and perform daily reset if needed */
export function checkDailyReset(
  getLastReset: () => string | null,
  setLastReset: (date: string) => void,
  applyPatch: (patch: Partial<AppState>) => void
): void {
  const lastReset = getLastReset();
  const patch = getDailyResetPatch(lastReset);
  if (patch) {
    applyPatch(patch);
    setLastReset(dateStr());
  }
}

/** Get today's food log from full foodLog array */
export function getTodayFoodLog(foodLog: Array<{ timestamp: number }>): Array<{ timestamp: number }> {
  const today = dateStr();
  return foodLog.filter(f => {
    const fDate = new Date(f.timestamp).toISOString().slice(0, 10);
    return fDate === today;
  });
}
