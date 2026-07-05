// Backward-compatible re-export. Give is now part of PracticeSlice.
import { createPracticeSlice, type PracticeSlice } from './createPracticeSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createGiveSlice = createPracticeSlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<PracticeSlice>;

export type { PracticeSlice as GiveSlice } from './createPracticeSlice';
