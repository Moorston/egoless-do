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
