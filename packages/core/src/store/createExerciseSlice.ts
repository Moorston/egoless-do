import type { ExerciseEntry } from '../types';
import { uid } from '../utils';
import { deleteExerciseFromList } from '../business';
import type { StorageAdapter, ExerciseSlice } from './types';
import type { SliceCreator } from './sliceHelper';

export function createExerciseSlice(adapter: StorageAdapter): SliceCreator<ExerciseSlice> {
  return (set, get) => ({
    exerciseLog: [],

    addExercise(entry: Omit<ExerciseEntry, 'id' | 'updatedAt' | 'deleted'>) {
      const e: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ exerciseLog: [e, ...(s.exerciseLog ?? [])] }));
      adapter.persistChange('exercise', e.id, e).catch(console.error);
    },

    deleteExercise(id: string) {
      const state = get();
      const exercise = (state.exerciseLog ?? []).find(e => e.id === id);
      if (exercise) {
        state.addToRecycleBin({ id, entityType: 'exercise', data: exercise });
      }
      set(s => ({ exerciseLog: deleteExerciseFromList(s.exerciseLog ?? [], id) }));
      const deleted = get().exerciseLog.find(e => e.id === id);
      if (deleted) adapter.persistChange('exercise', id, deleted).catch(console.error);
    },
  });
}
