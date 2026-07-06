// Backward-compatible re-export. Exercise is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';

export { createCheckinSlice as createExerciseSlice };

export type { CheckinSlice as ExerciseSlice };
