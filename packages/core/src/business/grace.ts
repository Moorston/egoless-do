// ─── Grace period business logic (pure functions) ──────────
import type { GraceHistoryEntry } from '../types';

/** Count grace records in a given month (YYYY-MM) */
export function getMonthGraceCount(
  graceHistory: GraceHistoryEntry[],
  yearMonth: string,
): number {
  return (graceHistory ?? []).filter(
    g => !g.deleted && g.date.startsWith(yearMonth),
  ).length;
}

/** Get remaining grace quota for current month */
export function getRemainingGrace(
  graceHistory: GraceHistoryEntry[],
  quota: number,
  currentMonth: string,
): number {
  return Math.max(0, quota - getMonthGraceCount(graceHistory, currentMonth));
}

/** Check if grace restore is available right now */
export function isGraceAvailable(
  graceHistory: GraceHistoryEntry[],
  quota: number,
  currentMonth: string,
  yesterdayDate: string,
): boolean {
  if (quota <= 0) return false;
  if ((graceHistory ?? []).some(g => g.date === yesterdayDate && !g.deleted)) return false;
  return getRemainingGrace(graceHistory, quota, currentMonth) > 0;
}
