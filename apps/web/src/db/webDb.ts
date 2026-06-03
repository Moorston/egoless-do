// ─── Dexie (IndexedDB) – mirrors mobile SQLite schema ────────────
import Dexie, { type Table } from 'dexie';
import type {
  Habit, MindReflection, FoodEntry, CheckinEntry, FastingSession, ExerciseEntry,
  Plan, PlanItem, PlanItemCheckin, MedHistoryEntry, DailyCustomTodo, DailyTodoHistory,
} from '@egoless-do/core';

export type SyncEntity = 'habit' | 'reflection' | 'fasting' | 'food' | 'checkin' | 'meditation' | 'profile' | 'exercise' | 'plan' | 'planItem' | 'planItemCheckin' | 'dailyCustomTodo' | 'dailyTodoHistory' | 'grace';
export type SyncOperation = 'upsert' | 'delete';

/** Wrapper for profile storage in IndexedDB (UserProfile has no id field) */
export interface ProfileRecord {
  profileId: string;
  data: string; // JSON-serialized UserProfile
  updatedAt: number;
  deleted: boolean;
}

export interface SyncQueueItem {
  _id?: number;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  createdAt: number;
}

export class EgolessDB extends Dexie {
  habits!:         Table<Habit,         string>;
  reflections!:    Table<MindReflection,string>;
  fastingSessions!:Table<FastingSession, string>;
  foodEntries!:    Table<FoodEntry,      string>;
  checkins!:       Table<CheckinEntry,  string>;
  exerciseEntries!:Table<ExerciseEntry,  string>;
  meditationEntries!: Table<MedHistoryEntry, string>;
  profiles!:       Table<ProfileRecord,  string>;
  plans!:          Table<Plan,           string>;
  planItems!:      Table<PlanItem,       string>;
  planItemCheckins!:Table<PlanItemCheckin, string>;
  graceHistory!:   Table<{ date: string; updatedAt?: number; deleted?: boolean }, string>;
  dailyCustomTodos!: Table<DailyCustomTodo, string>;
  dailyTodoHistory!: Table<DailyTodoHistory, string>;
  syncQueue!:      Table<SyncQueueItem,  number>;

  constructor() {
    super('egoless-do');
    this.version(1).stores({
      habits:          'id, status, startDate',
      reflections:     'id, created_at, *tags',
      fastingSessions: 'id, started_at',
      foodEntries:     'id, ts',
      checkins:        'date',
    });
    this.version(2).stores({
      habits:          'id, status, startDate',
      reflections:     'id, created_at, *tags',
      fastingSessions: 'id, started_at',
      foodEntries:     'id, ts',
      checkins:        'date',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(3).stores({
      habits:          'id, status, startDate',
      reflections:     'id, created_at, *tags',
      fastingSessions: 'id, started_at',
      foodEntries:     'id, ts',
      checkins:        'date',
      exerciseEntries: 'id, sportKey, timestamp',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(4).stores({
      habits:          'id, status, startDate',
      reflections:     'id, created_at, *tags',
      fastingSessions: 'id, started_at',
      foodEntries:     'id, ts',
      checkins:        'date',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(5).stores({
      habits:          'id, status, startDate',
      reflections:     'id, created_at, *tags',
      fastingSessions: 'id, started_at',
      foodEntries:     'id, ts',
      checkins:        'date',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport',
      plans:           'id, status, startDate, endDate',
      planItems:       'id, planId, status, startDate, endDate',
      planItemCheckins:'id, planItemId, date',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(6).stores({
      habits:          'id, status, startDate, deleted',
      reflections:     'id, created_at, *tags, deleted',
      fastingSessions: 'id, started_at, deleted',
      foodEntries:     'id, ts, deleted',
      checkins:        'date, deleted',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport, deleted',
      plans:           'id, status, startDate, endDate, deleted',
      planItems:       'id, planId, status, startDate, endDate, deleted',
      planItemCheckins:'id, planItemId, date, deleted',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(7).stores({
      habits:          'id, status, startDate, deleted',
      reflections:     'id, created_at, *tags, deleted',
      fastingSessions: 'id, started_at, deleted',
      foodEntries:     'id, ts, deleted',
      checkins:        'date, deleted',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport, deleted',
      meditationEntries: 'date, deleted, updatedAt',
      profiles:        'profileId, updatedAt, deleted',
      plans:           'id, status, startDate, endDate, deleted',
      planItems:       'id, planId, status, startDate, endDate, deleted',
      planItemCheckins:'id, planItemId, date, deleted',
      graceHistory:    'date, deleted, updatedAt',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(8).stores({
      habits:          'id, status, startDate, deleted',
      reflections:     'id, created_at, *tags, deleted',
      fastingSessions: 'id, started_at, deleted',
      foodEntries:     'id, ts, deleted',
      checkins:        'date, deleted',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport, deleted',
      meditationEntries: 'date, deleted, updatedAt',
      profiles:        'profileId, updatedAt, deleted',
      plans:           'id, status, startDate, endDate, deleted',
      planItems:       'id, planId, status, startDate, endDate, deleted, priority',
      planItemCheckins:'id, planItemId, date, deleted',
      graceHistory:    'date, deleted, updatedAt',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
    this.version(9).stores({
      habits:          'id, status, startDate, deleted',
      reflections:     'id, created_at, *tags, deleted',
      fastingSessions: 'id, started_at, deleted',
      foodEntries:     'id, ts, deleted',
      checkins:        'date, deleted',
      exerciseEntries: 'id, sportKey, timestamp, isGpsSport, deleted',
      meditationEntries: 'date, deleted, updatedAt',
      profiles:        'profileId, updatedAt, deleted',
      plans:           'id, status, startDate, endDate, deleted',
      planItems:       'id, planId, status, startDate, endDate, deleted, priority',
      planItemCheckins:'id, planItemId, date, deleted',
      graceHistory:    'date, deleted, updatedAt',
      dailyCustomTodos:'id, planId, date, deleted',
      dailyTodoHistory:'id, planId, date, deleted',
      syncQueue:       '++_id, entity, entityId, operation, createdAt',
    });
  }
}

export const db = new EgolessDB();
