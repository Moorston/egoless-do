// ─── Food business logic (pure functions) ──────────────────────
import type { FoodEntry } from '../types';

export function deleteFoodFromList(foodLog: FoodEntry[], id: string): FoodEntry[] {
  const now = Date.now();
  return foodLog.map(f => f.id === id ? { ...f, deleted: true, updatedAt: now } : f);
}
