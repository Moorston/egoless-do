// ─── buildCheckinNote characterization tests ─────────────────────
// Proves the function reads `state` param directly (pure, no caching/async),
// so passing `useAppStore.getState()` synchronously after a mutation reflects
// the mutation — no setTimeout delay needed. See openspec/changes/dedupe-home-realtime-save.
import type { DailyCustomTodo, Habit, Plan, PlanItem, PlanItemCheckin } from '@egoless-do/core';
import { describe, it, expect } from 'vitest';

import { buildCheckinNote } from './buildCheckinNote';


const VIEW_DATE = '2026-11-03';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: '冥想', startDate: VIEW_DATE, targetDays: 30, goal: '', insight: '',
    createTag: false, doneDays: 0, streak: 0, interrupted: 0, status: 'inProgress',
    checkedDates: [], pauseReason: '', updatedAt: 0, deleted: false, ...overrides,
  };
}

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'p1', name: '计划', goal: '', slogan: '', startDate: VIEW_DATE, endDate: '2026-12-31',
    status: 'in_progress', progress: 0, updatedAt: 0, deleted: false, ...overrides,
  };
}

function planItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'pi1', planId: 'p1', name: '读经', description: '', startDate: VIEW_DATE, endDate: '2026-12-31',
    contentUrl: '', totalCheckinDays: 0, status: 'in_progress', progress: 0, link: 'manual',
    priority: 'medium', targetMetric: '', order: 0, updatedAt: 0, deleted: false, ...overrides,
  };
}

function planItemCheckin(overrides: Partial<PlanItemCheckin> = {}): PlanItemCheckin {
  return { id: 'pic1', planItemId: 'pi1', date: VIEW_DATE, done: false, updatedAt: 0, deleted: false, ...overrides };
}

function customTodo(overrides: Partial<DailyCustomTodo> = {}): DailyCustomTodo {
  return { id: 'ct1', planId: 'p1', date: VIEW_DATE, name: '扫地', done: false, order: 0, updatedAt: 0, deleted: false, ...overrides };
}

const baseView = { note: '', totalCal: 0, viewDate: VIEW_DATE };

/** Parse buildCheckinNote output as a typed record (avoids `any` member access). */
function parseNote(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

describe('buildCheckinNote — purity / synchronous freshness', () => {
  it('reads habit checked state directly (no caching)', () => {
    const uncheckedState = { waterMl: 0, habits: [habit()], plans: [plan()], planItems: [], planItemCheckins: [], dailyCustomTodos: [] };
    // Before toggle: habit not checked → no habits field
    const before = parseNote(buildCheckinNote(uncheckedState, baseView));
    expect(before.habits).toBeUndefined();

    // After toggle: same habit object but checkedDates includes viewDate
    const checkedState = { ...uncheckedState, habits: [habit({ checkedDates: [VIEW_DATE] })] };
    const after = parseNote(buildCheckinNote(checkedState, baseView));
    expect(after.habits).toEqual(['冥想']);
  });

  it('reads waterMl directly', () => {
    const noWater = { waterMl: 0, habits: [], plans: [], planItems: [], planItemCheckins: [], dailyCustomTodos: [] };
    expect(parseNote(buildCheckinNote(noWater, baseView)).water).toBeUndefined();

    const withWater = { ...noWater, waterMl: 500 };
    expect(parseNote(buildCheckinNote(withWater, baseView)).water).toBe(500);
  });

  it('reads plan item checkin done state directly', () => {
    const state = {
      waterMl: 0, habits: [], plans: [plan()], planItems: [planItem()],
      planItemCheckins: [] as PlanItemCheckin[], dailyCustomTodos: [],
    };
    // Not done → no planItems field
    expect(parseNote(buildCheckinNote(state, baseView)).planItems).toBeUndefined();

    // Done → planItems contains item name
    const doneState = { ...state, planItemCheckins: [planItemCheckin({ done: true })] };
    expect(parseNote(buildCheckinNote(doneState, baseView)).planItems).toEqual(['读经']);
  });

  it('reads custom todo done state directly', () => {
    const state = {
      waterMl: 0, habits: [], plans: [plan()], planItems: [], planItemCheckins: [],
      dailyCustomTodos: [customTodo({ done: false })],
    };
    expect(parseNote(buildCheckinNote(state, baseView)).customs).toBeUndefined();

    const doneState = { ...state, dailyCustomTodos: [customTodo({ done: true })] };
    expect(parseNote(buildCheckinNote(doneState, baseView)).customs).toEqual(['扫地']);
  });

  it('reads note and totalCal from view', () => {
    const state = { waterMl: 0, habits: [], plans: [], planItems: [], planItemCheckins: [], dailyCustomTodos: [] };
    const out = parseNote(buildCheckinNote(state, { note: '心得', totalCal: 300, viewDate: VIEW_DATE }));
    expect(out.note).toBe('心得');
    expect(out.food).toBe(300);
  });

  it('omits empty fields entirely (not null)', () => {
    const state = { waterMl: 0, habits: [], plans: [], planItems: [], planItemCheckins: [], dailyCustomTodos: [] };
    const out = parseNote(buildCheckinNote(state, baseView));
    expect(Object.keys(out)).toEqual([]);
  });

  it('two calls with same state are identical (deterministic)', () => {
    const state = { waterMl: 200, habits: [habit({ checkedDates: [VIEW_DATE] })], plans: [plan()], planItems: [], planItemCheckins: [], dailyCustomTodos: [] };
    const a = buildCheckinNote(state, baseView);
    const b = buildCheckinNote(state, baseView);
    expect(a).toBe(b);
  });
});
