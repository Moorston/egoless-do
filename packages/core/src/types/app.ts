// ─── App-level types ──────────────────────────────────────────────
import type { AuthState } from './auth';
import type { ThemeName } from './shared';
import type { Habit } from './habit';
import type { MindReflection } from './reflection';
import type { FastingSession } from './fasting';
import type { FoodEntry } from './food';
import type { ExerciseEntry } from './exercise';
import type { CheckinEntry, MedHistoryEntry, GraceHistoryEntry } from './checkin';
import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from './plan';
import type { RecycleBinItem } from './recycle';
import type { ThoughtTrail } from './thought-trail';
import type { ReflectionLink } from './reflection-link';
import type { CustomFoodPreset } from './food';

export interface UserProfile {
  nickname?: string;
  weight?: number;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  waterMl?: number;
  waterGoal?: number;
  weightUnit?: 'kg' | 'lb';
  graceMonthlyQuota?: number;
  updatedAt?: number;
}

export interface GlobalUser {
  id: number;
  name: string;
  lat: number;
  lng: number;
  days: number;
  sport: string;
  since: string;
  duration: string;
}

export interface AppState {
  auth: AuthState;
  theme: ThemeName;
  language: string;
  streak: number;
  waterMl: number;
  waterGoal: number;
  calGoal: number;
  totalMedMinutes: number;
  fastingHistory: FastingSession[];
  medHistory: MedHistoryEntry[];
  checkinHistory: CheckinEntry[];
  foodLog: FoodEntry[];
  exerciseLog: ExerciseEntry[];
  reflections: MindReflection[];
  thoughtTrails: ThoughtTrail[];
  reflectionLinks: ReflectionLink[];
  habits: Habit[];
  activeFasting: FastingSession | null;
  userProfile: UserProfile;
  plans: Plan[];
  planItems: PlanItem[];
  planItemCheckins: PlanItemCheckin[];
  dailyCustomTodos: DailyCustomTodo[];
  dailyTodoHistory: DailyTodoHistory[];
  recycleBin: RecycleBinItem[];
  graceHistory: GraceHistoryEntry[];
  customTags: string[];
  customMoods: string[];
  allTagsOrder: string[];
  allMoodsOrder: string[];
  customFoodPresets: CustomFoodPreset[];
  weightUnit: 'kg' | 'lb';
  healthSyncEnabled: boolean;
  remindEnabled: boolean;
  remindTime: string;
  trailNotes: import('./trail-note').TrailNote[];
  checkinReviews: import('./review').CheckinReview[];
  aiMode: string;
  aiModels: import('../ai/types').ModelConfig[];
  ignoredRecPatterns: string[];
}
