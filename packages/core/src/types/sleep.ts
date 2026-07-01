// ─── Sleep types ─────────────────────────────────────────────
import type { Syncable } from './shared';

export type SleepQuality = 1 | 2 | 3 | 4 | 5;
export type WorkState = 'energetic' | 'normal' | 'tired' | 'exhausted';

export interface SleepEntry extends Syncable {
  id: string;
  date: string;               // "YYYY-MM-DD" — record date
  bedtimeAt?: number;         // bedtime timestamp
  wakeAt?: number;            // wake-up timestamp
  durationMin?: number;       // sleep duration in minutes
  quality?: SleepQuality;     // self-rated quality 1-5
  barrierDone: boolean;       // ritual completed
  barrierMin?: number;        // actual barrier duration
  awayMin?: number;           // time away from phone
  practice?: string[];        // completed practices ['breath', 'meditation']
  workState?: WorkState;      // today's work energy
  bodyState?: string[];       // body state tags
  mindState?: string[];       // mind state tags
  gratitude?: string[];       // gratitude entries
  note?: string;              // daily reflection
}

export interface SleepGoal {
  targetBedtime: string;      // "HH:MM"
  targetWake: string;         // "HH:MM"
  targetHours: number;
  enabled: boolean;           // notifications enabled
  reminderBeforeMin: number;  // minutes before targetBedtime
}

export const DEFAULT_SLEEP_GOAL: SleepGoal = {
  targetBedtime: '23:00',
  targetWake: '07:00',
  targetHours: 8,
  enabled: false,
  reminderBeforeMin: 30,
};

export const BODY_STATE_PRESETS = [
  '头清目明', '眼睛干涩', '腰酸背痛', '精力充沛',
  '四肢沉重', '肩颈僵硬', '食欲良好', '头痛',
];

export const MIND_STATE_PRESETS = [
  '平静', '愉悦', '焦虑', '感恩',
  '烦躁', '专注', '迷茫', '悲伤',
];
