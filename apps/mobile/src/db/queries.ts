// ─── All SQL query helpers ────────────────────────────────────────
import type { Habit, MindReflection, FoodEntry, CheckinEntry, FastingSession, ThoughtTrail } from '@egoless-do/core';
import type { SQLiteDatabase } from 'expo-sqlite';

import { rowToCheckin, rowToHabit, rowToReflection, rowToThoughtTrail } from '../store/rowMappers';

// ── Habits ────────────────────────────────────────────────────────
export async function dbGetAllHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM habits WHERE deleted = 0 ORDER BY rowid');
  return rows.map(rowToHabit);
}

// ── Reflections ───────────────────────────────────────────────────
export async function dbGetAllReflections(db: SQLiteDatabase): Promise<MindReflection[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM mind_reflections WHERE deleted = 0 ORDER BY created_at DESC'
  );
  return rows.map(rowToReflection);
}

// ── Fasting ───────────────────────────────────────────────────────
export async function dbGetFastingSessions(db: SQLiteDatabase): Promise<FastingSession[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM fasting_sessions WHERE deleted = 0 ORDER BY started_at DESC LIMIT 50'
  );
  return rows.map(r => ({
    id: r.id as string,
    targetHours: r.target_hours as number,
    startedAt: r.started_at as number,
    endedAt: r.ended_at as number | undefined,
    estimatedKcal: r.estimated_kcal as number | undefined,
    insight: r.insight as string | undefined,
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  }));
}

// ── Food entries ──────────────────────────────────────────────────
export async function dbGetFoodEntries(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM food_entries WHERE entry_date = ? AND deleted = 0 ORDER BY ts', [date]
  );
  return rows.map(r => ({
    id: r.id as string, name: r.name as string,
    calories: r.cal as number, note: r.note as string, timestamp: r.ts as number,
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  }));
}

export async function dbGetAllFoodEntries(db: SQLiteDatabase): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM food_entries WHERE deleted = 0 ORDER BY ts DESC'
  );
  return rows.map(r => ({
    id: r.id as string, name: r.name as string,
    calories: r.cal as number, note: r.note as string, timestamp: r.ts as number,
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  }));
}

// ── Checkins ──────────────────────────────────────────────────────
export async function dbGetCheckins(db: SQLiteDatabase): Promise<CheckinEntry[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM checkin_records WHERE deleted = 0 ORDER BY date DESC'
  );
  return rows.map(rowToCheckin);
}

// ── Safe JSON parse ──────────────────────────────────────────────
function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback; // Distinguish null/undefined from empty string
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ── Thought Trails ───────────────────────────────────────────────
export async function dbGetAllThoughtTrails(db: SQLiteDatabase): Promise<ThoughtTrail[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM thought_trails WHERE deleted = 0 ORDER BY created_at DESC'
  );
  return rows.map(rowToThoughtTrail);
}
