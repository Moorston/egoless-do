// ─── Daily Reset Service ──────────────────────────────────────────
// Handles resetting daily data at midnight
import { dateStr } from './utils';
import { createLogger } from './logger';
import type { AppState, CheckinEntry } from './types';

const log = createLogger('DailyReset');

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
export function getTodayFoodLog<T extends { timestamp: number; deleted?: boolean }>(foodLog: T[]): T[] {
  const today = dateStr();
  return foodLog.filter(f => !f.deleted && dateStr(new Date(f.timestamp)) === today);
}

/** Get today's total meditation minutes from medHistory */
export function getTodayMedMinutes(medHistory: Array<{ date: string; dur: string; deleted?: boolean }>): number {
  const today = dateStr();
  return medHistory
    .filter(e => e.date === today && !e.deleted)
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
  /** Called when plan daily reset is needed (pass previous date) */
  onPlanDailyReset?: (previousDate: string) => void;
  /** Called when habit auto-start check is needed */
  onHabitDailyReset?: () => void;
  /** Called when review auto-generation is needed */
  onReviewDailyReset?: (period: 'week' | 'month') => void;
  /** Platform-specific visibility listener (e.g. AppState on RN, document on web) */
  addVisibilityListener?: (callback: () => void) => void;
}

export class DailyResetManager {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastCheckedDate: string | null = null;
  private _checking = false;

  constructor(private deps: DailyResetDeps) {}

  /** Perform the daily reset check */
  async check(): Promise<void> {
    if (this._checking) return;
    this._checking = true;
    try {
      await this._doCheck();
    } finally {
      this._checking = false;
    }
  }

  private async _doCheck(): Promise<void> {
    const lastReset = await this.deps.getLastReset();
    const today = dateStr();
    const needsReset = lastReset !== today;

    // Always check today's checkin for water amount
    const checkinHistory = this.deps.getCheckinHistory();
    const todayCheckin = checkinHistory.find((c) => !c.deleted && c.date === today);
    let todayWater = 0;
    if (todayCheckin?.note) {
      try {
        const noteData = JSON.parse(todayCheckin.note);
        if (typeof noteData.water === 'number') todayWater = noteData.water;
      } catch (e) { log.warn('Failed to parse checkin note:', e); }
    }

    if (needsReset) {
      // Check if we need to backfill missing days (e.g., app was closed for multiple days)
      if (lastReset) {
        const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
        const lastDate = parseLocal(lastReset);
        const todayDate = parseLocal(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

        // Backfill missing days (up to 7 days to prevent excessive processing)
        // Loop from lastDate to yesterday (daysDiff-1). performDailyReset derives
        // today = previousDate+1, so passing yesterday yields the actual today.
        if (daysDiff > 1) {
          for (let i = 0; i < Math.min(daysDiff, 7); i++) {
            const backfillDate = new Date(lastDate);
            backfillDate.setDate(backfillDate.getDate() + i);
            const backfillDateStr = dateStr(backfillDate);

            // Trigger plan daily reset for each missed day
            if (this.deps.onPlanDailyReset) {
              this.deps.onPlanDailyReset(backfillDateStr);
            }

            // Generate reviews for missed boundary days
            if (this.deps.onReviewDailyReset) {
              const dow = backfillDate.getDay();
              if (dow === 0) this.deps.onReviewDailyReset('week');
              const lastDom = new Date(backfillDate.getFullYear(), backfillDate.getMonth() + 1, 0).getDate();
              if (backfillDate.getDate() === lastDom) this.deps.onReviewDailyReset('month');
            }
          }
        }
      }

      // Full daily reset
      const patch = getDailyResetPatch(lastReset);
      if (patch) {
        const resetPatch = { ...patch, waterMl: todayWater };
        this.deps.applyPatch(resetPatch);
      }

      this.deps.setLastReset(today);
    } else {
      // Already reset today, but still sync waterMl from checkin
      const currentWaterMl = Number(this.deps.getProfile().waterMl) || 0;
      if (currentWaterMl !== todayWater) {
        this.deps.applyPatch({ waterMl: todayWater });
      }
    }

    // Always check habit auto-start (regardless of needsReset)
    if (this.deps.onHabitDailyReset) {
      this.deps.onHabitDailyReset();
    }
    
    // Check if we need to generate reviews
    if (this.deps.onReviewDailyReset && needsReset) {
      const todayDate = new Date();
      const dayOfWeek = todayDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      
      // Sunday: generate last week's review
      if (dayOfWeek === 0) {
        this.deps.onReviewDailyReset('week');
      }
      
      // Last day of month: generate this month's review
      const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      if (todayDate.getDate() === lastDayOfMonth) {
        this.deps.onReviewDailyReset('month');
      }
    }

    this.lastCheckedDate = today;

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
    if (this.timerId !== null) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.check();
      this.scheduleNext();
    }, msUntilMidnight() + 1000);
  }
}
