import { dateStr } from '@egoless-do/core';
import type { Vision, HabitStat, PlanProgress, VisionProgress, Habit, Plan, PlanItem } from '@egoless-do/core';
import { useMemo } from 'react';

import {useShallowStore} from '../../store/useAppStore';


export interface DayData {
  date: string;
  label: string;
  habits: { id: string; name: string }[];
  plans: { id: string; name: string }[];
  isToday: boolean;
}

export interface VowProgressData {
  thisWeekPracticeDays: number;
  thisMonthPracticeDays: number;
  longestStreak: number;
  todayCompleted: { id: string; name: string; type: 'habit' | 'plan' }[];
  dailyData: DayData[];
  visionProgress: { vision: Vision; pct: number }[];
  dedicationStats: {
    practiceDays: number;
    totalDays: number;
    habitStats: HabitStat[];
    planProgress: PlanProgress[];
    visionProgressData: VisionProgress[];
  };
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function useVowProgress(): VowProgressData {
  const { habits, plans, planItems, visions } = useShallowStore(s => ({
    habits: s.habits,
    plans: s.plans,
    planItems: s.planItems,
    visions: s.visions,
  }));

  return useMemo(() => {
    const today = new Date();
    const todayStr = dateStr(today);

    // Compute week boundaries (Mon-Sun)
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(dateStr(d));
    }

    // Get active habits & plans
    const activeHabits = (habits ?? []).filter((h: Habit) => !h.deleted);
    const activePlans = (plans ?? []).filter((p: Plan) => !p.deleted);

    // Build daily checkin sets from habits
    const dateToHabits = new Map<string, { id: string; name: string }[]>();
    const dateToPlans = new Map<string, { id: string; name: string }[]>();

    for (const h of activeHabits) {
      const dates: string[] = h.checkedDates ?? [];
      for (const date of dates) {
        if (!dateToHabits.has(date)) dateToHabits.set(date, []);
        dateToHabits.get(date)!.push({ id: h.id, name: h.name });
      }
    }

    // This week practice days
    const thisWeekPracticeDays = weekDates.filter(d => {
      const h = dateToHabits.get(d);
      const pl = dateToPlans.get(d);
      return (h && h.length > 0) || (pl && pl.length > 0);
    }).length;

    // This month practice days
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    let thisMonthPracticeDays = 0;
    const allPracticeDates = new Set<string>();
    for (const d of dateToHabits.keys()) allPracticeDates.add(d);
    for (const d of dateToPlans.keys()) allPracticeDates.add(d);
    const sortedAll = [...allPracticeDates].sort();
    for (const d of sortedAll) {
      if (d >= monthStart && d <= todayStr) thisMonthPracticeDays++;
    }

    // Longest streak from all practice dates
    let longestStreak = 0;
    let currentStreak = 0;
    const allSorted = [...allPracticeDates].sort();
    for (let i = 0; i < allSorted.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(allSorted[i - 1] + 'T00:00:00');
        const curr = new Date(allSorted[i] + 'T00:00:00');
        const diffMs = curr.getTime() - prev.getTime();
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    // Today completed
    const todayCompleted: { id: string; name: string; type: 'habit' | 'plan' }[] = [];
    for (const h of dateToHabits.get(todayStr) ?? []) {
      todayCompleted.push({ ...h, type: 'habit' });
    }
    for (const p of dateToPlans.get(todayStr) ?? []) {
      todayCompleted.push({ ...p, type: 'plan' });
    }

    // Daily data for the week
    const dailyData: DayData[] = weekDates.map((d, i) => ({
      date: d,
      label: DAY_LABELS[i],
      habits: dateToHabits.get(d) ?? [],
      plans: dateToPlans.get(d) ?? [],
      isToday: d === todayStr,
    }));

    // Vision progress - plans use plan.visionId, habits use habit.visionId
    const activeVisions = (visions ?? []).filter((v: Vision) => !v.deleted && v.status === 'active');
    const planItemsAll = (planItems ?? []).filter((i: PlanItem) => !i.deleted);

    // Pre-build plan→items map for O(1) lookup
    const planToItems = new Map<string, PlanItem[]>();
    for (const pi of planItemsAll) {
      const existing = planToItems.get(pi.planId);
      if (existing) existing.push(pi);
      else planToItems.set(pi.planId, [pi]);
    }

    const visionProgress = activeVisions.map(vision => {
      let totalCompleted = 0;
      let totalExpected = 0;

      // Plans linked via direct FK (plan.visionId)
      const linkedPlans = activePlans.filter((p: Plan) => p.visionId === vision.id && !p.deleted);
      for (const plan of linkedPlans) {
        const items = planToItems.get(plan.id) ?? [];
        const done = items.filter((i: PlanItem) => i.status === 'completed').length;
        totalCompleted += done;
        totalExpected += items.length || 1;
      }

      // Habits linked via direct FK (habit.visionId)
      const linkedHabits = activeHabits.filter((h: Habit) => !h.deleted && h.visionId === vision.id);
      for (const habit of linkedHabits) {
        const dates: string[] = habit.checkedDates ?? [];
        const completed = dates.length;
        totalCompleted += completed;
        totalExpected += Math.max(completed, 30);
      }

      if (totalExpected === 0) return { vision, pct: 0 };
      const pct = Math.round((totalCompleted / totalExpected) * 100);
      return { vision, pct: Math.min(pct, 100) };
    });

    // Dedication stats (for the current period)
    const totalDays = 7; // default weekly
    let practiceDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = dateStr(d);
      const h = dateToHabits.get(ds);
      const pl = dateToPlans.get(ds);
      if ((h && h.length > 0) || (pl && pl.length > 0)) practiceDays++;
    }

    const habitStats: HabitStat[] = activeHabits.map((h: Habit) => {
      const history = (h as Habit & { checkinHistory?: Record<string, boolean> }).checkinHistory ?? {};
      const weekStartStr = weekDates[0];
      const completed = Object.entries(history).filter(([d, done]) => done && d >= weekStartStr && d <= todayStr).length;
      return {
        habitId: h.id,
        name: h.name,
        completed,
        total: 7,
      };
    });

    const planProgressResult: PlanProgress[] = activePlans.map((p: Plan) => {
      const items = (p as Plan & { items?: { done?: boolean }[] }).items ?? [];
      const done = items.filter((it: { done?: boolean }) => it.done).length;
      return {
        planId: p.id,
        name: p.name,
        progressDelta: items.length > 0 ? Math.round((done / items.length) * 100) : 0,
      };
    });

    const visionProgressData: VisionProgress[] = visionProgress.map(vp => ({
      visionId: vp.vision.id,
      before: 0,
      after: vp.pct,
    }));

    return {
      thisWeekPracticeDays,
      thisMonthPracticeDays,
      longestStreak,
      todayCompleted,
      dailyData,
      visionProgress,
      dedicationStats: {
        practiceDays,
        totalDays,
        habitStats,
        planProgress: planProgressResult,
        visionProgressData,
      },
    };
  }, [habits, plans, planItems, visions]);
}
