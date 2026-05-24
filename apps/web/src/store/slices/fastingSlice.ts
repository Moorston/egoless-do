import type { StateCreator } from 'zustand';
import type { FastingSession, MedHistoryEntry } from '@egoless-do/core';
import { dateStr, estimateFastingKcal, createFastingSession } from '@egoless-do/core';
import { enqueueChange } from '../../db/syncQueue';
import type { SyncEntity } from '../../db/webDb';
import type { WebStore } from '../useWebStore';

function q(entity: SyncEntity, id: string, op: 'upsert' | 'delete', payload: unknown) {
  enqueueChange(entity, id, op, payload).catch((e) => console.error('[err]', e));
}

export interface FastingSlice {
  activeFasting: FastingSession | null;
  fastingHistory: FastingSession[];
  totalMedMinutes: number;
  medHistory: MedHistoryEntry[];
  startFasting: (hours: number) => void;
  stopFasting: (weight?: number, gender?: 'male' | 'female', age?: number) => void;
  addMedMinutes: (min: number) => void;
  calculateTotalMedMin: () => void;
}

export const createFastingSlice: StateCreator<WebStore, [], [], FastingSlice> = (set, get) => ({
  activeFasting: null,
  fastingHistory: [],
  totalMedMinutes: 0,
  medHistory: [],

  startFasting(hours) {
    if (get().activeFasting) return;
    const session = createFastingSession(hours) as FastingSession;
    set({ activeFasting: session });
    q('fasting', session.id, 'upsert', session);
  },

  stopFasting(weight, gender, age) {
    const { activeFasting, fastingHistory } = get();
    if (!activeFasting) return;
    const durSec = Math.floor((Date.now() - activeFasting.startedAt) / 1000);
    const durHours = durSec / 3600;
    const kcal = estimateFastingKcal(durHours, weight ?? 70, gender ?? 'male', age ?? 30);
    const ended: FastingSession = {
      ...activeFasting,
      endedAt: Date.now(),
      estimatedKcal: kcal,
      updatedAt: Date.now(),
    };
    set({ activeFasting: null, fastingHistory: [ended, ...fastingHistory] });
    q('fasting', ended.id, 'upsert', ended);
  },

  addMedMinutes(min) {
    const today = dateStr();
    const entry: MedHistoryEntry = { date: today, dur: `${min}min`, mood: '🌿 平静', updatedAt: Date.now() };
    set(s => ({
      totalMedMinutes: s.totalMedMinutes + min,
      medHistory: [entry, ...s.medHistory],
    }));
    q('meditation', today, 'upsert', entry);
  },

  calculateTotalMedMin() {
    const { medHistory } = get();
    const total = medHistory.reduce((sum, entry) => {
      const mins = parseInt(entry.dur) || 0;
      return sum + mins;
    }, 0);
    set({ totalMedMinutes: total });
  },
});
