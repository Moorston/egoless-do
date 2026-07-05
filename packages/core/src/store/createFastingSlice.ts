// Backward-compatible re-export. Fasting is now part of CheckinSlice.
import { createCheckinSlice, type CheckinSlice } from './createCheckinSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createCheckinSlice as createFastingSlice };

export type { CheckinSlice as FastingSlice };
