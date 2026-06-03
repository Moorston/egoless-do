// ─── Shared Zustand store (platform-agnostic logic) ──────────────
import { uid, dateStr } from './utils';
import { MIND_COLORS_EXTENDED } from './constants';
import type { MindReflection, Habit, FoodEntry, CheckinEntry, MedHistoryEntry, UserProfile, AppState, FastingSession, ExerciseEntry, CustomFoodPreset, Plan, PlanItem, PlanItemCheckin, RecycleBinItem, GraceHistoryEntry } from './types';
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
    deleted: false,
  };
}

export function createReflection(params: { content: string; tags: string[]; mood: string; colorIdx?: number; link?: string }): MindReflection {
  const idx = Math.min(Math.max(params.colorIdx ?? 0, 0), MIND_COLORS_EXTENDED.length - 1);
  return {
    id: uid(), timestamp: Date.now(),
    content: params.content, tags: params.tags,
    mood: params.mood,
    link: params.link || undefined,
    colors: MIND_COLORS_EXTENDED[idx] as unknown as readonly [string, string],
    isPinned: false, isPublished: false,
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createFastingSession(targetHours: number): FastingSession {
  return { id: uid(), targetHours, startedAt: Date.now(), updatedAt: Date.now(), deleted: false };
}

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
  plans: [] as Plan[],
  planItems: [] as PlanItem[],
  planItemCheckins: [] as PlanItemCheckin[],
  recycleBin: [] as RecycleBinItem[],
  graceHistory: [] as GraceHistoryEntry[],
  remindEnabled: false,
  remindTime: '21:00',
  healthSyncEnabled: false,
  customFoodPresets: [] as CustomFoodPreset[],
  weightUnit: 'kg' as 'kg' | 'lb',
};

/** Create a patch object that resets all data fields (preserving auth, theme, language) */
export function createResetDataPatch(auth: AppState['auth'], theme: AppState['theme'], language: string): Record<string, unknown> {
  return {
    ...defaultDataState,
    auth,
    theme,
    language,
    customTags: [] as string[],
    customMoods: [] as string[],
    allTagsOrder: [] as string[],
    allMoodsOrder: [] as string[],
  };
}
