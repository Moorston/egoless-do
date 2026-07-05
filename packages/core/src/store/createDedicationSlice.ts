// Backward-compatible re-export. Dedication is now part of PracticeSlice.
import { createPracticeSlice, type PracticeSlice } from './createPracticeSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createDedicationSlice = createPracticeSlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<PracticeSlice>;

export type { PracticeSlice as DedicationSlice } from './createPracticeSlice';
