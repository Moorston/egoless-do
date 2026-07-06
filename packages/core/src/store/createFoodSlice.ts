// Backward-compatible re-export. Food is now part of DietSlice.
import { createDietSlice } from './createDietSlice';
import type { DietSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

/**
 * Shim that delegates to createDietSlice.
 *
 * The caller (useAppStore) passes 3 args: (adapter, onSettingsPersist, onSync).
 * createDietSlice only accepts 2: (adapter, onSync?).
 * We discard onSettingsPersist and forward onSync as the second arg.
 */
export function createFoodSlice(
  adapter: StorageAdapter,
  _onSettingsPersist?: () => void,
  onSync?: () => void,
): SliceCreator<DietSlice> {
  return createDietSlice(adapter, onSync);
}

export type { DietSlice as FoodSlice };
