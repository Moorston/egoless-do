// ─── Habit business logic (pure functions) ─────────────────────
import type { Habit, HabitStatus } from '../types';
import { createHabitFromForm } from '../defaults';
import { computeStreak } from '../utils';

export type CreateHabitForm = Parameters<typeof createHabitFromForm>[0];

export function addHabitToList(habits: Habit[], form: CreateHabitForm): Habit[] {
  return [...habits, createHabitFromForm(form)];
}

export function updateHabitInList(habits: Habit[], id: string, patch: Partial<Habit>): Habit[] {
  const now = Date.now();
  return habits.map(h => h.id === id ? { ...h, ...patch, updatedAt: now } : h);
}

export function deleteHabitFromList(habits: Habit[], id: string): Habit[] {
  return habits.filter(h => h.id !== id);
}

export function checkinHabitInList(habits: Habit[], id: string, date: string): Habit[] {
  const now = Date.now();
  return habits.map(h => {
    if (h.id !== id) return h;
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
  return habits.map(h => h.id === id ? {
    ...h,
    status,
    pauseReason: status === 'paused' ? (reason ?? '') : h.pauseReason,
    abandonReason: status === 'abandoned' ? (reason ?? '') : h.abandonReason,
    updatedAt: now,
  } : h);
}
