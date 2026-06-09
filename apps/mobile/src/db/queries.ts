// ─── All SQL query helpers ────────────────────────────────────────
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Habit, MindReflection, FoodEntry, CheckinEntry, FastingSession, ThoughtTrail } from '@egoless-do/core';

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
  return db.getAllAsync<CheckinEntry>(
    'SELECT date,done,note,streak,weight,timestamp,grace,updated_at,deleted FROM checkin_records WHERE deleted = 0 ORDER BY date DESC'
  );
}

// ── Row mappers ───────────────────────────────────────────────────
function rowToHabit(r: Record<string, unknown>): Habit {
  return {
    id: r.id as string, name: r.name as string,
    startDate: r.start_date as string,
    targetDays: r.target_days as number,
    goal: (r.goal as string) ?? '',
    insight: (r.insight as string) ?? '',
    createTag: (r.create_tag as number) === 1,
    doneDays: r.done_days as number,
    streak: r.streak as number,
    interrupted: r.interrupted as number,
    status: r.status as Habit['status'],
    checkedDates: JSON.parse((r.checked_dates as string) ?? '[]'),
    pauseReason: (r.pause_reason as string) ?? '',
    abandonReason: (r.abandon_reason as string) ?? '',
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  };
}

function rowToReflection(r: Record<string, unknown>): MindReflection {
  const defaultColors: readonly [string, string] = ['#6366f1', '#8b5cf6'];
  let colors = defaultColors;
  if (r.colors) {
    try {
      const parsed = JSON.parse(r.colors as string);
      if (Array.isArray(parsed) && parsed.length === 2) colors = parsed;
    } catch {}
  }
  return {
    id: r.id as string,
    timestamp: r.created_at as number,
    content: r.content as string,
    tags: JSON.parse((r.tags as string) ?? '[]'),
    mood: r.mood as MindReflection['mood'],
    cardTheme: r.card_theme as string | undefined,
    link: r.link as string | undefined,
    linkedPlanItemId: r.linked_plan_id as string | undefined,
    isPinned: (r.is_pinned as number) === 1,
    isPublished: (r.is_published as number) === 1,
    colors,
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  };
}

// ── Thought Trails ───────────────────────────────────────────────
export async function dbGetAllThoughtTrails(db: SQLiteDatabase): Promise<ThoughtTrail[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM thought_trails WHERE deleted = 0 ORDER BY created_at DESC'
  );
  return rows.map(rowToThoughtTrail);
}

function rowToThoughtTrail(r: Record<string, unknown>): ThoughtTrail {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    reflectionIds: JSON.parse((r.reflection_ids as string) ?? '[]'),
    source: (r.source as ThoughtTrail['source']) ?? 'manual',
    insightSummary: r.insight_summary as string | undefined,
    createdAt: (r.created_at as number) ?? 0,
    updatedAt: (r.updated_at as number) ?? 0,
    deleted: (r.deleted as number) === 1,
  };
}
