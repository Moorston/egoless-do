import { createLogger } from '../logger';
import type { Vision, VisionType, VisionPractice, RefType, VisionTimeFrame, Dedication, DedicationSettings, GiveEntry } from '../types';
import { DEFAULT_DEDICATION_SETTINGS } from '../types';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter } from './types';

const log = createLogger('Store');

function genDedId() {
  return 'd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function genVisionId() {
  return 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function genGiveId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface PracticeSlice {
  // Vision
  visions: Vision[];
  visionPractices: VisionPractice[];
  addVision: (data: { type: VisionType; text: string; timeFrame?: string; startDate?: string; deadline?: string }) => Vision | null;
  updateVision: (id: string, updates: Partial<Vision>) => void;
  removeVision: (id: string) => void;
  achieveVision: (id: string) => void;
  archiveVision: (id: string) => void;
  addVisionPractice: (data: { visionId: string; refType: RefType; refId: string }) => void;
  removeVisionPractice: (id: string) => void;
  removeVisionPracticesByVision: (visionId: string) => void;

  // Dedication
  dedications: Dedication[];
  dedicationSettings: DedicationSettings;
  addDedication: (data: Omit<Dedication, 'id' | 'updatedAt' | 'deleted'>) => void;
  removeDedication: (id: string) => void;
  updateDedicationSettings: (settings: Partial<DedicationSettings>) => void;

  // Give
  giveHistory: GiveEntry[];
  addGive: (entry: Omit<GiveEntry, 'id' | 'updatedAt' | 'deleted'>) => void;
  deleteGive: (id: string) => void;
}

export function createPracticeSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<PracticeSlice> {
  return (set, get) => ({
    // ── Vision ─────────────────────────────────────────────────────────
    visions: [],
    visionPractices: [],

    addVision(data) {
      let entry: Vision | undefined;
      set((s: PracticeSlice) => {
        const existing = (s.visions ?? []).filter((v: Vision) => !v.deleted);
        if (data.type === 'lifetime' && existing.some((v: Vision) => v.type === 'lifetime' && v.status === 'active')) return s;
        if (data.type === 'long' && existing.some((v: Vision) => v.type === 'long' && v.status === 'active')) return s;
        if (data.type === 'short' && existing.some((v: Vision) => v.type === 'short' && v.status === 'active')) return s;
        const newEntry: Vision = {
          id: genVisionId(), type: data.type, text: data.text,
          timeFrame: data.timeFrame as VisionTimeFrame | undefined,
          startDate: data.startDate, deadline: data.deadline,
          status: 'active', sortOrder: existing.length, updatedAt: Date.now(), deleted: false,
        };
        entry = newEntry;
        return { visions: [...(s.visions ?? []), newEntry] };
      });
      if (entry) {
        adapter.persistChange('vision', entry.id, entry).catch(e => log.error(e));
        onSync?.();
      }
      return entry ?? null;
    },

    updateVision(id, updates) {
      let entry: Vision | undefined;
      set((s: PracticeSlice) => {
        const newList = (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v);
        entry = newList.find((v: Vision) => v.id === id);
        return { visions: newList };
      });
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeVision(id) {
      set((s: PracticeSlice) => ({
        visions: (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, deleted: true, updatedAt: Date.now() } : v),
      }));
      adapter.markDeleted('vision', id).catch(e => log.error(e));
      onSync?.();
    },

    achieveVision(id) {
      let entry: Vision | undefined;
      set((s: PracticeSlice) => {
        const newList = (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, status: 'achieved' as const, achievedAt: Date.now(), updatedAt: Date.now() } : v);
        entry = newList.find((v: Vision) => v.id === id);
        return { visions: newList };
      });
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    archiveVision(id) {
      let entry: Vision | undefined;
      set((s: PracticeSlice) => {
        const newList = (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, status: 'archived' as const, updatedAt: Date.now() } : v);
        entry = newList.find((v: Vision) => v.id === id);
        return { visions: newList };
      });
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    addVisionPractice(data) {
      const entry: VisionPractice = {
        id: genVisionId(),
        visionId: data.visionId,
        refType: data.refType,
        refId: data.refId,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: PracticeSlice) => ({ visionPractices: [...(s.visionPractices ?? []), entry] }));
      adapter.persistChange('visionPractice', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeVisionPractice(id) {
      set((s: PracticeSlice) => ({
        visionPractices: (s.visionPractices ?? []).map((vp: VisionPractice) => vp.id === id ? { ...vp, deleted: true, updatedAt: Date.now() } : vp),
      }));
      adapter.markDeleted('visionPractice', id).catch(e => log.error(e));
      onSync?.();
    },

    removeVisionPracticesByVision(visionId) {
      const toRemove = get().visionPractices.filter((vp: VisionPractice) => vp.visionId === visionId && !vp.deleted);
      set((s: PracticeSlice) => ({
        visionPractices: (s.visionPractices ?? []).map((vp: VisionPractice) =>
          vp.visionId === visionId ? { ...vp, deleted: true, updatedAt: Date.now() } : vp,
        ),
      }));
      for (const vp of toRemove) {
        adapter.persistChange('visionPractice', vp.id, { ...vp, deleted: true, updatedAt: Date.now() }).catch(e => log.error(e));
      }
      onSync?.();
    },

    // ── Dedication ─────────────────────────────────────────────────────
    dedications: [],
    dedicationSettings: { ...DEFAULT_DEDICATION_SETTINGS },

    addDedication(data) {
      const entry: Dedication = {
        ...data,
        id: genDedId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: PracticeSlice) => ({ dedications: [...(s.dedications ?? []), entry] }));
      adapter.persistChange('dedication', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeDedication(id) {
      set((s: PracticeSlice) => ({
        dedications: (s.dedications ?? []).map((d: Dedication) => d.id === id ? { ...d, deleted: true, updatedAt: Date.now() } : d),
      }));
      adapter.markDeleted('dedication', id).catch(e => log.error(e));
      onSync?.();
    },

    updateDedicationSettings(settings) {
      let updated: DedicationSettings | undefined;
      set((s: PracticeSlice) => {
        updated = { ...s.dedicationSettings, ...settings };
        return { dedicationSettings: updated };
      });
      if (updated) adapter.persistSettings('dedicationSettings', updated).catch(e => log.error(e));
    },

    // ── Give ───────────────────────────────────────────────────────────
    giveHistory: [],

    addGive(entry) {
      const giveEntry: GiveEntry = {
        ...entry,
        id: genGiveId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set(s => ({ giveHistory: [giveEntry, ...s.giveHistory] }));
      adapter.persistChange('give', giveEntry.id, giveEntry).catch(e => log.error(e));
      onSync?.();
    },

    deleteGive(id) {
      const now = Date.now();
      set(s => ({
        giveHistory: s.giveHistory.map(g => g.id === id ? { ...g, deleted: true, updatedAt: now } : g),
      }));
      adapter.markDeleted('give', id).catch(e => log.error(e));
      onSync?.();
    },
  });
}
