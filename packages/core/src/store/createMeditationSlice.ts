// Backward-compatible re-export. Meditation is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';

export { createCheckinSlice as createMeditationSlice };

export type { CheckinSlice as MeditationSlice };
