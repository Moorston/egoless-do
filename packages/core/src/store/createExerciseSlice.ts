import type { ExerciseEntry } from '../types';
import { uid } from '../utils';
import { deleteExerciseFromList } from '../business';
import type { StorageAdapter, ExerciseSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createExerciseSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<ExerciseSlice> {
  return (set: any, get: any) => ({
    exerciseLog: [],

    addExercise(entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) {
      const e: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] }));
      adapter.persistChange('exercise', e.id, e).catch(console.error);
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
      adapter.markDeleted('exercise', id).catch(console.error);
      onSync?.();
    },
  });
}
