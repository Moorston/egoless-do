import { useMemo } from 'react';
import { dateStr } from '@egoless-do/core';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import type { Vision, VisionPractice, Dedication, HabitStat, PlanProgress, VisionProgress } from '@egoless-do/core';

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
  const { habits, plans, planItems, visions, visionPractices } = useAppStore(useShallow(s => ({
    habits: s.habits,
    plans: s.plans,
    planItems: s.planItems,
    visions: s.visions,
    visionPractices: s.visionPractices,
  })));

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
    const activeHabits = (habits ?? []).filter((h: any) => !h.deleted);
    const activePlans = (plans ?? []).filter((p: any) => !p.deleted);

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

    // Plan progress comes from plan.progress field
    for (const p of activePlans) {
      // Plans don't have daily checkins in the same way; track by progress changes
      // We'll count any plan with progress > 0 as active
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

    // Vision progress - plans use Plan.visionId, habits use VisionPractice
    const activeVisions = (visions ?? []).filter((v: Vision) => !v.deleted && v.status === 'active');
    const activeVisionPractices = (visionPractices ?? []).filter((vp: VisionPractice) => !vp.deleted);
    const planItemsAll = (planItems ?? []).filter((i: any) => !i.deleted);

    const visionProgress = activeVisions.map(vision => {
      let totalCompleted = 0;
      let totalExpected = 0;

      // Plans linked via Plan.visionId
      const linkedPlans = activePlans.filter((p: any) => p.visionId === vision.id && !p.deleted);
      for (const plan of linkedPlans) {
        const items = planItemsAll.filter((i: any) => i.planId === plan.id);
        const done = items.filter((i: any) => i.status === 'completed').length;
        totalCompleted += done;
        totalExpected += items.length || 1;
      }

      // Habits linked via VisionPractice
      const linkedHabits = activeVisionPractices.filter(vp => vp.visionId === vision.id && vp.refType === 'habit');
      for (const vp of linkedHabits) {
        const habit = activeHabits.find((h: any) => h.id === vp.refId);
        if (habit) {
          const dates: string[] = habit.checkedDates ?? [];
          const completed = dates.length;
          totalCompleted += completed;
          totalExpected += Math.max(completed, 30);
        }
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

    const habitStats: HabitStat[] = activeHabits.map((h: any) => {
      const history = h.checkinHistory ?? {};
      const weekStartStr = weekDates[0];
      const completed = Object.entries(history).filter(([d, done]) => done && d >= weekStartStr && d <= todayStr).length;
      return {
        habitId: h.id,
        name: h.name,
        completed,
        total: 7,
      };
    });

    const planProgressResult: PlanProgress[] = activePlans.map((p: any) => {
      const items = p.items ?? [];
      const done = items.filter((it: any) => it.done).length;
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
  }, [habits, plans, planItems, visions, visionPractices]);
}
