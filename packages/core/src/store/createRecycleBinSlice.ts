import type { RecycleBinItem, RecycleBinEntityType } from '../types';
import type { RecycleBinSlice } from './types';
import type { SliceCreator } from './sliceHelper';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createRecycleBinSlice(): SliceCreator<RecycleBinSlice> {
  return (set, get) => ({
    recycleBin: [],

    addToRecycleBin(item: Omit<RecycleBinItem, 'deletedAt'>) {
      const entry: RecycleBinItem = { ...item, deletedAt: Date.now() };
      set(s => ({ recycleBin: [entry, ...(s.recycleBin ?? [])] }));
    },

    restoreFromRecycleBin(id: string) {
      const state = get();
      const item = state.recycleBin.find(r => r.id === id);
      if (!item) return;

      // Remove from recycle bin
      set(s => ({ recycleBin: s.recycleBin.filter(r => r.id !== id) }));

      // Restore to the appropriate array based on entity type
      const restoreMap: Record<RecycleBinEntityType, keyof typeof state> = {
        habit: 'habits',
        reflection: 'reflections',
        food: 'foodLog',
        exercise: 'exerciseLog',
        plan: 'plans',
      };

      const targetKey = restoreMap[item.entityType as RecycleBinEntityType];
      if (targetKey) {
        set(s => ({ [targetKey]: [...((s[targetKey] as any[]) ?? []), item.data] }));
      }
    },

    removeFromRecycleBin(id: string) {
      set(s => ({ recycleBin: s.recycleBin.filter(r => r.id !== id) }));
    },

    emptyRecycleBin() {
      set({ recycleBin: [] });
    },

    cleanupRecycleBin() {
      const now = Date.now();
      set(s => ({
        recycleBin: (s.recycleBin ?? []).filter(r => now - r.deletedAt < EXPIRY_MS),
      }));
    },
  });
}
