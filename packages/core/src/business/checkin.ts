// ─── Checkin business logic (pure functions) ───────────────────
import type { CheckinEntry } from '../types';
import { dateStr, calculateCheckinStreak, computeLongestStreak as computeLongestStreakRaw } from '../utils';

// ─── Incomplete reason constants ───────────────────────────────
export const INCOMPLETE_REASONS = [
  { code: 'time',     icon: '⏰' },
  { code: 'health',   icon: '🏥' },
  { code: 'external', icon: '📋' },
  { code: 'mood',     icon: '😔' },
  { code: 'forgot',   icon: '💭' },
  { code: 'other',    icon: '💬' },
] as const;

export type IncompleteReasonCode = typeof INCOMPLETE_REASONS[number]['code'];

export interface IncompleteItem {
  type: 'practice' | 'habit' | 'planItem';
  name: string;
}

/** Detect incomplete checkin items for today */
export function getIncompleteItems(params: {
  habits: Array<{ name: string; status: string; checkedDates?: string[] }>;
  planItems: Array<{ id: string; name: string }>;
  planItemCheckins: Array<{ planItemId: string; date: string; done: boolean; linkedModule?: string; deleted?: boolean }>;
  today: string;
}): IncompleteItem[] {
  const { habits, planItems, planItemCheckins, today } = params;
  const result: IncompleteItem[] = [];

  // Habits (inProgress only)
  for (const h of habits) {
    if (h.status === 'inProgress' && !h.checkedDates?.includes(today)) {
      result.push({ type: 'habit', name: h.name });
    }
  }

  // Plan items (exclude auto-checked via linkedModule)
  for (const item of planItems) {
    const checkin = planItemCheckins.find(c => !c.deleted && c.planItemId === item.id && c.date === today);
    if (!checkin?.done && !checkin?.linkedModule) {
      result.push({ type: 'planItem', name: item.name });
    }
  }

  return result;
}

/** Get food log entries for a specific date (derived from timestamp) */
export function getFoodLogByDate<T extends { timestamp: number; deleted?: boolean }>(foodLog: T[], date: string): T[] {
  return (foodLog ?? []).filter(f => dateStr(new Date(f.timestamp)) === date && !f.deleted);
}

export function computeLongestStreakFromHistory(history: CheckinEntry[]): number {
  return computeLongestStreakRaw(history.filter(c => c.done && !c.deleted).map(c => c.date));
}

/** Get streak and totalDays for a specific date from history (handles legacy records without totalDays) */
export function getStatsForDate(history: CheckinEntry[], date: string): { streak: number; totalDays: number } {
  const record = history.find(c => c.date === date && !c.deleted);
  const doneRecords = history.filter(c => c.done && !c.deleted);
  const totalDays = record?.totalDays ?? doneRecords.filter(c => c.date <= date).length;
  const streak = record?.streak ?? calculateCheckinStreak(doneRecords.filter(c => c.date <= date).map(c => ({ date: c.date, done: true })), date);
  return { streak, totalDays };
}

export function submitCheckinEntry(
  history: CheckinEntry[],
  done: boolean,
  note: string,
  dateOverride?: string,
  weight?: number,
  grace?: boolean,
): { record: CheckinEntry; history: CheckinEntry[]; streak: number } {
  const today = dateOverride ?? dateStr();
  const tempRecord: CheckinEntry = {
    date: today, done, note, streak: 0, weight,
    grace: grace ?? false,
    timestamp: Date.now(), updatedAt: Date.now(), deleted: false,
  };
  const newHistory = [tempRecord, ...history.filter(c => c.date !== today)];
  const newStreak = calculateCheckinStreak(newHistory);
  const totalDays = newHistory.filter(c => c.done && !c.deleted).length;
  const record: CheckinEntry = { ...tempRecord, streak: newStreak, totalDays };
  const finalHistory = [record, ...history.filter(c => c.date !== today)];
  return { record, history: finalHistory, streak: newStreak };
}

/** Parsed checkin note structure */
export interface ParsedCheckinNote {
  userNote: string;
  practices: string[];
  customs: string[];
  planItems: Array<string | { id: string; [key: string]: unknown }>;
  fasted: boolean;
  waterMl: number;
  habits: string[];
  food: number;
  incompleteReason: string;
  incompleteNote: string;
}

/** Parse checkin note from JSON or legacy format */
export function parseCheckinNote(raw: string): ParsedCheckinNote {
  if (!raw) return { userNote: '', practices: [], customs: [], planItems: [], fasted: false, waterMl: 0, habits: [], food: 0, incompleteReason: '', incompleteNote: '' };
  
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      return {
        userNote: data.note ?? '',
        practices: data.practices ?? [],
        customs: data.customs ?? [],
        planItems: data.planItems ?? [],
        fasted: !!data.fasted,
        waterMl: typeof data.water === 'number' ? data.water : 0,
        habits: data.habits ?? [],
        food: typeof data.food === 'number' ? data.food : 0,
        incompleteReason: data.incompleteReason ?? '',
        incompleteNote: data.incompleteNote ?? '',
      };
    }
  } catch {
    // Not JSON — fall back to legacy emoji+delimiter format
  }
  
  // Legacy format: emoji prefixes + ' · ' delimiter
  const parts = raw.split(' · ');
  const practices: string[] = [];
  const customs: string[] = [];
  const noteParts: string[] = [];
  const EMOJI_TO_KEY: Record<string, string> = { '🧘': 'sit', '🧍': 'stand', '📿': 'chant' };
  
  for (const p of parts) {
    const matchedEmoji = Object.keys(EMOJI_TO_KEY).find(e => p.startsWith(e));
    if (matchedEmoji) {
      practices.push(EMOJI_TO_KEY[matchedEmoji]);
    } else if (p.startsWith('✓')) {
      customs.push(p.slice(1));
    } else if (p) {
      noteParts.push(p);
    }
  }
  
  return { userNote: noteParts.join(' · '), practices, customs, planItems: [], fasted: false, waterMl: 0, habits: [], food: 0, incompleteReason: '', incompleteNote: '' };
}
