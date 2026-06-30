// ─── Meditation business logic (pure functions) ────────────────
import type { MedHistoryEntry } from '../types';
import { dateStr } from '../utils';

export function addMedMinutesToList(
  medHistory: MedHistoryEntry[],
  currentTotal: number,
  min: number,
  trackId?: string,
  note?: string,
): { total: number; history: MedHistoryEntry[] } {
  if (min <= 0) return { total: currentTotal, history: medHistory };
  const today = dateStr();
  const existing = medHistory.find(m => m.date === today && !m.deleted);
  if (existing) {
    const updated: MedHistoryEntry = {
      ...existing,
      durMin: (existing.durMin || 0) + min,
      trackId: trackId ?? existing.trackId,
      note: note ?? existing.note,
      updatedAt: Date.now(),
    };
    return {
      total: currentTotal + min,
      history: medHistory.map(m => m.date === today && !m.deleted ? updated : m),
    };
  }
  const entry: MedHistoryEntry = { date: today, durMin: min, trackId, note, updatedAt: Date.now(), deleted: false };
  return {
    total: currentTotal + min,
    history: [entry, ...medHistory],
  };
}
