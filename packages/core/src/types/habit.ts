// ─── Habit types ──────────────────────────────────────────────────
import type { Syncable, HabitStatus } from './shared';

export interface Habit extends Syncable {
  id: string;
  name: string;
  startDate: string;
  targetDays: number;
  goal: string;
  insight: string;
  createTag: boolean;
  doneDays: number;
  streak: number;
  interrupted: number;
  status: HabitStatus;
  checkedDates: string[];
  pauseReason: string;
  abandonReason: string;
}
