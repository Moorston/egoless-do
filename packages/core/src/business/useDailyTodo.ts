// ─── useDailyTodo hook factory (shared between mobile & web) ────
import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';
import { getTodayItems, getTodayCustomTodos, getTodoHistory } from './plan';
import { getTodoItemStatusMap, computeDailyTodoStats, computeHistorySummary, mergeHistoryItems } from './planTodo';

const EMPTY_ARR: never[] = [];

/** Store slice required by useDailyTodo. */
export interface DailyTodoStoreSlice {
  planItems: PlanItem[] | null;
  planItemCheckins: PlanItemCheckin[] | null;
  dailyCustomTodos: DailyCustomTodo[] | null;
  dailyTodoHistory: DailyTodoHistory[] | null;
  checkinPlanItem: (planItemId: string) => void;
  uncheckinPlanItem: (planItemId: string) => void;
  addDailyCustomTodo: (planId: string, name: string, date?: string, recurring?: boolean) => void;
  deleteDailyCustomTodo: (id: string) => void;
  toggleDailyCustomTodo: (id: string) => void;
}

/** React-like interface for hooks (avoids hard React dependency in core). */
export interface ReactLike {
  useMemo: <T>(factory: () => T, deps: readonly unknown[]) => T;
  useState: <T>(initial: T | (() => T)) => [T, (v: T | ((prev: T) => T)) => void];
  // any: mirrors React's useCallback generic signature; narrowing to unknown[] would lose the concrete callback type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]) => T;
}

/**
 * Factory that creates a platform-specific useDailyTodo hook.
 * Usage: const useDailyTodo = createDailyTodoHook(React, useAppStore);
 */
export function createDailyTodoHook(
  react: ReactLike,
  useStore: () => DailyTodoStoreSlice,
) {
  return function useDailyTodo(plan: Plan | undefined, today: string) {
    const store = useStore();
    const checkins = (store.planItemCheckins ?? EMPTY_ARR) as PlanItemCheckin[];

    const todayItems = react.useMemo(() => {
      if (!plan) return EMPTY_ARR as PlanItem[];
      return getTodayItems((store.planItems ?? EMPTY_ARR) as PlanItem[], plan, today, checkins);
    }, [store.planItems, plan, today, checkins]);

    const dailyCustomTodos = react.useMemo(() => {
      if (!plan) return EMPTY_ARR as DailyCustomTodo[];
      return getTodayCustomTodos((store.dailyCustomTodos ?? EMPTY_ARR) as DailyCustomTodo[], plan.id, today);
    }, [store.dailyCustomTodos, plan, today]);

    const statusMap = react.useMemo(
      () => getTodoItemStatusMap(todayItems, checkins, today),
      [todayItems, checkins, today],
    );

    const stats = react.useMemo(
      () => computeDailyTodoStats(todayItems, dailyCustomTodos, checkins, today),
      [todayItems, dailyCustomTodos, checkins, today],
    );

    const historyGroups = react.useMemo(() => {
      if (!plan) return EMPTY_ARR as DailyTodoHistory[];
      return getTodoHistory((store.dailyTodoHistory ?? EMPTY_ARR) as DailyTodoHistory[], plan.id, today);
    }, [store.dailyTodoHistory, plan, today]);

    const historySummary = react.useMemo(
      () => computeHistorySummary(historyGroups),
      [historyGroups],
    );

    const [showHistory, setShowHistory] = react.useState(true);
    const [newTodoName, setNewTodoName] = react.useState('');
    const [newTodoRecurring, setNewTodoRecurring] = react.useState(false);

    const toggleItem = react.useCallback((itemId: string) => {
      const status = statusMap.get(itemId);
      if (status?.done) store.uncheckinPlanItem(itemId);
      else store.checkinPlanItem(itemId);
    }, [statusMap, store.checkinPlanItem, store.uncheckinPlanItem]);

    const addCustomTodo = react.useCallback(() => {
      if (newTodoName.trim() && plan) {
        store.addDailyCustomTodo(plan.id, newTodoName.trim(), undefined, newTodoRecurring);
        setNewTodoName('');
        setNewTodoRecurring(false);
      }
    }, [newTodoName, newTodoRecurring, plan, store.addDailyCustomTodo, setNewTodoName, setNewTodoRecurring]);

    const deleteCustomTodo = react.useCallback((id: string) => store.deleteDailyCustomTodo(id), [store.deleteDailyCustomTodo]);
    const toggleCustomTodo = react.useCallback((id: string) => store.toggleDailyCustomTodo(id), [store.toggleDailyCustomTodo]);

    return {
      todayItems,
      dailyCustomTodos,
      statusMap,
      stats,
      historyGroups,
      historySummary,
      showHistory, setShowHistory,
      newTodoName, setNewTodoName,
      newTodoRecurring, setNewTodoRecurring,
      toggleItem,
      addCustomTodo,
      deleteCustomTodo,
      toggleCustomTodo,
      mergeHistoryItems,
    };
  };
}
