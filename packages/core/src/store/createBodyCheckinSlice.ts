// Backward-compatible re-export. The merged interface is now in createBodySlice.ts
import { createBodySlice, type BodySlice } from './createBodySlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createBodyCheckinSlice = createBodySlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<BodySlice>;

export type BodyCheckinSlice = BodySlice;
