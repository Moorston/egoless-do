// ─── App-level types ──────────────────────────────────────────────
import type { AuthState } from './auth';
import type { ThemeName } from './shared';
import type { Habit } from './habit';
import type { MindReflection } from './reflection';
import type { FastingSession } from './fasting';
import type { FoodEntry, CustomFoodPreset } from './food';
import type { ExerciseEntry } from './exercise';
import type { CheckinEntry, MedHistoryEntry, GraceHistoryEntry } from './checkin';
import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from './plan';
import type { RecycleBinItem } from './recycle';
import type { ThoughtTrail } from './thought-trail';
import type { ReflectionLink } from './reflection-link';

// ─── Age bracket & body fat estimation ─────────────────────────
export type AgeBracket = '18-29' | '30-39' | '40-49' | '50-59' | '60-69' | '70+';

export const AGE_BRACKETS: AgeBracket[] = ['18-29', '30-39', '40-49', '50-59', '60-69', '70+'];

export function bracketMidpoint(bracket: AgeBracket): number {
  switch (bracket) {
    case '18-29': return 24;
    case '30-39': return 34;
    case '40-49': return 44;
    case '50-59': return 54;
    case '60-69': return 64;
    case '70+': return 75;
  }
}

export function ageToBracket(age: number | undefined): AgeBracket | undefined {
  if (age == null) return undefined;
  if (age < 30) return '18-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  return '70+';
}

const BF_BASELINE: Record<'male' | 'female' | 'private', Record<AgeBracket, number>> = {
  male:    { '18-29': 18, '30-39': 22, '40-49': 25, '50-59': 28, '60-69': 30, '70+': 32 },
  female:  { '18-29': 25, '30-39': 28, '40-49': 32, '50-59': 35, '60-69': 37, '70+': 38 },
  private: { '18-29': 21, '30-39': 25, '40-49': 28, '50-59': 31, '60-69': 33, '70+': 35 },
};

/**
 * Estimate body fat % from BMI + age bracket + gender.
 * Falls back to demographic baseline if inputs are insufficient.
 */
export function estimateBodyFat(opts: {
  gender?: 'male' | 'female' | 'private';
  ageBracket: AgeBracket | undefined;
  height: number | undefined;
  weight: number | undefined;
}): number | undefined {
  const { gender = 'private', ageBracket, height, weight } = opts;
  if (!ageBracket) return undefined;
  const g = gender === 'male' || gender === 'female' ? gender : 'private';
  const baseline = BF_BASELINE[g][ageBracket];
  if (!height || !weight || height <= 0 || weight <= 0) return baseline;
  const bmi = weight / Math.pow(height / 100, 2);
  const c = g === 'male' ? -16.2 : g === 'female' ? -5.4 : -10.8;
  const raw = 1.20 * bmi + 0.23 * bracketMidpoint(ageBracket) + c;
  return Math.max(3, Math.min(60, Math.round(raw * 10) / 10));
}

export interface UserProfile {
  nickname?: string;
  avatar?: string; // base64 data URI
  motto?: string;
  weight?: number;
  gender?: 'male' | 'female' | 'private';
  ageBracket?: AgeBracket;
  /** @deprecated Numeric age is migrated on read via ageToBracket(). */
  age?: number;
  height?: number;
  waterMl?: number;
  waterGoal?: number;
  weightUnit?: 'kg' | 'lb';
  graceMonthlyQuota?: number;
  musicFavorites?: string[];
  musicUserTracks?: Array<{ id: string; name: string; nameEn: string; category: string }>;
  musicVolume?: number;
  musicPlayMode?: string;
  bodyFat?: number;
  selfAssessment?: string;
  bodyTags?: string[];
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
