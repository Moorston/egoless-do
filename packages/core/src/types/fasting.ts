// ─── Fasting types ────────────────────────────────────────────────
import type { Syncable } from './shared';

export interface FastingSession extends Syncable {
  id: string;
  targetHours: number;
  startedAt: number;
  endedAt?: number;
  estimatedKcal?: number;
  insight?: string;
  note?: string;
}
