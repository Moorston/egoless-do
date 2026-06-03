// ─── Checkin types ────────────────────────────────────────────────
import type { Syncable } from './shared';

export interface CheckinEntry extends Syncable {
  date: string;
  done: boolean;
  note: string;
  streak: number;
  weight?: number;
  timestamp?: number;
}

export interface MedHistoryEntry extends Syncable {
  date: string;
  dur: string;
  mood: string;
}

export interface GraceHistoryEntry extends Syncable {
  date: string;
  restoredAt: number;
}
