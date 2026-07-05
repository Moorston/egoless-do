// ─── Recycle bin types ────────────────────────────────────────────
import type { Habit } from './habit';
import type { MindReflection } from './reflection';
import type { FoodEntry } from './food';
import type { ExerciseEntry } from './exercise';
import type { Plan } from './plan';
import type { BreathingRecord } from './breath';

export type RecycleBinEntityType = 'habit' | 'reflection' | 'food' | 'exercise' | 'plan' | 'breath';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  data: Habit | MindReflection | FoodEntry | ExerciseEntry | Plan | BreathingRecord;
  deletedAt: number;
}
