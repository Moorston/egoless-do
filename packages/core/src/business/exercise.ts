// ─── Exercise business logic (pure functions) ──────────────────
import type { ExerciseEntry } from '../types';
import { uid } from '../utils';

export function addExerciseToList(
  exerciseLog: ExerciseEntry[],
  entry: Omit<ExerciseEntry, 'id' | 'updatedAt'>
): ExerciseEntry[] {
  const newEntry: ExerciseEntry = { ...entry, id: uid(), updatedAt: Date.now() };
  return [newEntry, ...exerciseLog];
}

export function deleteExerciseFromList(exerciseLog: ExerciseEntry[], id: string): ExerciseEntry[] {
  return exerciseLog.filter(e => e.id !== id);
}
