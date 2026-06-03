import { performDailyReset } from '../business/plan';
import type { Plan, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';

describe('performDailyReset', () => {
  const basePlan: Plan = {
    id: 'plan-1',
    name: '测试计划',
    goal: '测试目标',
    slogan: '',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    status: 'in_progress',
    progress: 0,
    updatedAt: Date.now(),
    deleted: false,
  };

  const basePlanItem: PlanItem = {
    id: 'item-1',
    planId: 'plan-1',
    name: '任务1',
    description: '',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    contentUrl: '',
    totalCheckinDays: 0,
    status: 'in_progress',
    progress: 0,
    link: 'manual',
    priority: 'medium',
    targetMetric: '',
    order: 0,
    updatedAt: Date.now(),
    deleted: false,
  };

  const notStartedItem: PlanItem = {
    id: 'item-2',
    planId: 'plan-1',
    name: '任务2（未开始）',
    description: '',
    startDate: '2026-06-05',
    endDate: '2026-06-30',
    contentUrl: '',
    totalCheckinDays: 0,
    status: 'not_started',
    progress: 0,
    link: 'manual',
    priority: 'medium',
    targetMetric: '',
    order: 1,
    updatedAt: Date.now(),
    deleted: false,
  };

  it('应该自动启动到期的任务', () => {
    const plans = [basePlan];
    const planItems = [basePlanItem, notStartedItem];
    const checkins: PlanItemCheckin[] = [];
    const customTodos: DailyCustomTodo[] = [];
    const history: DailyTodoHistory[] = [];

    // 模拟日期从 6月4日 变为 6月5日
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-04', '2026-06-05'
    );

    // 任务2 应该从 not_started 变为 in_progress
    const updatedItem2 = result.planItems.find(i => i.id === 'item-2');
    expect(updatedItem2?.status).toBe('in_progress');
  });

  it('不应该启动未到期的任务', () => {
    const plans = [basePlan];
    const planItems = [basePlanItem, notStartedItem];
    const checkins: PlanItemCheckin[] = [];
    const customTodos: DailyCustomTodo[] = [];
    const history: DailyTodoHistory[] = [];

    // 模拟日期从 6月3日 变为 6月4日（任务2的开始日期是6月5日）
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-03', '2026-06-04'
    );

    // 任务2 应该保持 not_started 状态
    const updatedItem2 = result.planItems.find(i => i.id === 'item-2');
    expect(updatedItem2?.status).toBe('not_started');
  });

  it('应该保存前一天的待办历史', () => {
    const plans = [basePlan];
    const planItems = [basePlanItem];
    const checkins: PlanItemCheckin[] = [
      {
        id: 'checkin-1',
        planItemId: 'item-1',
        date: '2026-06-04',
        done: true,
        updatedAt: Date.now(),
        deleted: false,
      },
    ];
    const customTodos: DailyCustomTodo[] = [
      {
        id: 'todo-1',
        planId: 'plan-1',
        date: '2026-06-04',
        name: '自定义待办1',
        done: true,
        order: 0,
        updatedAt: Date.now(),
        deleted: false,
      },
    ];
    const history: DailyTodoHistory[] = [];

    // 模拟日期从 6月4日 变为 6月5日
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-04', '2026-06-05'
    );

    // 应该生成 6月4日 的历史记录
    expect(result.dailyTodoHistory.length).toBe(1);
    const historyEntry = result.dailyTodoHistory[0];
    expect(historyEntry.date).toBe('2026-06-04');
    expect(historyEntry.planId).toBe('plan-1');

    // 验证计划任务历史
    expect(historyEntry.planItems.length).toBe(1);
    expect(historyEntry.planItems[0].name).toBe('任务1');
    expect(historyEntry.planItems[0].done).toBe(true);

    // 验证自定义待办历史
    expect(historyEntry.customTodos.length).toBe(1);
    expect(historyEntry.customTodos[0].name).toBe('自定义待办1');
    expect(historyEntry.customTodos[0].done).toBe(true);
  });

  it('不应该重复保存已存在的历史记录', () => {
    const plans = [basePlan];
    const planItems = [basePlanItem];
    const checkins: PlanItemCheckin[] = [];
    const customTodos: DailyCustomTodo[] = [];
    const history: DailyTodoHistory[] = [
      {
        id: 'history-1',
        planId: 'plan-1',
        date: '2026-06-04',
        planItems: [{ id: 'item-1', name: '任务1', link: 'manual', done: false }],
        customTodos: [],
        updatedAt: Date.now(),
        deleted: false,
      },
    ];

    // 模拟日期从 6月4日 变为 6月5日
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-04', '2026-06-05'
    );

    // 历史记录数量应该保持不变
    expect(result.dailyTodoHistory.length).toBe(1);
    expect(result.dailyTodoHistory[0].id).toBe('history-1');
  });

  it('应该标记已过期的任务为 delayed', () => {
    const plans = [basePlan];
    const expiredItem: PlanItem = {
      ...basePlanItem,
      endDate: '2026-06-03',
    };
    const planItems = [expiredItem];
    const checkins: PlanItemCheckin[] = [];
    const customTodos: DailyCustomTodo[] = [];
    const history: DailyTodoHistory[] = [];

    // 模拟日期从 6月3日 变为 6月4日
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-03', '2026-06-04'
    );

    // 任务应该被标记为 delayed
    const updatedItem = result.planItems.find(i => i.id === 'item-1');
    expect(updatedItem?.status).toBe('delayed');
  });

  it('应该返回 hasChanges 标志', () => {
    const plans = [basePlan];
    const planItems = [basePlanItem, notStartedItem];
    const checkins: PlanItemCheckin[] = [];
    const customTodos: DailyCustomTodo[] = [];
    const history: DailyTodoHistory[] = [];

    // 模拟日期从 6月4日 变为 6月5日（任务2应该被启动）
    const result = performDailyReset(
      plans, planItems, checkins, customTodos, history,
      '2026-06-04', '2026-06-05'
    );

    expect(result.hasChanges).toBe(true);
  });
});
