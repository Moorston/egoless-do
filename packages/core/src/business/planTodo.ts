// ─── Daily Todo shared logic (used by both Mobile & Web) ──────
import type { PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory, PlanItemLink } from '../types';

export interface TodoItemStatus {
  done: boolean;
  autoChecked: boolean;
  linkedModule?: string;
}

export function getTodoItemStatus(
  item: PlanItem,
  checkins: PlanItemCheckin[],
  date: string,
): TodoItemStatus {
  const checkin = checkins.find(
    c => c.planItemId === item.id && c.date === date && c.done,
  );
  if (!checkin) return { done: false, autoChecked: false };
  return {
    done: true,
    autoChecked: !!checkin.linkedModule,
    linkedModule: checkin.linkedModule,
  };
}

export function getTodoItemStatusMap(
  items: PlanItem[],
  checkins: PlanItemCheckin[],
  date: string,
): Map<string, TodoItemStatus> {
  const map = new Map<string, TodoItemStatus>();
  for (const item of items) {
    map.set(item.id, getTodoItemStatus(item, checkins, date));
  }
  return map;
}

export interface DailyTodoStats {
  planItemsDone: number;
  planItemsTotal: number;
  customTodosDone: number;
  customTodosTotal: number;
  totalDone: number;
  totalItems: number;
  progressPercent: number;
}

export function computeDailyTodoStats(
  planItems: PlanItem[],
  customTodos: DailyCustomTodo[],
  checkins: PlanItemCheckin[],
  date: string,
): DailyTodoStats {
  const planItemsDone = planItems.filter(item =>
    checkins.some(c => c.planItemId === item.id && c.date === date && c.done),
  ).length;
  const customTodosDone = customTodos.filter(t => t.done).length;
  const totalDone = planItemsDone + customTodosDone;
  const totalItems = planItems.length + customTodos.length;
  return {
    planItemsDone,
    planItemsTotal: planItems.length,
    customTodosDone,
    customTodosTotal: customTodos.length,
    totalDone,
    totalItems,
    progressPercent: totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0,
  };
}

export interface HistorySummary {
  totalDays: number;
  totalDoneItems: number;
}

export function computeHistorySummary(
  historyGroups: DailyTodoHistory[],
): HistorySummary {
  const totalDays = historyGroups.length;
  const totalDoneItems = historyGroups.reduce(
    (sum, g) =>
      sum +
      g.planItems.filter(i => i.done).length +
      g.customTodos.filter(t => t.done).length,
    0,
  );
  return { totalDays, totalDoneItems };
}

export type HistoryItemType = 'plan' | 'custom';

export interface MergedHistoryItem {
  id: string;
  name: string;
  done: boolean;
  type: HistoryItemType;
  link: PlanItemLink;
}

export function mergeHistoryItems(
  historyEntry: DailyTodoHistory,
): MergedHistoryItem[] {
  return [
    ...historyEntry.planItems.map(i => ({
      id: i.id,
      name: i.name,
      done: i.done,
      type: 'plan' as const,
      link: i.link,
    })),
    ...historyEntry.customTodos.map(t => ({
      id: t.id,
      name: t.name,
      done: t.done,
      type: 'custom' as const,
      link: 'manual' as PlanItemLink,
    })),
  ];
}
