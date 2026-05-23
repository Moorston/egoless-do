// ─────────────────────────────────────────────────────────────────
// ../../core — Shared TypeScript types
// ─────────────────────────────────────────────────────────────────

export type Mood = '平静' | '活力' | '沉思' | '感恩';
export type HabitStatus = 'notStarted' | 'inProgress' | 'paused' | 'abandoned' | 'completed';
export type ThemeName = 'dark' | 'light' | 'ocean' | 'forest' | 'rose' | 'cosmos';

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
  linkedHabitId?: string;
  cardTheme?: string;
  colors: readonly [string, string];
  isPinned: boolean;
  isPublished: boolean;
  updatedAt?: number;
  deleted?: boolean;
  // mobile legacy fields
  created_at?: number;
  is_pinned?: boolean;
  is_published?: boolean;
  synced?: number;
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
  // mobile legacy fields
  target_hours?: number;
  started_at?: number;
  ended_at?: number;
  estimated_kcal?: number;
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
  // mobile legacy fields
  cal?: number;
  ts?: number;
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

// CheckinRecord is now an alias for CheckinEntry (was a duplicate)
export type CheckinRecord = CheckinEntry;

// ── Auth ───────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
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

export interface AppState {
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
  reflections: MindReflection[];
  habits: Habit[];
  activeFasting: FastingSession | null;
  userProfile: UserProfile;
  remindEnabled: boolean;
  remindTime: string;
}

