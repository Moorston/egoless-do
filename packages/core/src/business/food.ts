// ─── Food business logic (pure functions) ──────────────────────
import type { FoodEntry } from '../types';

export function deleteFoodFromList(foodLog: FoodEntry[], id: string): FoodEntry[] {
  const now = Date.now();
  return foodLog.map(f => f.id === id ? { ...f, deleted: true, updatedAt: now } : f);
}

/** Get top N most frequently logged foods (by name), excluding deleted entries */
export function getRecentFoods(foodLog: FoodEntry[], limit = 3): Array<{ name: string; calories: number }> {
  const active = foodLog.filter(f => !f.deleted);
  if (active.length === 0) return [];

  const freq = new Map<string, { count: number; calories: number }>();
  for (const f of active) {
    const existing = freq.get(f.name);
    if (existing) {
      existing.count++;
    } else {
      freq.set(f.name, { count: 1, calories: f.calories });
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, { calories }]) => ({ name, calories }));
}
