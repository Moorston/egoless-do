// ─── Shared Zustand store (platform-agnostic logic) ──────────────
import { uid, dateStr, tomorrow, computeStreak, estimateFastingKcal } from './utils';
import { MIND_COLORS } from './constants';
import type { MindReflection, Habit, FoodEntry, CheckinEntry, MedHistoryEntry, UserProfile, AppState, FastingSession, ExerciseEntry, Goal, GoalLevel, GoalStatus, DailyTask, TaskSchedule, TaskLink, TaskLog, CustomFoodPreset, Plan, PlanItem, PlanItemCheckin } from './types';
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

export function createReflection(params: { content: string; tags: string[]; mood: string; colorIdx?: number; link?: string }): MindReflection {
  const idx = Math.min(Math.max(params.colorIdx ?? 0, 0), MIND_COLORS.length - 1);
  return {
    id: uid(), timestamp: Date.now(),
    content: params.content, tags: params.tags,
    mood: params.mood,
    link: params.link || undefined,
    colors: MIND_COLORS[idx] as unknown as readonly [string, string],
    isPinned: false, isPublished: false,
    updatedAt: Date.now(),
  };
}

export function createFastingSession(targetHours: number): FastingSession {
  return { id: uid(), targetHours, startedAt: Date.now(), updatedAt: Date.now() };
}

export function createGoalFromForm(form: {
  parentId?: string | null;
  level: GoalLevel;
  name: string;
  description?: string;
  icon?: string;
  startDate: string;
  endDate: string;
  tags?: string[];
  order?: number;
}): Goal {
  return {
    id: uid(),
    parentId: form.parentId ?? null,
    level: form.level,
    name: form.name,
    description: form.description ?? '',
    icon: form.icon ?? '🎯',
    startDate: form.startDate,
    endDate: form.endDate,
    status: 'active',
    progress: 0,
    tags: form.tags ?? [],
    order: form.order ?? 0,
    updatedAt: Date.now(),
  };
}

export function createTaskFromForm(form: {
  goalId?: string | null;
  name: string;
  icon?: string;
  schedule: TaskSchedule;
  required?: boolean;
  link?: TaskLink;
  order?: number;
}): DailyTask {
  return {
    id: uid(),
    goalId: form.goalId ?? null,
    name: form.name,
    icon: form.icon ?? '📋',
    schedule: form.schedule,
    required: form.required ?? false,
    link: form.link ?? { kind: 'none' },
    order: form.order ?? 0,
    updatedAt: Date.now(),
  };
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
  exerciseLog: [],
  reflections: [],
  habits: [],
  activeFasting: null,
  userProfile: {},
  goals: [],
  dailyTasks: [],
  taskLogs: [],
  plans: [],
  planItems: [],
  planItemCheckins: [],
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
  exerciseLog: [] as ExerciseEntry[],
  reflections: [] as MindReflection[],
  habits: [] as Habit[],
  activeFasting: null as FastingSession | null,
  userProfile: {} as UserProfile,
  goals: [] as Goal[],
  dailyTasks: [] as DailyTask[],
  taskLogs: [] as TaskLog[],
  plans: [] as Plan[],
  planItems: [] as PlanItem[],
  planItemCheckins: [] as PlanItemCheckin[],
  remindEnabled: false,
  remindTime: '21:00',
  healthSyncEnabled: false,
  customFoodPresets: [] as CustomFoodPreset[],
};
