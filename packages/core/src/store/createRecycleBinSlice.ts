import type { StateCreator } from 'zustand';
import type { RecycleBinItem, RecycleBinEntityType } from '../types';
import type { RecycleBinSlice } from './types';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createRecycleBinSlice<S extends RecycleBinSlice>(): StateCreator<S, [], [], RecycleBinSlice> {
  return (set, get) => ({
    recycleBin: [],

    addToRecycleBin(item: Omit<RecycleBinItem, 'deletedAt'>) {
      const entry: RecycleBinItem = { ...item, deletedAt: Date.now() };
      set(((s: any) => ({ recycleBin: [entry, ...(s.recycleBin ?? [])] })) as any);
    },

    restoreFromRecycleBin(id: string) {
      const state = get() as any;
      const item = state.recycleBin.find((r: RecycleBinItem) => r.id === id);
      if (!item) return;

      // Remove from recycle bin
      set(((s: any) => ({ recycleBin: s.recycleBin.filter((r: RecycleBinItem) => r.id !== id) })) as any);

      // Restore to the appropriate array based on entity type
      const restoreMap: Record<RecycleBinEntityType, string> = {
        habit: 'habits',
        reflection: 'reflections',
        food: 'foodLog',
        exercise: 'exerciseLog',
        plan: 'plans',
      };

      const targetKey = restoreMap[item.entityType];
      if (targetKey) {
        set(((s: any) => ({ [targetKey]: [...(s[targetKey] ?? []), item.data] })) as any);
      }
    },

    removeFromRecycleBin(id: string) {
      set(((s: any) => ({ recycleBin: s.recycleBin.filter((r: RecycleBinItem) => r.id !== id) })) as any);
    },

    emptyRecycleBin() {
      set({ recycleBin: [] } as any);
    },

    cleanupRecycleBin() {
      const now = Date.now();
      set(((s: any) => ({
        recycleBin: (s.recycleBin ?? []).filter((r: RecycleBinItem) => now - r.deletedAt < EXPIRY_MS),
      })) as any);
    },
  });
}
