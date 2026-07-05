// Backward-compatible re-export. Food is now part of DietSlice.
import { createDietSlice } from './createDietSlice';
import type { DietSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createFoodSlice = createDietSlice as (adapter: StorageAdapter, onSettingsPersist?: () => void, onSync?: () => void) => SliceCreator<DietSlice>;

export type { DietSlice as FoodSlice };
