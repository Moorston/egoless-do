import { describe, it, expect } from 'vitest';
import {
  getTodoItemStatus,
  getTodoItemStatusMap,
  computeDailyTodoStats,
  computeHistorySummary,
  mergeHistoryItems,
} from './planTodo';
import type { PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';

const makeItem = (id: string, link: string = 'manual'): PlanItem => ({
  id, planId: 'p1', name: `Task ${id}`, description: '',
  startDate: '2026-01-01', endDate: '2026-01-31',
  contentUrl: '', totalCheckinDays: 0, status: 'in_progress',
  progress: 0, link: link as any, priority: 'medium', targetMetric: '', order: 0,
  updatedAt: 0, deleted: false,
});

const makeCheckin = (planItemId: string, date: string, done: boolean, linkedModule?: string): PlanItemCheckin => ({
  id: `c-${planItemId}-${date}`, planItemId, date, done, linkedModule,
  updatedAt: 0, deleted: false,
});

const makeCustomTodo = (id: string, done: boolean): DailyCustomTodo => ({
  id, planId: 'p1', date: '2026-01-15', name: `Todo ${id}`, done, order: 0,
  updatedAt: 0, deleted: false,
});

const makeHistory = (date: string, planItems: any[], customTodos: any[]): DailyTodoHistory => ({
  id: `h-${date}`, planId: 'p1', date, planItems, customTodos,
  updatedAt: 0, deleted: false,
});

describe('getTodoItemStatus', () => {
  it('returns not done when no checkin exists', () => {
    const item = makeItem('i1');
    expect(getTodoItemStatus(item, [], '2026-01-15')).toEqual({ done: false, autoChecked: false });
  });

  it('returns done when checkin exists', () => {
    const item = makeItem('i1');
    const checkins = [makeCheckin('i1', '2026-01-15', true)];
    expect(getTodoItemStatus(item, checkins, '2026-01-15')).toEqual({ done: true, autoChecked: false, linkedModule: undefined });
  });

  it('returns autoChecked when linkedModule is set', () => {
    const item = makeItem('i1', 'meditation');
    const checkins = [makeCheckin('i1', '2026-01-15', true, 'meditation')];
    expect(getTodoItemStatus(item, checkins, '2026-01-15')).toEqual({ done: true, autoChecked: true, linkedModule: 'meditation' });
  });

  it('returns not done when checkin exists but done=false', () => {
    const item = makeItem('i1');
    const checkins = [makeCheckin('i1', '2026-01-15', false)];
    expect(getTodoItemStatus(item, checkins, '2026-01-15')).toEqual({ done: false, autoChecked: false });
  });
});

describe('getTodoItemStatusMap', () => {
  it('returns map for multiple items', () => {
    const items = [makeItem('i1'), makeItem('i2')];
    const checkins = [makeCheckin('i1', '2026-01-15', true)];
    const map = getTodoItemStatusMap(items, checkins, '2026-01-15');
    expect(map.get('i1')?.done).toBe(true);
    expect(map.get('i2')?.done).toBe(false);
  });
});

describe('computeDailyTodoStats', () => {
  it('computes correct stats for mixed items', () => {
    const planItems = [makeItem('i1'), makeItem('i2'), makeItem('i3')];
    const customTodos = [makeCustomTodo('t1', true), makeCustomTodo('t2', false)];
    const checkins = [makeCheckin('i1', '2026-01-15', true), makeCheckin('i2', '2026-01-15', true)];
    const stats = computeDailyTodoStats(planItems, customTodos, checkins, '2026-01-15');
    expect(stats.planItemsDone).toBe(2);
    expect(stats.planItemsTotal).toBe(3);
    expect(stats.customTodosDone).toBe(1);
    expect(stats.customTodosTotal).toBe(2);
    expect(stats.totalDone).toBe(3);
    expect(stats.totalItems).toBe(5);
    expect(stats.progressPercent).toBe(60);
  });

  it('returns 0% when no items exist', () => {
    const stats = computeDailyTodoStats([], [], [], '2026-01-15');
    expect(stats.progressPercent).toBe(0);
    expect(stats.totalItems).toBe(0);
  });

  it('returns 100% when all done', () => {
    const planItems = [makeItem('i1')];
    const checkins = [makeCheckin('i1', '2026-01-15', true)];
    const stats = computeDailyTodoStats(planItems, [], checkins, '2026-01-15');
    expect(stats.progressPercent).toBe(100);
  });
});

describe('computeHistorySummary', () => {
  it('sums done items across history groups', () => {
    const history = [
      makeHistory('2026-01-13', [{ done: true }, { done: false }], [{ done: true }]),
      makeHistory('2026-01-14', [{ done: true }], [{ done: false }]),
    ];
    const summary = computeHistorySummary(history);
    expect(summary.totalDays).toBe(2);
    expect(summary.totalDoneItems).toBe(3); // 1+1 + 1+0 = 3
  });

  it('returns zeros for empty history', () => {
    const summary = computeHistorySummary([]);
    expect(summary.totalDays).toBe(0);
    expect(summary.totalDoneItems).toBe(0);
  });
});

describe('mergeHistoryItems', () => {
  it('merges plan items and custom todos with correct types', () => {
    const entry = makeHistory('2026-01-15',
      [{ id: 'i1', name: 'Task 1', link: 'meditation', done: true }],
      [{ id: 't1', name: 'Todo 1', done: false }],
    );
    const merged = mergeHistoryItems(entry);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ id: 'i1', name: 'Task 1', done: true, type: 'plan', link: 'meditation' });
    expect(merged[1]).toEqual({ id: 't1', name: 'Todo 1', done: false, type: 'custom', link: 'manual' });
  });

  it('handles empty arrays', () => {
    const entry = makeHistory('2026-01-15', [], []);
    expect(mergeHistoryItems(entry)).toHaveLength(0);
  });
});
