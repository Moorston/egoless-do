// ─── Daily Reset Service ──────────────────────────────────────────
// Handles resetting daily data at midnight
import { dateStr } from './utils';
import type { AppState, CheckinEntry } from './types';

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

/** Get milliseconds until next local midnight */
export function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
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

// ─── DailyResetManager ───────────────────────────────────────────

export interface DailyResetDeps {
  getLastReset: () => string | null | Promise<string | null>;
  setLastReset: (date: string) => void;
  getCheckinHistory: () => CheckinEntry[];
  applyPatch: (patch: Record<string, unknown>) => void;
  persistProfile: (data: Record<string, unknown>) => void;
  getProfile: () => Record<string, unknown>;
  getWaterGoal: () => number;
  /** Platform-specific visibility listener (e.g. AppState on RN, document on web) */
  addVisibilityListener?: (callback: () => void) => void;
}

export class DailyResetManager {
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(private deps: DailyResetDeps) {}

  /** Perform the daily reset check */
  async check(): Promise<void> {
    const lastReset = await this.deps.getLastReset();
    const patch = getDailyResetPatch(lastReset);
    if (!patch) return;

    // Check if today's checkin has water amount
    const today = dateStr();
    const checkinHistory = this.deps.getCheckinHistory();
    const todayCheckin = checkinHistory.find((c) => c.date === today);
    let todayWater = 0;
    if (todayCheckin?.note) {
      try {
        const noteData = JSON.parse(todayCheckin.note);
        if (typeof noteData.water === 'number') todayWater = noteData.water;
      } catch (e) { console.warn('[dailyReset] Failed to parse checkin note:', e); }
    }

    // Apply reset with today's water from checkin
    const resetPatch = { ...patch, waterMl: todayWater };
    this.deps.applyPatch(resetPatch);
    this.deps.setLastReset(dateStr());

    // Persist updated profile
    const userProfile = this.deps.getProfile();
    const waterGoal = this.deps.getWaterGoal();
    this.deps.persistProfile({
      ...userProfile,
      waterMl: todayWater,
      waterGoal,
      updatedAt: Date.now(),
    });
  }

  /** Start listening for visibility changes and schedule midnight reset.
   *  @param pending  Optional promise (e.g. loadFromIndexedDB) to wait for before first check. */
  start(pending?: Promise<unknown>): void {
    const initialCheck = pending
      ? pending.then(() => this.check()).catch(() => this.check())
      : this.check();

    // Platform-specific visibility listener
    if (this.deps.addVisibilityListener) {
      this.deps.addVisibilityListener(() => this.check());
    }

    // Schedule next reset at midnight
    initialCheck.finally(() => this.scheduleNext());
  }

  /** Clean up timers */
  destroy(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNext(): void {
    this.timerId = setTimeout(() => {
      this.check();
      this.scheduleNext();
    }, msUntilMidnight() + 1000);
  }
}
