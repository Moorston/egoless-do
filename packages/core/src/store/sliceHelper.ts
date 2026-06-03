// ─── Type helpers for Zustand slice creation ──────────────────
import type { StateCreator } from 'zustand';
import type { FullStore } from './types';

/** StateCreator specialized for slices of the full store */
export type SliceCreator<Slice> = StateCreator<FullStore, [], [], Slice>;
