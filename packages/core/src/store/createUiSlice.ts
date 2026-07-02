// ─── Legacy UiSlice — composes granular slices + resetData ─────
import type { StorageAdapter, UiSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createFoodSlice } from './createFoodSlice';
import { createExerciseSlice } from './createExerciseSlice';
import { createCheckinSlice } from './createCheckinSlice';
import { createProfileSlice } from './createProfileSlice';
import { createSettingsSlice } from './createSettingsSlice';
import { createTagMoodSlice } from './createTagMoodSlice';
import { createResetDataPatch } from '../defaults';

export function createUiSlice(
  adapter: StorageAdapter,
): SliceCreator<UiSlice> {
  return (set, get, api) => ({
    // Compose all granular slices
    ...createFoodSlice(adapter)(set, get, api),
    ...createExerciseSlice(adapter)(set, get, api),
    ...createCheckinSlice(adapter)(set, get, api),
    ...createProfileSlice(adapter)(set, get, api),
    ...createSettingsSlice()(set, get, api),
    ...createTagMoodSlice()(set, get, api),

    resetData() {
      const { auth, theme, language } = get();
      set(createResetDataPatch(auth, theme, language) as Partial<UiSlice>);
    },
  });
}
