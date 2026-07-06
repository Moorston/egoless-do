// ─── Legacy UiSlice — composes granular slices + resetData ─────
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createFoodSlice } from './createFoodSlice';
import { createCheckinSlice } from './createCheckinSlice';
import { createProfileSlice } from './createProfileSlice';
import { createSettingsSlice } from './createSettingsSlice';
import { createReflectionSlice } from './createReflectionSlice';
import { createResetDataPatch } from '../defaults';

/** @deprecated Use individual slices directly */
export function createUiSlice(
  adapter: StorageAdapter,
): SliceCreator<any> {
  return (set, get, api) => ({
    ...createFoodSlice(adapter)(set, get, api),
    ...createCheckinSlice(adapter)(set, get, api),
    ...createProfileSlice(adapter)(set, get, api),
    ...createSettingsSlice()(set, get, api),
    ...createReflectionSlice(adapter)(set, get, api),

    resetData() {
      const { auth, theme, language } = get();
      set(createResetDataPatch(auth, theme, language));
    },
  });
}
