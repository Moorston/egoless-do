import type { ExerciseEntry } from '../types';
import { uid } from '../utils';
import { deleteExerciseFromList } from '../business';
import type { StorageAdapter, ExerciseSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createExerciseSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<ExerciseSlice> {
  return (set, get) => ({
    exerciseLog: [],

    addExercise(entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) {
      // Ensure sportKey is always present
      const sportKey = entry.sportKey?.trim();
      if (!sportKey) return;
      const e: ExerciseEntry = { ...entry, sportKey, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] }));
      adapter.persistChange('exercise', e.id, e).catch(e => log.error(e));
      onSync?.();
    },

    deleteExercise(id: string) {
      const state = get();
      const exercise = (state.exerciseLog ?? []).find(e => e.id === id && !e.deleted);
      // Atomic: recycle bin + soft-delete in one set()
      set(s => ({
        exerciseLog: deleteExerciseFromList(s.exerciseLog ?? [], id),
        ...(exercise ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'exercise' as const, data: exercise, deletedAt: Date.now() }] } : {}),
      }));
      adapter.markDeleted('exercise', id).catch(e => log.error(e));
      onSync?.();
    },
  });
}
