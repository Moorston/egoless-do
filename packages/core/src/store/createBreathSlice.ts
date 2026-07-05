// Backward-compatible re-export. Breathing is now part of ZhiguanSlice.
import { createZhiguanSlice } from './createZhiguanSlice';
import type { ZhiguanSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createBreathSlice = createZhiguanSlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<ZhiguanSlice>;

export type { ZhiguanSlice as BreathSlice };
