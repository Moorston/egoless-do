// ─── Module state helpers ──────────────────────────────────────────
// Shared computations for fasting/exercise module state used by both
// habits.ts and plan.ts.

import { dateStr } from '../utils';

export interface FastingRecord {
  startedAt: number;
  endedAt?: number;
  deleted?: boolean;
}

export interface ExerciseRecord {
  timestamp: number;
  durationSec: number;
  deleted?: boolean;
}

/**
 * Compute the maximum fasting hours for a given date from fasting history.
 * Includes both completed and active fasting sessions.
 */
export function computeMaxFastingHours(
  fastingHistory: FastingRecord[],
  activeFasting: { startedAt: number } | null | undefined,
  today: string,
): number {
  let maxFastingHours = 0;
  for (const f of fastingHistory) {
    if (!f.endedAt) continue;
    if (dateStr(new Date(f.endedAt)) === today) {
      maxFastingHours = Math.max(maxFastingHours, (f.endedAt - f.startedAt) / 3600000);
    }
  }
  if (activeFasting != null) {
    const activeStart = dateStr(new Date(activeFasting.startedAt));
    if (activeStart === today || activeStart < today) {
      maxFastingHours = Math.max(maxFastingHours, (Date.now() - activeFasting.startedAt) / 3600000);
    }
  }
  return maxFastingHours;
}

/**
 * Compute the maximum exercise minutes for a given date from exercise log.
 */
export function computeMaxExerciseMinutes(
  exerciseLog: ExerciseRecord[],
  today: string,
): number {
  let maxExerciseMinutes = 0;
  for (const e of exerciseLog) {
    if (e.deleted) continue;
    if (dateStr(new Date(e.timestamp)) === today) {
      maxExerciseMinutes = Math.max(maxExerciseMinutes, e.durationSec / 60);
    }
  }
  return maxExerciseMinutes;
}
