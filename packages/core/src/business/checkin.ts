// ─── Checkin business logic (pure functions) ───────────────────
import type { CheckinEntry } from '../types';
import { dateStr, calculateCheckinStreak } from '../utils';

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
    timestamp: Date.now(), updatedAt: Date.now(),
  };
  const newHistory = [tempRecord, ...history.filter(c => c.date !== today)];
  const newStreak = calculateCheckinStreak(newHistory);
  const record: CheckinEntry = { ...tempRecord, streak: newStreak };
  const finalHistory = [record, ...history.filter(c => c.date !== today)];
  return { record, history: finalHistory, streak: newStreak };
}

export function computeLongestStreak(history: CheckinEntry[]): number {
  const doneDates = history.filter(c => c.done).map(c => c.date).sort();
  if (doneDates.length === 0) return 0;
  let max = 1, current = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1]);
    const curr = new Date(doneDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; max = Math.max(max, current); }
    else if (diff > 1) current = 1;
  }
  return max;
}
