// ─── Fasting business logic (pure functions) ───────────────────
import type { FastingSession } from '../types';
import { createFastingSession } from '../defaults';
import { estimateFastingKcal } from '../utils';

export function startFastingSession(activeFasting: FastingSession | null, hours: number): FastingSession | null {
  if (activeFasting) return null; // guard against double-start
  return createFastingSession(hours) as FastingSession;
}

export interface StopFastingOpts {
  weight?: number;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
}

export function stopFastingSession(
  activeFasting: FastingSession,
  opts?: StopFastingOpts
): FastingSession {
  const durHours = (Date.now() - activeFasting.startedAt) / 3600000;
  const kcal = estimateFastingKcal(
    durHours,
    opts?.weight ?? 70,
    opts?.gender ?? 'male',
    opts?.age ?? 30,
    opts?.height ?? 170,
  );
  return {
    ...activeFasting,
    endedAt: Date.now(),
    estimatedKcal: kcal,
    updatedAt: Date.now(),
  };
}
