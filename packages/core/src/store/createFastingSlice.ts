// Backward-compatible re-export. Fasting is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';

export { createCheckinSlice as createFastingSlice };

export type { CheckinSlice as FastingSlice };
