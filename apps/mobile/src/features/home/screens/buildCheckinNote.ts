// ─── buildCheckinNote — extracted from HomeScreen ─────────────────
// Pure function: builds the JSON check-in note from store state + view-local
// fields. Extracted from HomeScreen's useCallback closure so the "reads fresh
// state synchronously" invariant is unit-testable without rendering the
// component. See openspec/changes/dedupe-home-realtime-save/design.md (D2).
import { getActivePlan, getTodayCustomTodos, getTodayItems } from '@egoless-do/core';
import type { DailyCustomTodo, Habit, Plan, PlanItem, PlanItemCheckin } from '@egoless-do/core';

/** Store slice read by buildCheckinNote (subset of full store). */
export interface CheckinNoteState {
  waterMl: number;
  habits?: Habit[];
  plans?: Plan[];
  dailyCustomTodos?: DailyCustomTodo[];
  planItemCheckins?: PlanItemCheckin[];
  planItems?: PlanItem[];
}

/** View-local fields passed from the component (closure values). */
export interface CheckinNoteView {
  note: string;
  totalCal: number;
  viewDate: string;
}

/**
 * Build the JSON check-in note. Reads habits/plan items/custom todos/water
 * from `state` (callers pass `useAppStore.getState()` so the values are
 * synchronous-fresh after a store mutation — no setTimeout delay needed),
 * and `note`/`totalCal`/`viewDate` from the component's view-local closure.
 */
export function buildCheckinNote(state: CheckinNoteState, view: CheckinNoteView): string {
  const noteData: Record<string, unknown> = {};
  if (view.note) noteData.note = view.note;
  if (state.waterMl > 0) noteData.water = state.waterMl;

  const checkedHabits = (state.habits ?? [])
    .filter(h => !h.deleted && h.status === 'inProgress' && h.checkedDates?.includes(view.viewDate))
    .map(h => h.name);
  if (checkedHabits.length) noteData.habits = checkedHabits;

  // 每日自定义待办
  const currentPlan = getActivePlan(state.plans ?? []);
  const freshCustomTodos = currentPlan
    ? getTodayCustomTodos(state.dailyCustomTodos ?? [], currentPlan.id, view.viewDate)
    : [];
  const doneCustomTodos = freshCustomTodos.filter(t => t.done).map(t => t.name);
  if (doneCustomTodos.length) noteData.customs = doneCustomTodos;

  // 计划事项
  const freshPlanCheckins = (state.planItemCheckins ?? []).filter(c => !c.deleted);
  const freshTodayPlanItems = currentPlan
    ? getTodayItems(state.planItems ?? [], currentPlan, view.viewDate, freshPlanCheckins)
    : [];
  const donePlanItems = freshTodayPlanItems
    .filter(item => freshPlanCheckins.some(c => c.planItemId === item.id && c.date === view.viewDate && c.done))
    .map(item => item.name);
  if (donePlanItems.length) noteData.planItems = donePlanItems;

  if (view.totalCal > 0) noteData.food = view.totalCal;
  return JSON.stringify(noteData);
}
