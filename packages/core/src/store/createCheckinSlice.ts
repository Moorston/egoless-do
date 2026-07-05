import type { CheckinEntry, GraceHistoryEntry, ExerciseEntry, MedHistoryEntry, FastingSession } from '../types';
import { calculateCheckinStreak, activeOnly, uid } from '../utils';
import { submitCheckinEntry } from '../business';
import { deleteExerciseFromList } from '../business';
import { addMedMinutesToList } from '../business/meditation';
import { startFastingSession, stopFastingSession, type StopFastingOpts } from '../business/fasting';
import type { StorageAdapter, CheckinSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export type { CheckinSlice } from './types';

export function createCheckinSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<CheckinSlice> {
  return (set, get) => ({
    // ── Checkin ────────────────────────────────────────────────────────
    checkinHistory: [],
    streak: 0,
    graceHistory: [],

    submitCheckin(done: boolean, note: string, dateOverride?: string, weight?: number, grace?: boolean) {
      let record: CheckinEntry | undefined;
      set(s => {
        const result = submitCheckinEntry(s.checkinHistory ?? [], done, note, dateOverride, weight, grace);
        record = result.record;
        return { checkinHistory: result.history, streak: result.streak };
      });
      if (record) adapter.persistChange('checkin', record.date, record).catch(e => log.error(e));
      onSync?.();
    },

    calculateStreak() {
      const { checkinHistory } = get();
      set({ streak: calculateCheckinStreak((checkinHistory ?? []).filter(c => !c.deleted)) });
    },

    addGraceRecord(date: string) {
      if ((get().graceHistory ?? []).some(g => g.date === date && !g.deleted)) return;
      const entry: GraceHistoryEntry = { date, restoredAt: Date.now(), updatedAt: Date.now(), deleted: false };
      set(s => ({
        graceHistory: [...(s.graceHistory ?? []), entry],
      }));
      adapter.persistChange('grace', date, entry).catch(e => log.error(e));
      onSync?.();
    },

    // ── Exercise ───────────────────────────────────────────────────────
    exerciseLog: [],

    addExercise(entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) {
      const sportKey = entry.sportKey?.trim();
      if (!sportKey) return;
      const e: ExerciseEntry = { ...entry, sportKey, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] }));
      adapter.persistChange('exercise', e.id, e).catch(e => log.error(e));
      onSync?.();
    },

    deleteExercise(id: string) {
      const state = get();
      const exercise = (state.exerciseLog ?? []).find(e => e.id === id && !e.deleted);
      set(s => ({
        exerciseLog: deleteExerciseFromList(s.exerciseLog ?? [], id),
        ...(exercise ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'exercise' as const, data: exercise, deletedAt: Date.now() }] } : {}),
      }));
      adapter.markDeleted('exercise', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── Meditation ─────────────────────────────────────────────────────
    totalMedMinutes: 0,
    medHistory: [],

    addMedMinutes(min: number, trackId?: string, note?: string) {
      let entry: ReturnType<typeof addMedMinutesToList>['history'][number] | undefined;
      set(s => {
        const result = addMedMinutesToList(s.medHistory ?? [], s.totalMedMinutes, min, trackId, note);
        const reconciledTotal = activeOnly(result.history).reduce((sum, m) => sum + (m.durMin || 0), 0);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        entry = result.history.find(m => m.date === todayStr && !m.deleted);
        return { totalMedMinutes: reconciledTotal, medHistory: result.history };
      });
      if (entry) adapter.persistChange('meditation', entry.date, entry).catch(e => log.error(e));
      onSync?.();
    },

    calculateTotalMedMin() {
      const medHistory = get().medHistory;
      const total = (medHistory ?? []).filter(m => !m.deleted).reduce((s, m) => s + (m.durMin || 0), 0);
      set({ totalMedMinutes: total });
    },

    // ── Fasting ────────────────────────────────────────────────────────
    activeFasting: null,
    fastingHistory: [],

    startFasting(hours: number) {
      const current = get().activeFasting;
      const session = startFastingSession(current, hours);
      if (session) {
        set({ activeFasting: session });
        adapter.persistChange('fasting', session.id, session).catch(e => log.error(e));
      }
    },

    stopFasting(opts?: StopFastingOpts & { note?: string }) {
      const current = get().activeFasting;
      if (!current) return;
      const result = stopFastingSession(current, opts);
      set(s => ({
        activeFasting: null,
        fastingHistory: [result, ...(s.fastingHistory ?? [])],
      }));
      adapter.persistChange('fasting', result.id, result).catch(e => log.error(e));
      onSync?.();
    },
  });
}
