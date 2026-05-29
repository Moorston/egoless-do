// ─── Food business logic (pure functions) ──────────────────────
import type { FoodEntry } from '../types';
import { uid } from '../utils';

export function addFoodToList(foodLog: FoodEntry[], name: string, cal: number, note: string): FoodEntry[] {
  const entry: FoodEntry = { id: uid(), name, calories: cal, note, timestamp: Date.now(), updatedAt: Date.now() };
  return [entry, ...foodLog];
}

export function deleteFoodFromList(foodLog: FoodEntry[], id: string): FoodEntry[] {
  return foodLog.filter(f => f.id !== id);
}
