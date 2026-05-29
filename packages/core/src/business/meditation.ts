// ─── Meditation business logic (pure functions) ────────────────
import type { MedHistoryEntry } from '../types';
import { dateStr } from '../utils';

export function addMedMinutesToList(
  medHistory: MedHistoryEntry[],
  currentTotal: number,
  min: number,
): { total: number; history: MedHistoryEntry[] } {
  const today = dateStr();
  const entry: MedHistoryEntry = { date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now() };
  return {
    total: currentTotal + min,
    history: [entry, ...medHistory],
  };
}
