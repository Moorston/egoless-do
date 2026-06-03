import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  getTodayItems, getTodayCustomTodos, getTodoHistory,
  getTodoItemStatusMap, computeDailyTodoStats, computeHistorySummary,
  mergeHistoryItems,
} from '@egoless-do/core';
import type { Plan } from '@egoless-do/core';

export function useDailyTodo(plan: Plan | undefined, today: string) {
  const store = useAppStore();
  const checkins = store.planItemCheckins ?? [];

  const todayItems = useMemo(() => {
    if (!plan) return [];
    return getTodayItems(store.planItems ?? [], plan, today);
  }, [store.planItems, plan, today]);

  const dailyCustomTodos = useMemo(() => {
    if (!plan) return [];
    return getTodayCustomTodos(store.dailyCustomTodos ?? [], plan.id, today);
  }, [store.dailyCustomTodos, plan, today]);

  const statusMap = useMemo(
    () => getTodoItemStatusMap(todayItems, checkins, today),
    [todayItems, checkins, today],
  );

  const stats = useMemo(
    () => computeDailyTodoStats(todayItems, dailyCustomTodos, checkins, today),
    [todayItems, dailyCustomTodos, checkins, today],
  );

  const historyGroups = useMemo(() => {
    if (!plan) return [];
    return getTodoHistory(store.dailyTodoHistory ?? [], plan.id, today);
  }, [store.dailyTodoHistory, plan, today]);

  const historySummary = useMemo(
    () => computeHistorySummary(historyGroups),
    [historyGroups],
  );

  const [showHistory, setShowHistory] = useState(true);
  const [newTodoName, setNewTodoName] = useState('');

  const toggleItem = (itemId: string) => {
    const status = statusMap.get(itemId);
    if (status?.done) store.uncheckinPlanItem(itemId);
    else store.checkinPlanItem(itemId);
  };

  const addCustomTodo = () => {
    if (newTodoName.trim() && plan) {
      store.addDailyCustomTodo(plan.id, newTodoName.trim());
      setNewTodoName('');
    }
  };

  const deleteCustomTodo = (id: string) => store.deleteDailyCustomTodo(id);
  const toggleCustomTodo = (id: string) => store.toggleDailyCustomTodo(id);

  return {
    todayItems,
    dailyCustomTodos,
    statusMap,
    stats,
    historyGroups,
    historySummary,
    showHistory, setShowHistory,
    newTodoName, setNewTodoName,
    toggleItem,
    addCustomTodo,
    deleteCustomTodo,
    toggleCustomTodo,
    mergeHistoryItems,
  };
}
