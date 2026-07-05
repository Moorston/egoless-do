// ─── Habit business logic (pure functions) ─────────────────────
import type { Habit, HabitStatus, HabitLink } from '../types';
import type { FastingSession, MedHistoryEntry, ExerciseEntry, SleepEntry } from '../types';
import { createHabitFromForm } from '../defaults';
import { computeStreak, dateStr } from '../utils';
import { computeMaxFastingHours, computeMaxExerciseMinutes } from './module-state';

export type CreateHabitForm = Parameters<typeof createHabitFromForm>[0];
export { createHabitFromForm };

/** Link type options for habits */
export const HABIT_LINK_OPTIONS: { value: HabitLink; labelKey: string }[] = [
  { value: 'none', labelKey: 'habitLinkNone' },
  { value: 'fasting', labelKey: 'habitLinkFasting' },
  { value: 'meditation', labelKey: 'habitLinkMeditation' },
  { value: 'exercise', labelKey: 'habitLinkExercise' },
  { value: 'sleep', labelKey: 'habitLinkSleep' },
];

export function addHabitToList(habits: Habit[], form: CreateHabitForm): Habit[] {
  return [...habits, createHabitFromForm(form)];
}

export function updateHabitInList(habits: Habit[], id: string, patch: Partial<Habit>): Habit[] {
  const now = Date.now();
  return habits.map(h => h.id === id && !h.deleted ? { ...h, ...patch, updatedAt: now } : h);
}

export function deleteHabitFromList(habits: Habit[], id: string): Habit[] {
  const now = Date.now();
  return habits.map(h => (h.id === id && !h.deleted) ? { ...h, deleted: true, updatedAt: now } : h);
}

export function checkinHabitInList(habits: Habit[], id: string, date: string): Habit[] {
  const now = Date.now();
  return habits.map(h => {
    if (h.id !== id || h.deleted) return h;
    const checked = (h.checkedDates ?? []).includes(date)
      ? (h.checkedDates ?? []).filter(d => d !== date)
      : [...(h.checkedDates ?? []), date];
    return {
      ...h,
      checkedDates: checked,
      doneDays: checked.length,
      streak: computeStreak(checked),
      updatedAt: now,
    };
  });
}

export function changeHabitStatusInList(
  habits: Habit[], id: string, status: HabitStatus, reason?: string
): Habit[] {
  const now = Date.now();
  return habits.map(h => h.id === id && !h.deleted ? {
    ...h,
    status,
    pauseReason: status === 'paused' ? (reason ?? '') : h.pauseReason,
    abandonReason: status === 'abandoned' ? (reason ?? '') : h.abandonReason,
    updatedAt: now,
  } : h);
}

/** Auto-start habits: notStarted → inProgress when startDate arrives */
export function checkAutoStatus(habits: Habit[], today: string): Habit[] {
  return habits.map(h => {
    if (h.deleted) return h;
    if (h.status === 'completed' || h.status === 'abandoned') return h;
    if (h.status === 'notStarted' && h.startDate <= today) {
      return { ...h, status: 'inProgress', updatedAt: Date.now() };
    }
    return h;
  });
}

// ── Module state for habit auto-sync ──────────────────────────

export interface HabitModuleState {
  fastingHistory: FastingSession[];
  activeFasting: FastingSession | null;
  medHistory: MedHistoryEntry[];
  exerciseLog: ExerciseEntry[];
  sleepHistory: SleepEntry[];
}

/**
 * Auto-check habits whose linked module condition is met for today.
 * Returns updated habits array (new references only for changed items).
 */
export function syncHabitsFromModules(
  habits: Habit[],
  state: HabitModuleState,
  today: string,
): Habit[] {
  // Pre-compute module state using shared helpers
  const maxFastingHours = computeMaxFastingHours(state.fastingHistory, state.activeFasting, today);
  const meditationDone = state.medHistory.some(m => m.date === today && !m.deleted);
  const maxExerciseMinutes = computeMaxExerciseMinutes(state.exerciseLog, today);
  const sleepBarrierDone = (state.sleepHistory ?? []).some(s => s.date === today && !s.deleted && s.barrierDone);

  let changed = false;
  const result = habits.map(h => {
    if (h.deleted) return h;
    if (h.status !== 'inProgress') return h;
    if (h.link === 'none') return h;
    if ((h.checkedDates ?? []).includes(today)) return h;

    let linkedDone = false;
    switch (h.link) {
      case 'fasting':
        linkedDone = maxFastingHours >= (h.linkConfig?.targetHours ?? 16);
        break;
      case 'meditation':
        linkedDone = meditationDone;
        break;
      case 'exercise':
        linkedDone = maxExerciseMinutes >= (h.linkConfig?.targetMinutes ?? 30);
        break;
      case 'sleep':
        linkedDone = sleepBarrierDone;
        break;
      default:
        break;
    }

    if (!linkedDone) return h;

    changed = true;
    const checked = [...(h.checkedDates ?? []), today];
    return {
      ...h,
      checkedDates: checked,
      doneDays: checked.length,
      streak: computeStreak(checked),
      updatedAt: Date.now(),
    };
  });

  return changed ? result : habits;
}

// ── Habit statistics helpers ────────────────────────────────────

/** Compute weekly completion rates as percentages (last N weeks) */
export function computeWeeklyCompletionRates(
  checkedDates: string[], weeks: number = 8,
): number[] {
  const sorted = (checkedDates ?? []).slice().sort();
  if (sorted.length === 0) return Array(weeks).fill(0);

  const today = new Date();
  const rates: number[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - w * 7 - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const startStr = dateStr(weekStart);
    const endStr = dateStr(weekEnd);
    const count = sorted.filter(d => d >= startStr && d < endStr).length;
    rates.push(Math.round((count / 7) * 100));
  }

  return rates;
}

/** Compute weekly streak counts (last N weeks) */
export function computeWeeklyStreaks(
  checkedDates: string[], weeks: number = 8,
): number[] {
  const sorted = (checkedDates ?? []).slice().sort();
  if (sorted.length === 0) return Array(weeks).fill(0);

  const today = new Date();
  const streaks: number[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - w * 7 - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const startStr = dateStr(weekStart);
    const endStr = dateStr(weekEnd);
    const weekDates = sorted.filter(d => d >= startStr && d < endStr);

    // Count max consecutive days in this week
    let maxStreak = 0;
    let current = 0;
    for (let i = 0; i < weekDates.length; i++) {
      if (i === 0) { current = 1; }
      else {
        const prev = new Date(weekDates[i - 1]);
        const cur = new Date(weekDates[i]);
        const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        current = diff === 1 ? current + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, current);
    }
    streaks.push(maxStreak);
  }

  return streaks;
}

export interface HeatmapEntry {
  date: string;
  count: number;
}

/** Build heatmap data for the last N months */
export function buildHeatmapData(
  checkedDates: string[], months: number = 3,
): HeatmapEntry[] {
  const set = new Set(checkedDates ?? []);
  const entries: HeatmapEntry[] = [];
  const today = new Date();

  for (let d = months * 30; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const ds = dateStr(date);
    entries.push({ date: ds, count: set.has(ds) ? 1 : 0 });
  }

  return entries;
}
