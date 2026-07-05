// Backward-compatible re-export. Reflection Links are now part of ReflectionSlice.
import { createReflectionSlice, type ReflectionSlice } from './createReflectionSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createReflectionSlice as createReflectionLinkSlice };

export type { ReflectionSlice as ReflectionLinkSlice };
