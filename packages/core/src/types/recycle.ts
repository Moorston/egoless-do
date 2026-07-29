// ─── Recycle bin types ────────────────────────────────────────────
import type { Habit } from './habit';
import type { MindReflection } from './reflection';
import type { FoodEntry } from './food';
import type { ExerciseEntry } from './exercise';
import type { Plan, PlanItem } from './plan';
import type { BreathingRecord } from './breath';
import type { PlanItem } from './plan';

export type RecycleBinEntityType = 'habit' | 'reflection' | 'food' | 'exercise' | 'plan' | 'breath' | 'planItem';

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  data: Habit | MindReflection | FoodEntry | ExerciseEntry | Plan | BreathingRecord | PlanItem;
  deletedAt: number;
}
