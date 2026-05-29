// ─── Dexie (IndexedDB) – mirrors mobile SQLite schema ────────────
import Dexie, { type Table } from 'dexie';
import type {
  Habit, MindReflection, FoodEntry, CheckinEntry, FastingSession, ExerciseEntry,
  Plan, PlanItem, PlanItemCheckin,
} from '@egoless-do/core';

export type SyncEntity = 'habit' | 'reflection' | 'fasting' | 'food' | 'checkin' | 'meditation' | 'profile' | 'exercise' | 'goal' | 'task' | 'taskLog' | 'plan' | 'planItem' | 'planItemCheckin';
export type SyncOperation = 'upsert' | 'delete';

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
  plans!:          Table<Plan,           string>;
  planItems!:      Table<PlanItem,       string>;
  planItemCheckins!:Table<PlanItemCheckin, string>;
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
  }
}

export const db = new EgolessDB();
