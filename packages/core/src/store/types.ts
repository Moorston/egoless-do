// ─── Unified Slice interfaces (single source of truth) ─────────
import type {
  AuthState, ThemeName, Habit, MindReflection, FastingSession,
  MedHistoryEntry, FoodEntry, ExerciseEntry, CheckinEntry,
  UserProfile, CustomFoodPreset, Plan, PlanItem, PlanItemCheckin, PlanItemLink,
  RecycleBinItem, RecycleBinEntityType, GraceHistoryEntry,
} from '../types';
import type { CreateHabitForm } from '../business/habits';
import type { CreateReflectionParams } from '../business/reflections';
import type { StopFastingOpts } from '../business/fasting';

export interface AuthSlice {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
}

export interface HabitSlice {
  habits: Habit[];
  addHabit: (form: CreateHabitForm) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkinHabit: (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
}

export interface ReflectionSlice {
  reflections: MindReflection[];
  addReflection: (params: CreateReflectionParams) => void;
  togglePin: (id: string) => void;
  deleteReflection: (id: string) => void;
  updateReflection: (id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) => void;
}

export interface FastingSlice {
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  totalMedMinutes: number;
  medHistory: MedHistoryEntry[];
  startFasting: (hours: number) => void;
  stopFasting: (opts?: StopFastingOpts) => void;
  addMedMinutes: (min: number) => void;
  calculateTotalMedMin: () => void;
}

export interface UiSlice {
  theme: ThemeName;
  language: string;
  streak: number;
  waterMl: number;
  waterGoal: number;
  calGoal: number;
  foodLog: FoodEntry[];
  exerciseLog: ExerciseEntry[];
  checkinHistory: CheckinEntry[];
  userProfile: UserProfile;
  remindEnabled: boolean;
  remindTime: string;
  weightUnit: 'kg' | 'lb';
  customTags: string[];
  customMoods: string[];
  customFoodPresets: CustomFoodPreset[];
  setTheme: (t: ThemeName) => void;
  setLanguage: (l: string) => void;
  addWater: (ml: number) => void;
  resetWater: () => void;
  setWaterGoal: (ml: number) => void;
  setCalGoal: (n: number) => void;
  addFood: (entry: Omit<FoodEntry, 'id'>) => void;
  deleteFood: (id: string) => void;
  addExercise: (entry: Omit<ExerciseEntry, 'id'>) => void;
  deleteExercise: (id: string) => void;
  submitCheckin: (done: boolean, note: string, date?: string, weight?: number) => void;
  addGraceRecord: (date: string) => void;
  graceHistory: GraceHistoryEntry[];
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;
  setWeightUnit: (u: 'kg' | 'lb') => void;
  calculateStreak: () => void;
  resetData: () => void;
  addCustomTag: (tag: string) => void;
  removeCustomTag: (tag: string) => void;
  updateCustomTag: (oldTag: string, newTag: string) => void;
  reorderCustomTag: (fromIndex: number, toIndex: number) => void;
  addCustomMood: (mood: string) => void;
  removeCustomMood: (mood: string) => void;
  updateCustomMood: (oldMood: string, newMood: string) => void;
  reorderCustomMood: (fromIndex: number, toIndex: number) => void;
  allTagsOrder: string[];
  allMoodsOrder: string[];
  reorderAllTag: (fromIndex: number, toIndex: number) => void;
  reorderAllMood: (fromIndex: number, toIndex: number) => void;
  addCustomFoodPreset: (name: string, calories: number, note?: string) => void;
  removeCustomFoodPreset: (id: string) => void;
}

export interface PlanSlice {
  plans: Plan[];
  planItems: PlanItem[];
  planItemCheckins: PlanItemCheckin[];
  addPlan: (form: { name: string; goal: string; slogan?: string; startDate: string; endDate: string }) => string;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  startPlan: (id: string) => void;
  pausePlan: (id: string) => void;
  resumePlan: (id: string) => void;
  completePlan: (id: string) => void;
  cancelPlan: (id: string) => void;
  delayPlan: (id: string) => void;
  checkAutoStatus: () => void;
  addPlanItem: (form: {
    planId: string; name: string; description?: string;
    startDate: string; endDate: string; contentUrl?: string;
    link?: PlanItemLink; linkConfig?: PlanItem['linkConfig']; order?: number;
  }) => void;
  updatePlanItem: (id: string, patch: Partial<PlanItem>) => void;
  deletePlanItem: (id: string) => void;
  checkinPlanItem: (planItemId: string, date?: string) => void;
  uncheckinPlanItem: (planItemId: string, date?: string) => void;
  autoSyncPlanItems: () => void;
}

export interface RecycleBinSlice {
  recycleBin: RecycleBinItem[];
  addToRecycleBin: (item: Omit<RecycleBinItem, 'deletedAt'>) => void;
  restoreFromRecycleBin: (id: string) => void;
  removeFromRecycleBin: (id: string) => void;
  emptyRecycleBin: () => void;
  cleanupRecycleBin: () => void;
}
