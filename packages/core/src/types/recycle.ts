// ─── Recycle bin types ────────────────────────────────────────────
import type { Habit } from './habit';
import type { MindReflection } from './reflection';
import type { FoodEntry } from './food';
import type { ExerciseEntry } from './exercise';
import type { Plan } from './plan';

export type RecycleBinEntityType = 'habit' | 'reflection' | 'food' | 'exercise' | 'plan';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  data: Habit | MindReflection | FoodEntry | ExerciseEntry | Plan;
  deletedAt: number;
}
