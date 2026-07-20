// ─── SQLite row → Zustand entity mappers ────────────────────────
// Each mapper calls buildRowToEntity with the correct type parameter
// to get compile-time type safety without `as unknown as` double-casts.

import type {
  Habit, MindReflection, FastingSession, FoodEntry, CheckinEntry,
  ExerciseEntry, MedHistoryEntry, UserProfile, Plan, PlanItem,
  PlanItemCheckin, GraceHistoryEntry, DailyCustomTodo, DailyTodoHistory,
  ThoughtTrail, TrailNote, ReflectionLink, CheckinReview,
  AIMode, ModelConfig, SleepEntry, EatingMotivationEntry, CustomWuxingMap,
  Vision, VisionPractice, Dedication, FearEntry, CourageEntry, FearAchievement,
  MantraDef, MantraSession, SutraReadingSession,
  ZhiguanSession,
  BodyGoal, BodyPlan, BodyTrainingPlan, WeightRecord, BodyCheckin, GiveEntry, CustomFoodPreset,
} from '@egoless-do/core';
import { SCHEMAS, buildRowToEntity } from '@egoless-do/core';

// BreathingRecord type (not exported from barrel, defined locally)
interface BreathingRecord {
  id: string; date: string; presetKey: string; durationSec: number;
  cycles: number; preDistress: number; postDistress: number;
  reflection?: string; guideStyle: 'scientific' | 'spiritual';
  updatedAt: number; deleted?: boolean;
}

// Pre-built mappers with correct generic types
const mappers = {
  habit:           buildRowToEntity<Habit>(SCHEMAS.habit),
  reflection:      buildRowToEntity<MindReflection>(SCHEMAS.reflection),
  fasting:         buildRowToEntity<FastingSession>(SCHEMAS.fasting),
  food:            buildRowToEntity<FoodEntry>(SCHEMAS.food),
  checkin:         buildRowToEntity<CheckinEntry>(SCHEMAS.checkin),
  exercise:        buildRowToEntity<ExerciseEntry>(SCHEMAS.exercise),
  meditation:      buildRowToEntity<MedHistoryEntry>(SCHEMAS.meditation),
  profile:         buildRowToEntity<UserProfile>(SCHEMAS.profile),
  plan:            buildRowToEntity<Plan>(SCHEMAS.plan),
  planItem:        buildRowToEntity<PlanItem>(SCHEMAS.planItem),
  planItemCheckin: buildRowToEntity<PlanItemCheckin>(SCHEMAS.planItemCheckin),
  grace:           buildRowToEntity<GraceHistoryEntry>(SCHEMAS.grace),
  dailyCustomTodo: buildRowToEntity<DailyCustomTodo>(SCHEMAS.dailyCustomTodo),
  dailyTodoHistory:buildRowToEntity<DailyTodoHistory>(SCHEMAS.dailyTodoHistory),
  thoughtTrail:    buildRowToEntity<ThoughtTrail>(SCHEMAS.thoughtTrail),
  trailNote:       buildRowToEntity<TrailNote>(SCHEMAS.trailNote),
  reflectionLink:  buildRowToEntity<ReflectionLink>(SCHEMAS.reflectionLink),
  aiConfig:        buildRowToEntity<{ mode: AIMode; models: ModelConfig[]; config_id?: string }>(SCHEMAS.aiConfig),
  checkinReview:   buildRowToEntity<CheckinReview>(SCHEMAS.checkinReview),
  bodyGoal:        buildRowToEntity<BodyGoal>(SCHEMAS.bodyGoal),
  bodyPlan:        buildRowToEntity<BodyPlan>(SCHEMAS.bodyPlan),
  bodyTrainingPlan: buildRowToEntity<BodyTrainingPlan>(SCHEMAS.bodyTrainingPlan),
  weightRecord:    buildRowToEntity<WeightRecord>(SCHEMAS.weightRecord),
  bodyCheckin:     buildRowToEntity<BodyCheckin>(SCHEMAS.bodyCheckin),
  sleep:           buildRowToEntity<SleepEntry>(SCHEMAS.sleep),
  give:            buildRowToEntity<GiveEntry>(SCHEMAS.give),
  motivationEntry: buildRowToEntity<EatingMotivationEntry>(SCHEMAS.motivationEntry),
  customWuxing:    buildRowToEntity<CustomWuxingMap>(SCHEMAS.customWuxing),
  vision:          buildRowToEntity<Vision>(SCHEMAS.vision),
  visionPractice:  buildRowToEntity<VisionPractice>(SCHEMAS.visionPractice),
  dedication:      buildRowToEntity<Dedication>(SCHEMAS.dedication),
  fearEntry:       buildRowToEntity<FearEntry>(SCHEMAS.fearEntry),
  courageEntry:    buildRowToEntity<CourageEntry>(SCHEMAS.courageEntry),
  fearAchievement: buildRowToEntity<FearAchievement>(SCHEMAS.fearAchievement),
  mantraDef:       buildRowToEntity<MantraDef>(SCHEMAS.mantraDef),
  mantraSession:   buildRowToEntity<MantraSession>(SCHEMAS.mantraSession),
  sutraReading:    buildRowToEntity<SutraReadingSession>(SCHEMAS.sutraReading),
  breath:          buildRowToEntity<BreathingRecord>((SCHEMAS as Record<string, typeof SCHEMAS.habit>).breath ?? SCHEMAS.zhiguanSession),
  zhiguanSession:  buildRowToEntity<ZhiguanSession>(SCHEMAS.zhiguanSession),
  foodPreset:      buildRowToEntity<CustomFoodPreset>(SCHEMAS.foodPreset),
};

// Export individual typed mappers
export const rowToHabit           = mappers.habit;
export const rowToReflection      = mappers.reflection;
export const rowToFasting         = mappers.fasting;
export const rowToFood            = mappers.food;
export const rowToCheckin         = mappers.checkin;
export const rowToExercise        = mappers.exercise;
export const rowToMeditation      = mappers.meditation;
export const rowToProfile         = mappers.profile;
export const rowToPlan            = mappers.plan;
export const rowToPlanItem        = mappers.planItem;
export const rowToPlanItemCheckin = mappers.planItemCheckin;
export const rowToGrace           = mappers.grace;
export const rowToDailyCustomTodo = mappers.dailyCustomTodo;
export const rowToDailyTodoHistory = mappers.dailyTodoHistory;
export const rowToThoughtTrail    = mappers.thoughtTrail;
export const rowToTrailNote       = mappers.trailNote;
export const rowToReflectionLink  = mappers.reflectionLink;
export const rowToAIConfig        = mappers.aiConfig;
export const rowToCheckinReview   = mappers.checkinReview;
export const rowToBodyGoal        = mappers.bodyGoal;
export const rowToBodyPlan        = mappers.bodyPlan;
export const rowToBodyTrainingPlan = mappers.bodyTrainingPlan;
export const rowToWeightRecord    = mappers.weightRecord;
export const rowToBodyCheckin     = mappers.bodyCheckin;
export const rowToSleep           = mappers.sleep;
export const rowToGive            = mappers.give;
export const rowToMotivationEntry = mappers.motivationEntry;
export const rowToCustomWuxing    = mappers.customWuxing;
export const rowToVision          = mappers.vision;
export const rowToVisionPractice  = mappers.visionPractice;
export const rowToDedication      = mappers.dedication;
export const rowToFearEntry       = mappers.fearEntry;
export const rowToCourageEntry    = mappers.courageEntry;
export const rowToFearAchievement = mappers.fearAchievement;
export const rowToMantraDef       = mappers.mantraDef;
export const rowToMantraSession   = mappers.mantraSession;
export const rowToSutraReading    = mappers.sutraReading;
export const rowToFoodPreset      = mappers.foodPreset;
export const rowToBreath          = mappers.breath;
export const rowToZhiguanSession  = mappers.zhiguanSession;

// Re-export for SyncEngine which uses the map directly
export const rowToEntityMap: Record<string, (row: Record<string, unknown>) => unknown> = mappers;
