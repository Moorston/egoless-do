// Backward-compatible re-export. Meditation is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createCheckinSlice as createMeditationSlice };

export type { CheckinSlice as MeditationSlice };
