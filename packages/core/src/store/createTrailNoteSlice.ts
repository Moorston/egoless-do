// Backward-compatible re-export. Trail notes are now part of ThoughtTrailSlice.
import { createThoughtTrailSlice } from './createThoughtTrailSlice';
import type { ThoughtTrailSlice } from './types';

export { createThoughtTrailSlice as createTrailNoteSlice };

export type { ThoughtTrailSlice as TrailNoteSlice };
