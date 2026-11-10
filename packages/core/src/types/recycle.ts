// ─── Recycle bin types ────────────────────────────────────────────
import type { BreathingRecord } from './breath';
import type { ExerciseEntry } from './exercise';
import type { FoodEntry } from './food';
import type { Habit } from './habit';
import type { Plan, PlanItem } from './plan';
import type { MindReflection } from './reflection';

export type RecycleBinEntityType = 'habit' | 'reflection' | 'food' | 'exercise' | 'plan' | 'breath' | 'planItem';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  data: Habit | MindReflection | FoodEntry | ExerciseEntry | Plan | BreathingRecord | PlanItem;
  deletedAt: number;
}
