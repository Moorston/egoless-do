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
    // foodLog is NOT cleared — history is preserved for FoodLogPage
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
export function getTodayFoodLog<T extends { timestamp: number }>(foodLog: T[]): T[] {
  const today = dateStr();
  return foodLog.filter(f => dateStr(new Date(f.timestamp)) === today);
}

/** Get today's total meditation minutes from medHistory */
export function getTodayMedMinutes(medHistory: Array<{ date: string; dur: string }>): number {
  const today = dateStr();
  return medHistory
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + (parseInt(e.dur) || 0), 0);
}

/** Get milliseconds until next local midnight */
export function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
