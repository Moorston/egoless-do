import { describe, it, expect } from 'vitest';
import type { ExerciseEntry } from '../types';
import { deleteExerciseFromList } from './exercise';

const makeExercise = (overrides: Partial<ExerciseEntry> = {}): ExerciseEntry => ({
  id: 'e1', sportKey: 'running', sportIcon: '🏃', durationSec: 1800,
  timestamp: 1000, updatedAt: 0, deleted: false, ...overrides,
});

describe('deleteExerciseFromList', () => {
  it('marks matching exercise as deleted', () => {
    const list = [makeExercise({ id: 'a' }), makeExercise({ id: 'b' })];
    const result = deleteExerciseFromList(list, 'a');
    expect(result[0].deleted).toBe(true);
    expect(result[1].deleted).toBe(false);
  });
  it('does not modify non-matching exercises', () => {
    const list = [makeExercise()];
    const result = deleteExerciseFromList(list, 'other');
    expect(result[0].deleted).toBe(false);
  });
  it('updates updatedAt on delete', () => {
    const list = [makeExercise({ updatedAt: 0 })];
    const result = deleteExerciseFromList(list, 'e1');
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });
  it('handles empty list', () => {
    const result = deleteExerciseFromList([], 'e1');
    expect(result).toEqual([]);
  });
  it('preserves other fields when deleting', () => {
    const list = [makeExercise({ sportKey: 'cycling', durationSec: 3600 })];
    const result = deleteExerciseFromList(list, 'e1');
    expect(result[0].sportKey).toBe('cycling');
    expect(result[0].durationSec).toBe(3600);
  });
});
