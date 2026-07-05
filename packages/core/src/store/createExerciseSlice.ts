// Backward-compatible re-export. Exercise is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createCheckinSlice as createExerciseSlice };

export type { CheckinSlice as ExerciseSlice };
