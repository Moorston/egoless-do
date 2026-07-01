// ─── SQLite row → Zustand entity mappers ────────────────────────
// All rowTo* functions are now derived from SCHEMAS in entitySchemas.ts.

import type {
  Habit, MindReflection, FastingSession, FoodEntry, CheckinEntry,
  ExerciseEntry, MedHistoryEntry, UserProfile, Plan, PlanItem,
  PlanItemCheckin, GraceHistoryEntry, DailyCustomTodo, DailyTodoHistory,
  ThoughtTrail, TrailNote, ReflectionLink, CheckinReview,
  AIMode, ModelConfig, SleepEntry, EatingMotivationEntry, CustomWuxingMap,
} from '@egoless-do/core';
import { SCHEMAS, buildRowToEntity } from '@egoless-do/core';

// Row mapper type - functions from buildRowToEntity lose generic through Object.fromEntries
type RowMapper = (row: Record<string, unknown>) => Record<string, unknown>;

// Generate all rowTo* functions from SCHEMAS
const rowToEntityMap = Object.fromEntries(
  (Object.keys(SCHEMAS) as Array<keyof typeof SCHEMAS>).map(k => [k, buildRowToEntity(SCHEMAS[k])])
) as Record<string, RowMapper>;

export function rowToHabit(r: Record<string, unknown>): Habit {
  return rowToEntityMap.habit(r) as unknown as Habit;
}

export function rowToReflection(r: Record<string, unknown>): MindReflection {
  return rowToEntityMap.reflection(r) as unknown as MindReflection;
}

export function rowToFasting(r: Record<string, unknown>): FastingSession {
  return rowToEntityMap.fasting(r) as unknown as FastingSession;
}

export function rowToFood(r: Record<string, unknown>): FoodEntry {
  return rowToEntityMap.food(r) as unknown as FoodEntry;
}

export function rowToCheckin(r: Record<string, unknown>): CheckinEntry {
  return rowToEntityMap.checkin(r) as unknown as CheckinEntry;
}

export function rowToExercise(r: Record<string, unknown>): ExerciseEntry {
  return rowToEntityMap.exercise(r) as unknown as ExerciseEntry;
}

export function rowToMeditation(r: Record<string, unknown>): MedHistoryEntry {
  return rowToEntityMap.meditation(r) as unknown as MedHistoryEntry;
}

export function rowToProfile(r: Record<string, unknown>): UserProfile {
  return rowToEntityMap.profile(r) as unknown as UserProfile;
}

export function rowToPlan(r: Record<string, unknown>): Plan {
  return rowToEntityMap.plan(r) as unknown as Plan;
}

export function rowToPlanItem(r: Record<string, unknown>): PlanItem {
  return rowToEntityMap.planItem(r) as unknown as PlanItem;
}

export function rowToPlanItemCheckin(r: Record<string, unknown>): PlanItemCheckin {
  return rowToEntityMap.planItemCheckin(r) as unknown as PlanItemCheckin;
}

export function rowToGrace(r: Record<string, unknown>): GraceHistoryEntry {
  return rowToEntityMap.grace(r) as unknown as GraceHistoryEntry;
}

export function rowToDailyCustomTodo(r: Record<string, unknown>): DailyCustomTodo {
  return rowToEntityMap.dailyCustomTodo(r) as unknown as DailyCustomTodo;
}

export function rowToDailyTodoHistory(r: Record<string, unknown>): DailyTodoHistory {
  return rowToEntityMap.dailyTodoHistory(r) as unknown as DailyTodoHistory;
}

export function rowToThoughtTrail(r: Record<string, unknown>): ThoughtTrail {
  return rowToEntityMap.thoughtTrail(r) as unknown as ThoughtTrail;
}

export function rowToTrailNote(r: Record<string, unknown>): TrailNote {
  return rowToEntityMap.trailNote(r) as unknown as TrailNote;
}

export function rowToReflectionLink(r: Record<string, unknown>): ReflectionLink {
  return rowToEntityMap.reflectionLink(r) as unknown as ReflectionLink;
}

export function rowToAIConfig(r: Record<string, unknown>): { mode: AIMode; models: ModelConfig[]; config_id?: string } {
  return rowToEntityMap.aiConfig(r) as unknown as { mode: AIMode; models: ModelConfig[]; config_id?: string };
}

export function rowToCheckinReview(r: Record<string, unknown>): CheckinReview {
  return rowToEntityMap.checkinReview(r) as unknown as CheckinReview;
}

export function rowToBodyGoal(r: Record<string, unknown>): Record<string, unknown> {
  return rowToEntityMap.bodyGoal(r);
}

export function rowToBodyPlan(r: Record<string, unknown>): Record<string, unknown> {
  return rowToEntityMap.bodyPlan(r);
}

export function rowToWeightRecord(r: Record<string, unknown>): Record<string, unknown> {
  return rowToEntityMap.weightRecord(r);
}

export function rowToBodyCheckin(r: Record<string, unknown>): Record<string, unknown> {
  return rowToEntityMap.bodyCheckin(r);
}

export function rowToSleep(r: Record<string, unknown>): SleepEntry {
  return rowToEntityMap.sleep(r) as unknown as SleepEntry;
}

export function rowToMotivationEntry(r: Record<string, unknown>): EatingMotivationEntry {
  return rowToEntityMap.motivationEntry(r) as unknown as EatingMotivationEntry;
}

export function rowToCustomWuxing(r: Record<string, unknown>): CustomWuxingMap {
  return rowToEntityMap.customWuxing(r) as unknown as CustomWuxingMap;
}
