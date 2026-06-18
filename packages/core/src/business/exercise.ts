// ─── Exercise business logic (pure functions) ──────────────────
import type { ExerciseEntry } from '../types';

export function deleteExerciseFromList(exerciseLog: ExerciseEntry[], id: string): ExerciseEntry[] {
  const now = Date.now();
  return exerciseLog.map(e => (e.id === id && !e.deleted) ? { ...e, deleted: true, updatedAt: now } : e);
}
