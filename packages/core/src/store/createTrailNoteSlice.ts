// Backward-compatible re-export. Trail notes are now part of ThoughtTrailSlice.
import { createThoughtTrailSlice } from './createThoughtTrailSlice';
import type { ThoughtTrailSlice, StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export { createThoughtTrailSlice as createTrailNoteSlice };

export type { ThoughtTrailSlice as TrailNoteSlice };
