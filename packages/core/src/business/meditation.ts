// ─── Meditation business logic (pure functions) ────────────────
import type { MedHistoryEntry } from '../types';
import { dateStr } from '../utils';

export function addMedMinutesToList(
  medHistory: MedHistoryEntry[],
  currentTotal: number,
  min: number,
): { total: number; history: MedHistoryEntry[] } {
  const today = dateStr();
  const existing = medHistory.find(m => m.date === today && !m.deleted);
  if (existing) {
    const prevMin = parseInt(existing.dur) || 0;
    const updated: MedHistoryEntry = { ...existing, dur: `${prevMin + min}min`, updatedAt: Date.now() };
    return {
      total: currentTotal + min,
      history: medHistory.map(m => m.date === today ? updated : m),
    };
  }
  const entry: MedHistoryEntry = { date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now(), deleted: false };
  return {
    total: currentTotal + min,
    history: [entry, ...medHistory],
  };
}
