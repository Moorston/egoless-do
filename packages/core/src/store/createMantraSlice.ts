import type { MantraDef, MantraSession, SutraReadingSession } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

function genId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface MantraSlice {
  mantraDefs: MantraDef[];
  mantraSessions: MantraSession[];
  readingSessions: SutraReadingSession[];
  addMantraDef: (data: { name: string; subtitle?: string; category?: 'dharani' | 'sutra' | 'custom'; targetCount?: number; fullText?: string; pageCount?: number }) => MantraDef;
  updateMantraDef: (id: string, updates: Partial<MantraDef>) => void;
  removeMantraDef: (id: string) => void;
  addMantraSession: (data: Omit<MantraSession, 'id' | 'updatedAt' | 'deleted'>) => MantraSession;
  removeMantraSession: (id: string) => void;
  addReadingSession: (data: Omit<SutraReadingSession, 'id' | 'updatedAt' | 'deleted'>) => SutraReadingSession;
  removeReadingSession: (id: string) => void;
  getMantraTotalCount: (mantraId: string) => number;
  getMantraStreak: (mantraId: string) => number;
  getReadingStats: (mantraId: string) => { totalPages: number; totalDuration: number; sessions: number };
}

export function createMantraSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<MantraSlice> {
  return (set, get) => ({
    mantraDefs: [],
    mantraSessions: [],
    readingSessions: [],

    addMantraDef(data) {
      const existing = get().mantraDefs.filter(d => !d.deleted);
      const entry: MantraDef = {
        id: genId(),
        name: data.name,
        subtitle: data.subtitle,
        category: data.category ?? 'custom',
        sortOrder: existing.length,
        targetCount: data.targetCount,
        fullText: data.fullText,
        pageCount: data.pageCount,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ mantraDefs: [...(s.mantraDefs ?? []), entry] }));
      adapter.persistChange('mantraDef', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    updateMantraDef(id, updates) {
      set((s: MantraSlice) => ({
        mantraDefs: (s.mantraDefs ?? []).map((d: MantraDef) => d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d),
      }));
      const entry = get().mantraDefs.find((d: MantraDef) => d.id === id);
      if (entry) adapter.persistChange('mantraDef', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeMantraDef(id) {
      set((s: MantraSlice) => ({
        mantraDefs: (s.mantraDefs ?? []).map((d: MantraDef) => d.id === id ? { ...d, deleted: true, updatedAt: Date.now() } : d),
      }));
      const entry = get().mantraDefs.find((d: MantraDef) => d.id === id);
      if (entry) adapter.persistChange('mantraDef', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    addMantraSession(data) {
      const entry: MantraSession = {
        ...data,
        id: genId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ mantraSessions: [...(s.mantraSessions ?? []), entry] }));
      adapter.persistChange('mantraSession', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    removeMantraSession(id) {
      set((s: MantraSlice) => ({
        mantraSessions: (s.mantraSessions ?? []).map((s2: MantraSession) => s2.id === id ? { ...s2, deleted: true, updatedAt: Date.now() } : s2),
      }));
      const entry = get().mantraSessions.find((s2: MantraSession) => s2.id === id);
      if (entry) adapter.persistChange('mantraSession', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    getMantraTotalCount(mantraId) {
      return (get().mantraSessions ?? [])
        .filter((s: MantraSession) => s.mantraId === mantraId && !s.deleted)
        .reduce((sum: number, s: MantraSession) => sum + s.count, 0);
    },

    getMantraStreak(mantraId) {
      const sessions = (get().mantraSessions ?? [])
        .filter((s: MantraSession) => s.mantraId === mantraId && !s.deleted)
        .map((s: MantraSession) => s.date)
        .filter(Boolean);
      if (sessions.length === 0) return 0;
      const uniqueDates = [...new Set(sessions)].sort().reverse();
      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) streak++;
        else break;
      }
      return streak;
    },

    addReadingSession(data) {
      const entry: SutraReadingSession = {
        ...data,
        id: genId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ readingSessions: [...(s.readingSessions ?? []), entry] }));
      adapter.persistChange('sutraReading', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    removeReadingSession(id) {
      set((s: MantraSlice) => ({
        readingSessions: (s.readingSessions ?? []).map((r: SutraReadingSession) => r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r),
      }));
      const entry = get().readingSessions.find((r: SutraReadingSession) => r.id === id);
      if (entry) adapter.persistChange('sutraReading', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    getReadingStats(mantraId) {
      const sessions = (get().readingSessions ?? [])
        .filter((r: SutraReadingSession) => r.mantraId === mantraId && !r.deleted);
      return {
        totalPages: sessions.reduce((sum: number, r: SutraReadingSession) => sum + r.pagesRead, 0),
        totalDuration: sessions.reduce((sum: number, r: SutraReadingSession) => sum + r.durationSec, 0),
        sessions: sessions.length,
      };
    },
  });
}
