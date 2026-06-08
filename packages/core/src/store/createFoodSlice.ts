import type { FoodEntry, CustomFoodPreset } from '../types';
import { uid } from '../utils';
import { deleteFoodFromList } from '../business';
import type { StorageAdapter, FoodSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createFoodSlice(adapter: StorageAdapter, onSettingsPersist?: () => void): SliceCreator<FoodSlice> {
  return (set, get) => ({
    foodLog: [],
    calGoal: 2000,
    customFoodPresets: [],

    addFood(entry: Omit<FoodEntry, 'id' | 'updatedAt' | 'deleted'>) {
      const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ foodLog: [e, ...(s.foodLog ?? [])] }));
      adapter.persistChange('food', e.id, e).catch(console.error);
    },

    deleteFood(id: string) {
      const state = get();
      const food = (state.foodLog ?? []).find(f => f.id === id);
      if (food) {
        state.addToRecycleBin({ id, entityType: 'food', data: food });
      }
      set(s => ({ foodLog: deleteFoodFromList(s.foodLog ?? [], id) }));
      adapter.markDeleted('food', id).catch(console.error);
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
