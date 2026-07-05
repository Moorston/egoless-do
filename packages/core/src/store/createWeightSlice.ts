// Backward-compatible re-export. The merged interface is now in createBodySlice.ts
// Import the merged factory and re-export under the old name for backward compatibility.
import { createBodySlice, type BodySlice } from './createBodySlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

// Re-export the slice creator under the legacy name
export const createWeightSlice = createBodySlice as (adapter: StorageAdapter, onSync?: () => void) => SliceCreator<BodySlice>;

export type WeightSlice = BodySlice;
