// ─── Shared Zustand store (platform-agnostic logic) ──────────────
import { uid, dateStr, tomorrow, computeStreak, estimateFastingKcal } from './utils';
import { MIND_COLORS } from './constants';
import type { MindReflection, Habit, FoodEntry, CheckinEntry, MedHistoryEntry, UserProfile, Mood, AppState, FastingSession } from './types';
import { defaultAuthState } from './types';

// ── Initial seed data ─────────────────────────────────────────────
// ── Pure action creators ──────────────────────────────────────────
export function createHabitFromForm(form: {
  name: string;
  startDate?: string;
  targetDays?: number;
  goal?: string;
  insight?: string;
  createTag?: boolean;
}): Habit {
  return {
    id: uid(),
    name: form.name,
    startDate: form.startDate ?? dateStr(),
    targetDays: form.targetDays ?? 21,
    goal: form.goal ?? '',
    insight: form.insight ?? '',
    createTag: form.createTag ?? false,
    doneDays: 0,
    streak: 0,
    interrupted: 0,
    status: 'notStarted',
    checkedDates: [],
    pauseReason: '',
    abandonReason: '',
    updatedAt: Date.now(),
  };
}

export function createReflection(params: { content: string; tags: string[]; mood: Mood; colorIdx?: number }): MindReflection {
  const idx = Math.min(Math.max(params.colorIdx ?? 0, 0), MIND_COLORS.length - 1);
  return {
    id: uid(), timestamp: Date.now(),
    content: params.content, tags: params.tags,
    mood: params.mood,
    colors: MIND_COLORS[idx] as unknown as readonly [string, string],
    isPinned: false, isPublished: false,
    updatedAt: Date.now(),
  };
}

export function createFastingSession(targetHours: number): FastingSession {
  return { id: uid(), targetHours, startedAt: Date.now(), updatedAt: Date.now() };
}

// ── Default app state ─────────────────────────────────────────────
export const defaultAppState: AppState = {
  auth: defaultAuthState,
  theme: 'dark',
  language: 'zh',
  streak: 0,
  waterMl: 0,
  waterGoal: 2000,
  calGoal: 2000,
  totalMedMinutes: 0,
  fastingHistory: [],
  medHistory: [],
  checkinHistory: [],
  foodLog: [],
  reflections: [],
  habits: [],
  activeFasting: null,
  userProfile: {},
  remindEnabled: false,
  remindTime: '21:00',
};

// ── Resettable data state (everything except auth/theme/language) ─
export const defaultDataState = {
  streak: 0,
  waterMl: 0,
  waterGoal: 2000,
  calGoal: 2000,
  totalMedMinutes: 0,
  fastingHistory: [] as FastingSession[],
  medHistory: [] as MedHistoryEntry[],
  checkinHistory: [] as CheckinEntry[],
  foodLog: [] as FoodEntry[],
  reflections: [] as MindReflection[],
  habits: [] as Habit[],
  activeFasting: null as FastingSession | null,
  userProfile: {} as UserProfile,
  remindEnabled: false,
  remindTime: '21:00',
};
