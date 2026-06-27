// ─── Unified Slice interfaces (single source of truth) ─────────
import type {
  AuthState, ThemeName, Habit, MindReflection, FastingSession,
  MedHistoryEntry, FoodEntry, ExerciseEntry, CheckinEntry,
  UserProfile, CustomFoodPreset, Plan, PlanItem, PlanItemCheckin, PlanItemLink, PlanItemPriority,
  RecycleBinItem, RecycleBinEntityType, GraceHistoryEntry, DailyCustomTodo, DailyTodoHistory,
  ReflectionFilters, ThoughtTrail, ReflectionLink, LinkType, CheckinReview,
  TrailNote, TrailInsightCache, TrailReviewCache,
  PlanItemSource, UnifiedPlanItemForm,
} from '../types';
import type { SyncEntity } from '../sync/entities';
import type { CreateHabitForm } from '../business/habits';
import type { AIMode, ModelConfig } from '../ai/types';
import type { CreateReflectionParams } from '../business/reflections';
import type { StopFastingOpts } from '../business/fasting';

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

export interface ExerciseSlice {
  exerciseLog: ExerciseEntry[];
  addExercise: (entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  deleteExercise: (id: string) => void;
}

export interface CheckinSlice {
  checkinHistory: CheckinEntry[];
  streak: number;
  graceHistory: GraceHistoryEntry[];
  submitCheckin: (done: boolean, note: string, date?: string, weight?: number, grace?: boolean) => void;
  calculateStreak: () => void;
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

export interface SettingsSlice {
  theme: ThemeName;
  language: string;
  remindEnabled: boolean;
  remindTime: string;
  setTheme: (t: ThemeName) => void;
  setLanguage: (l: string) => void;
  setRemindEnabled: (v: boolean) => void;
  setRemindTime: (t: string) => void;
}

export interface TagMoodSlice {
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
}

export interface MeditationSlice {
  totalMedMinutes: number;
  medHistory: MedHistoryEntry[];
  addMedMinutes: (min: number) => void;
  calculateTotalMedMin: () => void;
}

// ─── Legacy UiSlice (compatibility alias) ──────────────────────

/** @deprecated Use FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice instead */
export type UiSlice = FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice & {
  resetData: () => void;
};

// ─── Existing slices (unchanged) ───────────────────────────────

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
  checkHabitAutoStatus: () => void;
  autoSyncHabits: () => void;
}

export interface ReflectionSlice {
  reflections: MindReflection[];
  reflectionFilters: ReflectionFilters;
  addReflection: (params: CreateReflectionParams) => MindReflection | undefined;
  togglePin: (id: string) => void;
  deleteReflection: (id: string) => void;
  updateReflection: (id: string, updates: Partial<Pick<MindReflection, 'content' | 'tags' | 'mood' | 'link' | 'colors'>>) => void;
  /** 解绑感念与计划任务 */
  unlinkReflectionFromPlanItem: (reflectionId: string) => void;
  /** 更新感念筛选条件 */
  setReflectionFilters: (filters: ReflectionFilters | ((prev: ReflectionFilters) => ReflectionFilters)) => void;
}

export interface FastingSlice {
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  startFasting: (hours: number) => void;
  stopFasting: (opts?: StopFastingOpts) => void;
}

export interface PlanSlice {
  plans: Plan[];
  planItems: PlanItem[];
  planItemCheckins: PlanItemCheckin[];
  dailyCustomTodos: DailyCustomTodo[];
  dailyTodoHistory: DailyTodoHistory[];
  addPlan: (form: { name: string; goal: string; slogan?: string; startDate: string; endDate: string }) => string;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  startPlan: (id: string) => void;
  pausePlan: (id: string) => void;
  resumePlan: (id: string) => void;
  completePlan: (id: string) => void;
  cancelPlan: (id: string) => void;
  checkAutoStatus: () => void;
  addPlanItem: (form: {
    planId: string; name: string; description?: string;
    startDate: string; endDate: string; contentUrl?: string;
    link?: PlanItemLink; priority?: PlanItemPriority; targetMetric?: string; linkConfig?: PlanItem['linkConfig']; reflectionId?: string; order?: number; frequency?: PlanItem['frequency']; tags?: string[];
  }) => void;
  updatePlanItem: (id: string, patch: Partial<PlanItem>) => void;
  deletePlanItem: (id: string) => void;
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
  clearIgnoredRecPatterns: () => void;
}

export interface TrailNoteSlice {
  trailNotes: TrailNote[];
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

export interface AISlice {
  aiMode: AIMode;
  aiModels: ModelConfig[];
  setAIMode: (mode: AIMode) => void;
  addAIModel: (model: ModelConfig) => void;
  updateAIModel: (modelId: string, updates: Partial<ModelConfig>) => void;
  removeAIModel: (modelId: string) => void;
  setDefaultAIModel: (modelId: string) => void;
  toggleAIModel: (modelId: string) => void;
}

export interface ReflectionLinkSlice {
  reflectionLinks: ReflectionLink[];
  createReflectionLink: (fromId: string, toId: string, type: LinkType, note?: string) => string;
  updateReflectionLink: (id: string, patch: Partial<ReflectionLink>) => void;
  deleteReflectionLink: (id: string) => void;
  getLinksByReflection: (reflectionId: string) => ReflectionLink[];
  getLinksFromReflection: (reflectionId: string) => ReflectionLink[];
  getLinksToReflection: (reflectionId: string) => ReflectionLink[];
  deleteLinksByReflection: (reflectionId: string) => void;
}

// ─── FullStore composition ─────────────────────────────────────

export type FullStore = AuthSlice & HabitSlice & ReflectionSlice & FastingSlice & MeditationSlice
  & FoodSlice & ExerciseSlice & CheckinSlice & ProfileSlice & SettingsSlice & TagMoodSlice
  & PlanSlice & RecycleBinSlice & ThoughtTrailSlice & TrailNoteSlice & ReflectionLinkSlice & AISlice & ReviewSlice & { resetData: () => void };

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
}

/** Type-safe storage adapter */
export interface StorageAdapter {
  persistChange<K extends SyncEntity>(entity: K, id: string, data: SyncDataMap[K]): Promise<void>;
  markDeleted(entity: SyncEntity, id: string): Promise<void>;
  /** Atomically delete multiple entities in a single transaction. */
  batchDelete(operations: Array<{ entity: SyncEntity; id: string }>): Promise<void>;
}
