// ─── Habit types ──────────────────────────────────────────────────
import type { Syncable, HabitStatus } from './shared';

/** Modules that a habit can be linked to for auto-checkin */
export type HabitLink = 'none' | 'fasting' | 'meditation' | 'exercise' | 'sleep';

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
  alarmEnabled: boolean;
  alarmHour: number;
  alarmMinute: number;
  /** Linked module for auto-checkin */
  link: HabitLink;
  /** Module-specific config */
  linkConfig?: {
    /** Fasting target hours (default 16) */
    targetHours?: number;
    /** Exercise target minutes (default 30) */
    targetMinutes?: number;
    /** Sleep minimum quality (1-5) */
    minQuality?: number;
  };
  /** 关联愿景 ID */
  visionId?: string;
}
