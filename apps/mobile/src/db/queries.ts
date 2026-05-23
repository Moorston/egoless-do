// ─── All SQL query helpers ────────────────────────────────────────
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Habit, MindReflection, FoodEntry, CheckinRecord, FastingSession } from '@egoless-do/core';

// ── Habits ────────────────────────────────────────────────────────
export async function dbGetAllHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM habits ORDER BY rowid');
  return rows.map(rowToHabit);
}

export async function dbUpsertHabit(db: SQLiteDatabase, h: Habit): Promise<void> {
  await db.runAsync(`
    INSERT OR REPLACE INTO habits
    (id,name,start_date,target_days,goal,insight,create_tag,done_days,streak,interrupted,
     status,checked_dates,pause_reason,abandon_reason)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [h.id, h.name, h.startDate, h.targetDays, h.goal, h.insight,
     h.createTag ? 1 : 0, h.doneDays, h.streak, h.interrupted,
     h.status, JSON.stringify(h.checkedDates), h.pauseReason, h.abandonReason]
  );
}

export async function dbDeleteHabit(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

// ── Reflections ───────────────────────────────────────────────────
export async function dbGetAllReflections(db: SQLiteDatabase): Promise<MindReflection[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM mind_reflections ORDER BY created_at DESC'
  );
  return rows.map(rowToReflection);
}

export async function dbInsertReflection(db: SQLiteDatabase, r: MindReflection): Promise<void> {
  await db.runAsync(`
    INSERT OR IGNORE INTO mind_reflections
    (id,created_at,content,tags,mood,card_theme,linked_habit_id,is_pinned,is_published,synced)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [r.id, r.created_at, r.content, JSON.stringify(r.tags), r.mood ?? null,
     r.card_theme ?? null, r.linked_habit_id ?? null,
     r.is_pinned ? 1 : 0, r.is_published ? 1 : 0, r.synced]
  );
}

// ── Fasting ───────────────────────────────────────────────────────
export async function dbGetFastingSessions(db: SQLiteDatabase): Promise<FastingSession[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM fasting_sessions ORDER BY started_at DESC LIMIT 50'
  );
  return rows.map(r => ({
    id: r.id as string,
    target_hours: r.target_hours as number,
    started_at: r.started_at as number,
    ended_at: r.ended_at as number | undefined,
    estimated_kcal: r.estimated_kcal as number | undefined,
    insight: r.insight as string | undefined,
  }));
}

export async function dbUpsertFastingSession(db: SQLiteDatabase, s: FastingSession): Promise<void> {
  await db.runAsync(`
    INSERT OR REPLACE INTO fasting_sessions
    (id,target_hours,started_at,ended_at,estimated_kcal,insight)
    VALUES (?,?,?,?,?,?)`,
    [s.id, s.target_hours, s.started_at, s.ended_at ?? null,
     s.estimated_kcal ?? null, s.insight ?? null]
  );
}

// ── Food entries ──────────────────────────────────────────────────
export async function dbGetFoodEntries(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM food_entries WHERE entry_date = ? ORDER BY ts', [date]
  );
  return rows.map(r => ({
    id: r.id as string, name: r.name as string,
    cal: r.cal as number, note: r.note as string, ts: r.ts as number,
  }));
}

export async function dbInsertFoodEntry(db: SQLiteDatabase, f: FoodEntry, date: string): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO food_entries(id,name,cal,note,entry_date,ts) VALUES(?,?,?,?,?,?)',
    [f.id, f.name, f.cal, f.note, date, f.ts]
  );
}

// ── Checkins ──────────────────────────────────────────────────────
export async function dbGetCheckins(db: SQLiteDatabase): Promise<CheckinRecord[]> {
  return db.getAllAsync<CheckinRecord>(
    'SELECT date,done,note,streak FROM checkin_records ORDER BY date DESC'
  );
}

export async function dbUpsertCheckin(db: SQLiteDatabase, c: CheckinRecord): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO checkin_records(date,done,note,streak) VALUES(?,?,?,?)',
    [c.date, c.done ? 1 : 0, c.note, c.streak]
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
  };
}

function rowToReflection(r: Record<string, unknown>): MindReflection {
  return {
    id: r.id as string,
    created_at: r.created_at as number,
    content: r.content as string,
    tags: JSON.parse((r.tags as string) ?? '[]'),
    mood: r.mood as MindReflection['mood'],
    card_theme: r.card_theme as string | undefined,
    linked_habit_id: r.linked_habit_id as string | undefined,
    is_pinned: (r.is_pinned as number) === 1,
    is_published: (r.is_published as number) === 1,
    synced: (r.synced as number) as 0 | 1,
  };
}
