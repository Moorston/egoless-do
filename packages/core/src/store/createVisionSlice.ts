import type { Vision, VisionType, VisionPractice, RefType, VisionTimeFrame } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

function genId() {
  return 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface VisionSlice {
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
}

export function createVisionSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<VisionSlice> {
  return (set, get) => ({
    visions: [],
    visionPractices: [],

    addVision(data) {
      const existing = get().visions.filter((v: Vision) => !v.deleted);
      // Constraint checks
      if (data.type === 'lifetime' && existing.some((v: Vision) => v.type === 'lifetime' && v.status === 'active')) {
        log.error('Lifetime vision already exists');
        return null;
      }
      if (data.type === 'long' && existing.some((v: Vision) => v.type === 'long' && v.status === 'active')) {
        log.error('Active long-term vision already exists');
        return null;
      }
      if (data.type === 'short' && existing.some((v: Vision) => v.type === 'short' && v.status === 'active')) {
        log.error('Active short-term vision already exists');
        return null;
      }
      const entry: Vision = {
        id: genId(),
        type: data.type,
        text: data.text,
        timeFrame: data.timeFrame as VisionTimeFrame | undefined,
        startDate: data.startDate,
        deadline: data.deadline,
        status: 'active',
        sortOrder: existing.length,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: VisionSlice) => ({ visions: [...(s.visions ?? []), entry] }));
      adapter.persistChange('vision', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    updateVision(id, updates) {
      set((s: VisionSlice) => ({
        visions: (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v),
      }));
      const entry = get().visions.find((v: Vision) => v.id === id);
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeVision(id) {
      set((s: VisionSlice) => ({
        visions: (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, deleted: true, updatedAt: Date.now() } : v),
      }));
      const entry = get().visions.find((v: Vision) => v.id === id);
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    achieveVision(id) {
      set((s: VisionSlice) => ({
        visions: (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, status: 'achieved' as const, achievedAt: Date.now(), updatedAt: Date.now() } : v),
      }));
      const entry = get().visions.find((v: Vision) => v.id === id);
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    archiveVision(id) {
      set((s: VisionSlice) => ({
        visions: (s.visions ?? []).map((v: Vision) => v.id === id ? { ...v, status: 'archived' as const, updatedAt: Date.now() } : v),
      }));
      const entry = get().visions.find((v: Vision) => v.id === id);
      if (entry) adapter.persistChange('vision', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    addVisionPractice(data) {
      const entry: VisionPractice = {
        id: genId(),
        visionId: data.visionId,
        refType: data.refType,
        refId: data.refId,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: VisionSlice) => ({ visionPractices: [...(s.visionPractices ?? []), entry] }));
      adapter.persistChange('visionPractice', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeVisionPractice(id) {
      set((s: VisionSlice) => ({
        visionPractices: (s.visionPractices ?? []).map((vp: VisionPractice) => vp.id === id ? { ...vp, deleted: true, updatedAt: Date.now() } : vp),
      }));
      const entry = get().visionPractices.find((vp: VisionPractice) => vp.id === id);
      if (entry) adapter.persistChange('visionPractice', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeVisionPracticesByVision(visionId) {
      const toRemove = get().visionPractices.filter((vp: VisionPractice) => vp.visionId === visionId && !vp.deleted);
      set((s: VisionSlice) => ({
        visionPractices: (s.visionPractices ?? []).map((vp: VisionPractice) =>
          vp.visionId === visionId ? { ...vp, deleted: true, updatedAt: Date.now() } : vp,
        ),
      }));
      for (const vp of toRemove) {
        adapter.persistChange('visionPractice', vp.id, { ...vp, deleted: true, updatedAt: Date.now() }).catch(e => log.error(e));
      }
      onSync?.();
    },
  });
}
