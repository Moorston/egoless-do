// ─── Unified Slice interfaces (single source of truth) ─────────
import type { AIMode, ModelConfig } from '../ai/types';
import type { CreateHabitForm } from '../business/habits';
import type { CreateReflectionParams } from '../business/reflections';
import type { SyncEntity } from '../sync/entities';
import type {
  AuthState, Habit, MindReflection, FastingSession,
  MedHistoryEntry, FoodEntry, ExerciseEntry, CheckinEntry,
  UserProfile, CustomFoodPreset, Plan, PlanItem, PlanItemCheckin, PlanItemLink, PlanItemPriority,
  RecycleBinItem, GraceHistoryEntry, DailyCustomTodo, DailyTodoHistory,
  ReflectionFilters, ThoughtTrail, ReflectionLink, LinkType, CheckinReview,
  TrailNote, TrailInsightCache, TrailReviewCache,
  PlanItemSource, UnifiedPlanItemForm,
  SleepEntry, SleepGoal,
  GiveEntry,
  EatingMotivationEntry, CustomWuxingMap, FoodWuxingItem, WuxingStats, FlavorStats,
  MotivationStats, EmotionSensitiveDay,
  FearEntry, CourageEntry, FearAchievement,
  SutraReadingSession,
  ZhiguanSession,
} from '../types';

import type { BodySlice } from './createBodySlice';
import type { ExerciseSlice } from './createExerciseSlice';
import type { FastingSlice } from './createFastingSlice';
import type { MantraSlice } from './createMantraSlice';
import type { MeditationSlice } from './createMeditationSlice';
import type { PracticeSlice } from './createPracticeSlice';
import type { SettingsSlice } from './createSettingsSlice';
import type { MindSlice } from './mindSliceTypes';
import type { ZhiguanSlice } from './zhiguanSliceTypes';

export type { BodySlice } from './createBodySlice';
export type { ExerciseSlice } from './createExerciseSlice';
export type { FastingSlice } from './createFastingSlice';
export type { MantraSlice } from './createMantraSlice';
export type { MeditationSlice } from './createMeditationSlice';
export type { PracticeSlice } from './createPracticeSlice';
export type { SettingsSlice } from './createSettingsSlice';
export type { MindSlice } from './mindSliceTypes';
export type { ZhiguanSlice } from './zhiguanSliceTypes';

/** Error record for slice-level persistence failures */
export interface SliceError {
  entity: string;
  id: string;
  error: string;
  timestamp: number;
}

// ─── Granular slice interfaces ─────────────────────────────────

export interface FoodSlice {
  foodLog: FoodEntry[];
  calGoal: number;
  customFoodPresets: CustomFoodPreset[];
  addFood: (entry: Omit<FoodEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  deleteFood: (id: string) => void;
  setCalGoal: (n: number) => void;
  addCustomFoodPreset: (name: string, calories: number, note?: string) => void;
  removeCustomFoodPreset: (id: string) => void;
}


export interface CheckinSlice {
  // Checkin
  checkinHistory: CheckinEntry[];
  // streak 已移除：改为从 checkinHistory 派生（useCheckinStreak selector）
  graceHistory: GraceHistoryEntry[];
  submitCheckin: (done: boolean, note: string, date?: string, weight?: number, grace?: boolean) => void;
  calculateStreak: () => void;  // 保留用于向后兼容，实际由 selector 替代
  addGraceRecord: (date: string) => void;
}

export interface ProfileSlice {
  userProfile: UserProfile;
  waterMl: number;
  waterGoal: number;
  weightUnit: 'kg' | 'lb';
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addWater: (ml: number) => void;
  resetWater: () => void;
  setWaterGoal: (ml: number) => void;
  setWeightUnit: (u: 'kg' | 'lb') => void;
}

export interface SleepSlice {
  sleepHistory: SleepEntry[];
  sleepGoal: SleepGoal;
  getTodaySleep: () => SleepEntry | undefined;
  completeBarrier: (opts: { barrierMin: number; awayMin: number; practice?: string[] }) => void;
  saveSleepDiary: (entry: Partial<SleepEntry>) => void;
  setSleepGoal: (goal: SleepGoal) => void;
}

// GiveSlice removed — functionality now lives in PracticeSlice


// ─── Existing slices (unchanged) ───────────────────────────────

export interface AuthSlice {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  verifyMfaLogin: (mfaToken: string, code: string) => Promise<void>;
  register: (email: string, password: string, name: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearDataAndLogout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  pullServerData: (token?: string) => Promise<void>;
  persistTokenNow: () => Promise<void>;
}

export interface HabitSlice {
  habits: Habit[];
  addHabit: (form: CreateHabitForm) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  checkinHabit: (id: string, date: string) => void;
  changeHabitStatus: (id: string, ns: Habit['status'], reason?: string) => void;
  checkHabitAutoStatus: () => void;
  autoSyncHabits: () => void;
}

export interface ReflectionSlice {
  // Reflection
  reflections: MindReflection[];
  reflectionFilters: ReflectionFilters;
  addReflection: (params: CreateReflectionParams) => MindReflection | undefined;
  togglePin: (id: string) => void;
  deleteReflection: (id: string) => void;
  updateReflection: (id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) => void;
  unlinkReflectionFromPlanItem: (reflectionId: string) => void;
  setReflectionFilters: (filters: ReflectionFilters | ((prev: ReflectionFilters) => ReflectionFilters)) => void;

  // Tags & Moods
  customTags: string[];
  customMoods: string[];
  allTagsOrder: string[];
  allMoodsOrder: string[];
  addCustomTag: (tag: string) => void;
  removeCustomTag: (tag: string) => void;
  updateCustomTag: (oldTag: string, newTag: string) => void;
  reorderCustomTag: (fromIndex: number, toIndex: number) => void;
  addCustomMood: (mood: string) => void;
  removeCustomMood: (mood: string) => void;
  updateCustomMood: (oldMood: string, newMood: string) => void;
  reorderCustomMood: (fromIndex: number, toIndex: number) => void;
  reorderAllTag: (fromIndex: number, toIndex: number) => void;
  reorderAllMood: (fromIndex: number, toIndex: number) => void;

  // Reflection Links
  reflectionLinks: ReflectionLink[];
  createReflectionLink: (fromId: string, toId: string, type: LinkType, note?: string) => string;
  updateReflectionLink: (id: string, patch: Partial<ReflectionLink>) => void;
  getLinksByReflection: (reflectionId: string) => ReflectionLink[];
  getLinksFromReflection: (reflectionId: string) => ReflectionLink[];
  getLinksToReflection: (reflectionId: string) => ReflectionLink[];
  deleteLinksByReflection: (reflectionId: string) => void;
}



export interface PlanSlice {
  plans: Plan[];
  planItems: PlanItem[];
  planItemCheckins: PlanItemCheckin[];
  dailyCustomTodos: DailyCustomTodo[];
  dailyTodoHistory: DailyTodoHistory[];
  addPlan: (form: { name: string; goal: string; slogan?: string; startDate: string; endDate: string; visionId?: string }) => string;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  startPlan: (id: string) => void;
  pausePlan: (id: string) => void;
  resumePlan: (id: string) => void;
  completePlan: (id: string, reason?: string) => void;
  cancelPlan: (id: string) => void;
  checkAutoStatus: () => void;
  addPlanItem: (form: {
    planId: string; name: string; description?: string;
    startDate: string; endDate: string; contentUrl?: string;
    link?: PlanItemLink; priority?: PlanItemPriority; targetMetric?: string; linkConfig?: PlanItem['linkConfig']; reflectionId?: string; order?: number; frequency?: PlanItem['frequency']; tags?: string[];
  }) => void;
  updatePlanItem: (id: string, patch: Partial<PlanItem>) => void;
  deletePlanItem: (id: string) => Promise<void>;
  checkinPlanItem: (planItemId: string, date?: string) => void;
  uncheckinPlanItem: (planItemId: string, date?: string) => void;
  autoSyncPlanItems: () => void;
  addDailyCustomTodo: (planId: string, name: string, date?: string, recurring?: boolean) => void;
  toggleDailyCustomTodo: (id: string, date?: string) => void;
  deleteDailyCustomTodo: (id: string) => void;
  saveDailyTodoHistory: (planId: string, date?: string) => void;
  performDailyReset: (previousDate: string) => void;
  /** 获取活跃计划 */
  getActivePlan: () => Plan | null;
  /** 统一创建计划任务 */
  createPlanItem: (source: PlanItemSource, form: UnifiedPlanItemForm) => boolean;
  /** @deprecated 使用 createPlanItem({ type: 'reflection', id }, form) */
  createPlanItemFromReflection: (reflectionId: string, startDate: string, endDate: string, priority?: PlanItemPriority, name?: string, description?: string, targetMetric?: string) => boolean;
  /** 检查计划是否可以废弃/取消/删除 */
  canArchivePlan: (planId: string) => { allowed: boolean; linkedReflectionCount: number };
  /** 批量解绑计划中所有任务的感念关联 */
  unlinkAllReflectionsFromPlan: (planId: string) => void;
  /** 发送计划延期提醒 */
  notifyPlanDelayed: (delayedPlans: Plan[]) => void;
}

export interface RecycleBinSlice {
  recycleBin: RecycleBinItem[];
  addToRecycleBin: (item: Omit<RecycleBinItem, 'deletedAt'>) => void;
  restoreFromRecycleBin: (id: string) => void;
  removeFromRecycleBin: (id: string) => void;
  emptyRecycleBin: () => void;
  cleanupRecycleBin: () => void;
}

export interface ThoughtTrailSlice {
  thoughtTrails: ThoughtTrail[];
  trailNotes: TrailNote[];
  ignoredRecPatterns: string[];  // 用户忽略的推荐模式
  createThoughtTrail: (name: string, description?: string, reflectionIds?: string[], source?: 'auto' | 'manual' | 'recommended' | 'ai') => string;
  updateThoughtTrail: (id: string, patch: Partial<ThoughtTrail>) => void;
  deleteThoughtTrail: (id: string) => void;
  addReflectionToTrail: (trailId: string, reflectionId: string) => void;
  removeReflectionFromTrail: (trailId: string, reflectionId: string) => void;
  setInsightSummary: (trailId: string, summary: string) => void;
  setInsightCache: (trailId: string, cache: TrailInsightCache) => void;
  setReviewCache: (trailId: string, cache: TrailReviewCache) => void;
  createPlanItemFromTrail: (trailId: string, form: { name: string; description?: string; priority: PlanItemPriority; startDate: string; endDate: string }) => boolean;
  getTrailPlanItems: (trailId: string) => PlanItem[];
  addIgnoredRecPattern: (pattern: string) => void;
  addTrailNote: (trailId: string, form: { content: string; tags?: string[]; mood?: string; source: 'guided' | 'free'; guidedQuestion?: string }) => TrailNote;
  updateTrailNote: (noteId: string, patch: Partial<TrailNote>) => void;
  deleteTrailNote: (noteId: string) => void;
  getNotesByTrail: (trailId: string) => TrailNote[];
}


export interface ReviewSlice {
  checkinReviews: CheckinReview[];
  generateReview: (period: 'week' | 'month') => Promise<CheckinReview>;
  getReview: (period: 'week' | 'month', startDate: string) => CheckinReview | undefined;
  getLatestReview: (period: 'week' | 'month') => CheckinReview | undefined;
  deleteReview: (id: string) => void;
  clearAllReviews: () => void;
}

export interface AISlice extends SettingsSlice {}

// ─── Diet slice ─────────────────────────────────────────────

export interface DietSlice {
  // Food (from FoodSlice)
  foodLog: FoodEntry[];
  calGoal: number;
  customFoodPresets: CustomFoodPreset[];
  addFood: (entry: Omit<FoodEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  deleteFood: (id: string) => void;
  setCalGoal: (n: number) => void;
  addCustomFoodPreset: (name: string, calories: number, note?: string) => void;
  removeCustomFoodPreset: (id: string) => void;

  // Diet/Wu Xing
  motivationLog: EatingMotivationEntry[];
  customWuxingMaps: CustomWuxingMap[];
  setFoodMotivation: (entry: Omit<EatingMotivationEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  removeFoodMotivation: (foodId: string) => void;
  addCustomWuxingMap: (map: Omit<CustomWuxingMap, 'id' | 'updatedAt' | 'deleted'>) => void;
  removeCustomWuxingMap: (id: string) => void;
  lookupWuxing: (foodName: string) => FoodWuxingItem | null;
  getDailyFlavorStats: (date: string) => FlavorStats;
  getDailyWuxingStats: (date: string) => WuxingStats;
  getWuxingStatsRange: (dateFrom: string, dateTo: string) => WuxingStats;
  getMotivationStats: (dateFrom: string, dateTo: string) => MotivationStats;
  getEmotionSensitiveDays: (dateFrom: string, dateTo: string) => EmotionSensitiveDay[];
}

/** Slice-level error tracking — shared across all slices */
export interface SliceErrorState {
  sliceErrors: SliceError[];
  addSliceError: (error: SliceError) => void;
  clearSliceErrors: () => void;
}

// ─── FullStore composition ─────────────────────────────────────

export type FullStore = AuthSlice & HabitSlice & ReflectionSlice & CheckinSlice & ExerciseSlice & MeditationSlice & FastingSlice & SleepSlice
  & ProfileSlice & SettingsSlice
  & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & ReviewSlice & BodySlice & DietSlice & PracticeSlice & MantraSlice & MindSlice & ZhiguanSlice & SliceErrorState & { resetData: () => void };

// ─── Sync data mapping ────────────────────────────────────────

export interface SyncDataMap {
  habit: Habit;
  reflection: MindReflection;
  fasting: FastingSession;
  food: FoodEntry;
  checkin: CheckinEntry;
  exercise: ExerciseEntry;
  meditation: MedHistoryEntry;
  profile: Partial<UserProfile>;
  plan: Plan;
  planItem: PlanItem;
  planItemCheckin: PlanItemCheckin;
  dailyCustomTodo: DailyCustomTodo;
  dailyTodoHistory: DailyTodoHistory;
  grace: GraceHistoryEntry;
  thoughtTrail: ThoughtTrail;
  trailNote: TrailNote;
  reflectionLink: ReflectionLink;
  checkinReview: CheckinReview;
  aiConfig: { config_id: string; mode: AIMode; models: ModelConfig[]; updatedAt: number; deleted: boolean };
  bodyGoal: import('../types').BodyGoal;
  bodyPlan: import('../types').BodyPlan;
  weightRecord: import('../types').WeightRecord;
  bodyCheckin: import('../types').BodyCheckin;
  bodyTrainingPlan: import('../types').BodyTrainingPlan;
  breath: import('../types/breath').BreathingRecord;
  sleep: SleepEntry;
  give: GiveEntry;
  motivationEntry: EatingMotivationEntry;
  customWuxing: CustomWuxingMap;
  vision: import('../types').Vision;
  visionPractice: import('../types').VisionPractice;
  dedication: import('../types').Dedication;
  mantraDef: import('../types').MantraDef;
  mantraSession: import('../types').MantraSession;
  fearEntry: FearEntry;
  courageEntry: CourageEntry;
  fearAchievement: FearAchievement;
  sutraReading: SutraReadingSession;
  zhiguanSession: ZhiguanSession;
  foodPreset: CustomFoodPreset;
}

/** Type-safe storage adapter */
export interface StorageAdapter {
  persistChange<K extends SyncEntity>(entity: K, id: string, data: SyncDataMap[K]): Promise<void>;
  markDeleted(entity: SyncEntity, id: string): Promise<void>;
  /** Atomically delete multiple entities in a single transaction. */
  batchDelete(operations: Array<{ entity: SyncEntity; id: string }>): Promise<void>;
  /** Permanently remove entities from SQLite (physical row deletion) and enqueue delete for sync. */
  hardDelete(operations: Array<{ entity: SyncEntity; id: string }>): Promise<void>;
  /** Force flush pending writes to SQLite immediately. */
  flushNow?(): Promise<void>;

  // ── Settings persistence (Phase 1: unified storage) ──────────
  /** Persist a settings key-value pair to SQLite. */
  persistSettings(key: string, value: unknown): Promise<void>;
  /** Read a settings value from SQLite. Returns null if not found. */
  getSettings(key: string): Promise<unknown | null>;

  // ── Transaction support ──────────────────────────────────────
  /** Run a callback inside a SQLite transaction. Rolls back on error. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  // ── Error feedback (Phase 3: architecture improvement) ───────
  /** Optional callback invoked when a persist operation fails. UI can subscribe to show banners. */
  onPersistError?: (error: Error, entity: string, id: string) => void;
}
