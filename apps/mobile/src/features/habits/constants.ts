// ─── Habit shared constants ──────────────────────────────────────
import { COLORS } from '@egoless-do/core';
import type { HabitStatus } from '@egoless-do/core';

export const STATUS_COLORS: Record<HabitStatus, string> = {
  notStarted: '#888',
  inProgress: COLORS.GREEN,
  paused: COLORS.YELLOW,
  abandoned: COLORS.RED,
  completed: '#7C3AED',
};

/** i18n keys for each habit status */
export const STATUS_LABELS: Record<HabitStatus, string> = {
  notStarted: 'habitStatusNotStarted',
  inProgress: 'habitStatusInProgress',
  paused: 'habitStatusPaused',
  abandoned: 'habitStatusAbandoned',
  completed: 'habitStatusCompleted',
};

export const STATUS_ORDER: Record<HabitStatus, number> = {
  inProgress: 0,
  notStarted: 1,
  paused: 2,
  completed: 3,
  abandoned: 4,
};

export const ALL_FILTERS: [string, string][] = [
  ['all', 'habitStatusAll'],
  ['notStarted', 'habitStatusNotStarted'],
  ['inProgress', 'habitStatusInProgress'],
  ['paused', 'habitStatusPaused'],
  ['abandoned', 'habitStatusAbandoned'],
  ['completed', 'habitStatusCompleted'],
];
