import { describe, it, expect } from 'vitest';
import type { FoodEntry } from '../types';
import { deleteFoodFromList } from './food';

const makeFood = (overrides: Partial<FoodEntry> = {}): FoodEntry => ({
  id: 'f1', name: 'Rice', calories: 200, timestamp: 1000,
  updatedAt: 0, deleted: false, ...overrides,
});

describe('deleteFoodFromList', () => {
  it('marks matching food as deleted', () => {
    const list = [makeFood({ id: 'a' }), makeFood({ id: 'b' })];
    const result = deleteFoodFromList(list, 'a');
    expect(result[0].deleted).toBe(true);
    expect(result[1].deleted).toBe(false);
  });
  it('does not modify non-matching foods', () => {
    const list = [makeFood()];
    const result = deleteFoodFromList(list, 'other');
    expect(result[0].deleted).toBe(false);
  });
  it('updates updatedAt on delete', () => {
    const list = [makeFood({ updatedAt: 0 })];
    const result = deleteFoodFromList(list, 'f1');
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });
  it('handles empty list', () => {
    const result = deleteFoodFromList([], 'f1');
    expect(result).toEqual([]);
  });
  it('preserves other fields when deleting', () => {
    const list = [makeFood({ name: 'Noodles', calories: 350, note: 'lunch' })];
    const result = deleteFoodFromList(list, 'f1');
    expect(result[0].name).toBe('Noodles');
    expect(result[0].calories).toBe(350);
    expect(result[0].note).toBe('lunch');
  });
});
