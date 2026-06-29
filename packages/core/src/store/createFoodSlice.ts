import type { FoodEntry, CustomFoodPreset } from '../types';
import { uid } from '../utils';
import { deleteFoodFromList } from '../business';
import type { StorageAdapter, FoodSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createFoodSlice(adapter: StorageAdapter, onSettingsPersist?: () => void, onSync?: () => void): SliceCreator<FoodSlice> {
  return (set, get) => ({
    foodLog: [],
    calGoal: 2000,
    customFoodPresets: [],

    addFood(entry: Omit<FoodEntry, 'id' | 'updatedAt' | 'deleted'>) {
      const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ foodLog: [e, ...(s.foodLog ?? [])] }));
      adapter.persistChange('food', e.id, e).catch(e => log.error(e));
      onSync?.();
    },

    deleteFood(id: string) {
      const state = get();
      const food = (state.foodLog ?? []).find(f => f.id === id && !f.deleted);
      // Atomic: recycle bin + soft-delete in one set()
      set(s => ({
        foodLog: deleteFoodFromList(s.foodLog ?? [], id),
        ...(food ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'food' as const, data: food, deletedAt: Date.now() }] } : {}),
      }));
      adapter.markDeleted('food', id).catch(e => log.error(e));
      onSync?.();
    },

    setCalGoal(n: number) { set({ calGoal: Math.max(100, n) }); onSettingsPersist?.(); },

    addCustomFoodPreset(name: string, calories: number, note?: string) {
      set(s => ({
        customFoodPresets: [
          { id: uid(), name, calories, note },
          ...(s.customFoodPresets ?? []),
        ],
      }));
      onSettingsPersist?.();
    },

    removeCustomFoodPreset(id: string) {
      set(s => ({
        customFoodPresets: (s.customFoodPresets ?? []).filter(p => p.id !== id),
      }));
      onSettingsPersist?.();
    },
  });
}
