// ─────────────────────────────────────────────────────────────────
// Auth types
// ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  phone?: string;
  createdAt?: number;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  expiresAt: number;
}

export const defaultAuthState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isSignedIn: false,
  expiresAt: 0,
};

// ─────────────────────────────────────────────────────────────────
// @egoless-do/core — Shared TypeScript types
// ─────────────────────────────────────────────────────────────────

export type Mood = string;
export type HabitStatus = 'notStarted' | 'inProgress' | 'paused' | 'abandoned' | 'completed';
export type ThemeName = 'dark' | 'light' | 'ocean' | 'rose' | 'cosmos';

export interface Theme {
  name: string;
  nameEn?: string;
  bg: string;
  card: string;
  cardSolid: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  navBg: string;
  starfield: boolean;
}

export interface MindReflection {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  mood: Mood;
  link?: string;
  linkedHabitId?: string;
  cardTheme?: string;
  colors: readonly [string, string];
  isPinned: boolean;
  isPublished: boolean;
  updatedAt?: number;
  deleted?: boolean;
}

export interface FastingSession {
  id: string;
  targetHours: number;
  startedAt: number;
  endedAt?: number;
  estimatedKcal?: number;
  insight?: string;
  updatedAt?: number;
  deleted?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  startDate: string;
  targetDays: number;
  goal: string;
  insight: string;
  createTag: boolean;
  doneDays: number;
  streak: number;
  interrupted: number;
  status: HabitStatus;
  checkedDates: string[];
  pauseReason: string;
  abandonReason: string;
  updatedAt?: number;
  deleted?: boolean;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  note?: string;
  timestamp: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  ts: number;
  altitude?: number;
  speed?: number;
}

export interface ExerciseSet {
  reps: number;
  restSec?: number;
}

export interface ExerciseEntry {
  id: string;
  sportKey: string;
  sportIcon: string;
  durationSec: number;
  timestamp: number;
  distanceKm?: number;
  calories?: number;
  avgPace?: number;
  trackPoints?: GeoPoint[];
  isGpsSport?: boolean;
  mode?: 'free' | 'target';
  target?: { type: 'distance' | 'time' | 'calories' | 'reps'; value: number };
  segmentPaces?: number[];
  elevationGain?: number;
  pausedDuration?: number;
  reps?: number;
  sets?: ExerciseSet[];
  met?: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface CheckinEntry {
  date: string;
  done: boolean;
  note: string;
  streak: number;
  weight?: number;
  timestamp?: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface FastHistoryEntry {
  date: string;
  dur: string;
  kcal: number;
}

export interface MedHistoryEntry {
  date: string;
  dur: string;
  mood: string;
  updatedAt?: number;
  deleted?: boolean;
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

export interface SportItem {
  key: string;
  keyEn?: string;
  icon: string;
  color: string;
  gps?: boolean;
}

export interface SportGroup {
  group: string;
  groupEn?: string;
  items: SportItem[];
}

export interface UserProfile {
  weight?: number;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  updatedAt?: number;
}

export interface FoodPreset {
  name: string;
  nameEn: string;
  cal: number;
  unit: string;
  unitEn: string;
}

export interface FoodCategory {
  key: string;
  label: string;
  labelEn: string;
  icon: string;
  items: FoodPreset[];
}

export interface CustomFoodPreset {
  id: string;
  name: string;
  calories: number;
  note?: string;
}

// CheckinRecord removed — use CheckinEntry directly

// ── Plan Goal types (deprecated — kept for migration) ────────────

/** @deprecated Use PlanStatus instead */
export type GoalLevel = 'year' | 'quarter' | 'month' | 'week';
/** @deprecated Use PlanStatus instead */
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';

/** @deprecated Use Plan instead */
export interface Goal {
  id: string;
  parentId: string | null;
  level: GoalLevel;
  name: string;
  description: string;
  icon: string;
  startDate: string;
  endDate: string;
  status: GoalStatus;
  progress: number;
  tags: string[];
  order: number;
  updatedAt?: number;
  deleted?: boolean;
}

/** @deprecated */
export type TaskSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'interval'; every: number }
  | { type: 'specific'; days: number[] }
  | { type: 'once'; date: string };

/** @deprecated */
export type TaskLink =
  | { kind: 'none' }
  | { kind: 'habit'; habitId: string }
  | { kind: 'fasting'; targetHours: number }
  | { kind: 'meditation'; minMinutes: number }
  | { kind: 'exercise'; sportKey?: string; minMinutes: number }
  | { kind: 'checkin' }
  | { kind: 'water'; targetMl: number }
  | { kind: 'goalProgress'; targetGoalId: string };

/** @deprecated Use PlanItem instead */
export interface DailyTask {
  id: string;
  goalId: string | null;
  name: string;
  icon: string;
  schedule: TaskSchedule;
  required: boolean;
  link: TaskLink;
  order: number;
  updatedAt?: number;
  deleted?: boolean;
}

/** @deprecated Use PlanItemCheckin instead */
export interface TaskLog {
  id: string;
  taskId: string;
  date: string;
  done: boolean;
  note?: string;
  updatedAt?: number;
  deleted?: boolean;
}

// ── Plan types (new) ────────────────────────────────────────────

export type PlanStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'delayed';
export type PlanItemStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'delayed';
export type PlanItemLink = 'manual' | 'checkin' | 'fasting' | 'meditation' | 'exercise' | 'habit';

export interface Plan {
  id: string;
  name: string;
  goal: string;
  slogan: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  progress: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface PlanItem {
  id: string;
  planId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  contentUrl: string;
  totalCheckinDays: number;
  status: PlanItemStatus;
  progress: number;
  link: PlanItemLink;
  linkConfig?: {
    habitId?: string;
    targetMinutes?: number;
    targetHours?: number;
  };
  order: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface PlanItemCheckin {
  id: string;
  planItemId: string;
  date: string;
  done: boolean;
  note?: string;
  linkedModule?: string;
  updatedAt?: number;
  deleted?: boolean;
}

export type RecycleBinEntityType = 'habit' | 'reflection' | 'food' | 'exercise' | 'plan';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  data: Habit | MindReflection | FoodEntry | ExerciseEntry | Plan;
  deletedAt: number;
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
  habits: Habit[];
  activeFasting: FastingSession | null;
  userProfile: UserProfile;
  /** @deprecated Use plans instead */
  goals: Goal[];
  /** @deprecated Use planItems instead */
  dailyTasks: DailyTask[];
  /** @deprecated Use planItemCheckins instead */
  taskLogs: TaskLog[];
  plans: Plan[];
  planItems: PlanItem[];
  planItemCheckins: PlanItemCheckin[];
  recycleBin: RecycleBinItem[];
  graceHistory: GraceHistoryEntry[];
  remindEnabled: boolean;
  remindTime: string;
}

export interface GraceHistoryEntry {
  date: string;
  restoredAt: number;
}
