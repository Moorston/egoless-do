// ─── Memoized Selectors（派生状态）──────────────────────────────
// 从 Source of Truth 实时计算，避免冗余存储。

import { calculateStreakFromCheckins, dateStr } from '@egoless-do/core';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore, type MobileStore } from './useAppStore';

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
    () => medHistory.filter(m => !m.deleted).reduce((sum, m) => sum + m.durMin, 0),
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

/**
 * 计算习惯完成进度（0-100）。
 */
export function useHabitProgress(habitId: string): number {
  const checkinHistory = useAppStore(useShallow((s: MobileStore) => s.checkinHistory));
  const habits = useAppStore(useShallow((s: MobileStore) => s.habits));
  return useMemo(() => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    const habitCheckins = checkinHistory.filter(c => c.habitId === habitId && !c.deleted && c.done);
    if (!habit.targetDays) return 0;
    return Math.min(100, Math.round((habitCheckins.length / habit.targetDays) * 100));
  }, [checkinHistory, habits, habitId]);
}

/**
 * 获取活跃习惯列表（未删除）。
 */
export function useActiveHabits() {
  const habits = useAppStore(useShallow((s: MobileStore) => s.habits));
  return useMemo(() => habits.filter(h => !h.deleted), [habits]);
}

/**
 * 获取今日打卡记录。
 */
export function useTodayCheckins() {
  const checkinHistory = useAppStore(useShallow((s: MobileStore) => s.checkinHistory));
  const today = dateStr();
  return useMemo(
    () => checkinHistory.filter(c => c.date === today && !c.deleted),
    [checkinHistory, today]
  );
}

// ── Pure Functions ──
// calculateStreakFromCheckins is re-exported from @egoless-do/core for shared use
