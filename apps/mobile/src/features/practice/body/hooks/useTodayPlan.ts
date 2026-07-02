// ─── useTodayPlan ─────────────────────────────────────────
// Shared hook for today's body plan + related derived data.
// Used by BodyScreen, BodyDashboard, BodyFlow and related modals
// to avoid duplicating today-plan lookup logic.
import { useMemo } from 'react';
import { useAppStore } from '../../../../store/useAppStore';
import type { BodyPlan } from '@egoless-do/core';

export interface TodayPlanData {
  /** today's plan if one exists for current weekday, else undefined */
  todayPlan: BodyPlan | undefined;
  /** 1=Mon..7=Sun */
  weekday: number;
  /** YYYY-MM-DD for today */
  dateStr: string;
}

export function useTodayPlan(): TodayPlanData {
  const store = useAppStore();

  return useMemo(() => {
    const today = new Date();
    const weekday = today.getDay() === 0 ? 7 : today.getDay();
    const plans = (store.bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted);
    const todayPlan = plans.find((p: BodyPlan) => p.weekday === weekday);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { todayPlan, weekday, dateStr: `${y}-${m}-${d}` };
  }, [store.bodyPlans]);
}
