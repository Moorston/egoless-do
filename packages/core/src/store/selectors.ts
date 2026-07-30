// ─── Memoized Selectors（派生状态）──────────────────────────────
// 从 Source of Truth 实时计算，避免冗余存储。

import { useMemo } from 'react';
import { useAppStore, type MobileStore } from './useAppStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * 计算习惯连续打卡天数。
 * 从 checkinHistory 派生，无冗余存储。
 */
export function useCheckinStreak(): number {
  const checkinHistory = useAppStore(useShallow((s: MobileStore) => s.checkinHistory));
  return useMemo(() => calculateStreakFromCheckins(checkinHistory), [checkinHistory]);
}

/**
 * 计算总冥想时长（分钟）。
 * 从 medHistory 派生。
 */
export function useTotalMedMinutes(): number {
  const medHistory = useAppStore(useShallow((s: MobileStore) => s.medHistory));
  return useMemo(
    () => medHistory.filter(m => !m.deleted).reduce((sum, m) => sum + (m.durMin || 0), 0),
    [medHistory]
  );
}

/**
 * 计算习惯进度（0-100）。
 * 从 checkins + habits 派生。
 */
export function useHabitStreak(habitId: string): number {
  const checkinHistory = useAppStore(useShallow((s: MobileStore) => s.checkinHistory));
  return useMemo(
    () => calculateStreakFromCheckins(checkinHistory.filter(c => c.habitId === habitId)),
    [checkinHistory, habitId]
  );
}

// ── Pure Functions ──

export function calculateStreakFromCheckins(checkins: Array<{ date: string; done: boolean; deleted?: boolean }>): number {
  if (!checkins || checkins.length === 0) return 0;

  const sorted = checkins
    .filter(c => c.done && !c.deleted)
    .map(c => c.date)
    .sort((a, b) => b.localeCompare(a)); // 降序

  if (sorted.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (sorted[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
