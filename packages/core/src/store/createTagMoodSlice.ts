// Backward-compatible re-export. Tags & Moods are now part of ReflectionSlice.
import { createReflectionSlice, type ReflectionSlice } from './createReflectionSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createReflectionSlice as createTagMoodSlice };

export type { ReflectionSlice as TagMoodSlice };
