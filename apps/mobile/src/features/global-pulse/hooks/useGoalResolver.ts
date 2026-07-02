/**
 * 目标解析 Hook
 * 从计划任务/习惯中解析当前活动的目标文本
 */

import { useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { CheckinType } from '@egoless-do/core';

export function useGoalResolver() {
  const planItems = useAppStore(s => s.planItems);
  const habits = useAppStore(s => s.habits);

  const resolveGoal = useCallback((activityType: CheckinType): string | null => {
    // 查找匹配类型的进行中计划项
    const matchingItem = planItems.find(
      pi => pi.link === activityType && pi.status === 'in_progress'
    );

    if (!matchingItem) return null;

    // 如果关联了习惯，取习惯的目标
    if (matchingItem.linkConfig?.habitId) {
      const habit = habits.find(h => h.id === matchingItem.linkConfig!.habitId);
      if (habit) {
        return habit.goal || habit.name || null;
      }
    }

    // 否则取计划项名称
    return matchingItem.name || null;
  }, [planItems, habits]);

  return { resolveGoal };
}
