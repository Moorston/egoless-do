// Backward-compatible re-export. Vision is now part of PracticeSlice.
import { createPracticeSlice, type PracticeSlice } from './createPracticeSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createVisionSlice = createPracticeSlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<PracticeSlice>;

export type { PracticeSlice as VisionSlice } from './createPracticeSlice';
