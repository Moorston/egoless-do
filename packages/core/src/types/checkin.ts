// ─── Checkin types ────────────────────────────────────────────────
import type { Syncable } from './shared';

export interface CheckinEntry extends Syncable {
  date: string;
  done: boolean;
  note: string;
  streak: number;
  totalDays?: number;
  weight?: number;
  timestamp?: number;
  grace?: boolean;
  /** 关联的习惯 ID（可选，用于习惯打卡追踪） */
  habitId?: string;
}

export interface MedHistoryEntry extends Syncable {
  date: string;
  durMin: number;
  trackId?: string;
  note?: string;
}

export interface GraceHistoryEntry extends Syncable {
  date: string;
  restoredAt: number;
}
