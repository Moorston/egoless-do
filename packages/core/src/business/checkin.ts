// ─── Checkin business logic (pure functions) ───────────────────
import type { CheckinEntry } from '../types';
import { dateStr, calculateCheckinStreak, computeLongestStreak as computeLongestStreakRaw } from '../utils';

export function computeLongestStreakFromHistory(history: CheckinEntry[]): number {
  return computeLongestStreakRaw(history.filter(c => c.done).map(c => c.date));
}

export function submitCheckinEntry(
  history: CheckinEntry[],
  done: boolean,
  note: string,
  dateOverride?: string,
  weight?: number,
): { record: CheckinEntry; history: CheckinEntry[]; streak: number } {
  const today = dateOverride ?? dateStr();
  const tempRecord: CheckinEntry = {
    date: today, done, note, streak: 0, weight,
    timestamp: Date.now(), updatedAt: Date.now(), deleted: false,
  };
  const newHistory = [tempRecord, ...history.filter(c => c.date !== today)];
  const newStreak = calculateCheckinStreak(newHistory);
  const record: CheckinEntry = { ...tempRecord, streak: newStreak };
  const finalHistory = [record, ...history.filter(c => c.date !== today)];
  return { record, history: finalHistory, streak: newStreak };
}

/** Parsed checkin note structure */
export interface ParsedCheckinNote {
  userNote: string;
  practices: string[];
  customs: string[];
  fasted: boolean;
  waterMl: number;
  habits: string[];
  food: number;
}

/** Parse checkin note from JSON or legacy format */
export function parseCheckinNote(raw: string): ParsedCheckinNote {
  if (!raw) return { userNote: '', practices: [], customs: [], fasted: false, waterMl: 0, habits: [], food: 0 };
  
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null) {
      return {
        userNote: data.note ?? '',
        practices: data.practices ?? [],
        customs: data.customs ?? [],
        fasted: !!data.fasted,
        waterMl: typeof data.water === 'number' ? data.water : 0,
        habits: data.habits ?? [],
        food: typeof data.food === 'number' ? data.food : 0,
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
  
  return { userNote: noteParts.join(' · '), practices, customs, fasted: false, waterMl: 0, habits: [], food: 0 };
}
