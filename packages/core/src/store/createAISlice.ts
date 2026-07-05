// Backward-compatible re-export. AI config is now part of SettingsSlice.
import { createSettingsSlice, type SettingsSlice } from './createSettingsSlice';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';

export const createAISlice = createSettingsSlice as (onPersist?: () => void) => SliceCreator<SettingsSlice>;

export type AISlice = SettingsSlice;
