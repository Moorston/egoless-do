// ─── checkinModalHelpers characterization tests ───────────────────
// 锁定 CheckinModal 提取出的三个纯函数的行为：字段序逐字节可比（snapshot +
// Object.keys 顺序）、grace 模式跳过 water/food、空字段整体省略。
// 提取自 CheckinModal.tsx 原 L81-92 / L107-113 / L143-168 内联代码——重构护航天。
import type { DailyCustomTodo, Habit, Plan, PlanItem, PlanItemCheckin } from '@egoless-do/core';
import { describe, it, expect } from 'vitest';

import { buildCheckinNoteData, buildHabitCheckins, buildPlanToggles } from './checkinModalHelpers';

const VIEW_DATE = '2026-11-03';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: '冥想', startDate: VIEW_DATE, targetDays: 30, goal: '', insight: '',
    createTag: false, doneDays: 0, streak: 0, interrupted: 0, status: 'inProgress',
    checkedDates: [], pauseReason: '', abandonReason: '', alarmEnabled: false, alarmHour: 7,
    alarmMinute: 0, link: 'none', updatedAt: 0, deleted: false, ...overrides,
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

/** 全字段 base 输入（buildCheckinNoteData 的 14 项全集） */
function fullInput() {
  return {
    note: '心得',
    waterMl: 500,
    isGraceMode: false,
    practices: { sit: true, stand: true, chant: false },
    habitCheckins: { h1: true, h2: false },
    habits: [habit(), habit({ id: 'h2', name: '运动' })],
    dailyCustomTodos: [customTodo({ done: true }), customTodo({ id: 'ct2', name: '浇花', done: false })],
    todayPlanItems: [planItem(), planItem({ id: 'pi2', name: '拜佛' })],
    planToggles: { pi1: true, pi2: false } as Record<string, boolean>,
    planCheckins: [planItemCheckin()],
    totalCal: 300,
    reasonOverride: 'sick',
    reasonNoteOverride: '  身体不适  ',
    targetDate: VIEW_DATE,
  };
}

describe('buildCheckinNoteData — 装配协议锁定', () => {
  it('全字段输出与字段序快照锁定（逐字节可比）', () => {
    const out = buildCheckinNoteData(fullInput());
    expect(JSON.stringify(out)).toMatchInlineSnapshot(
      `"{"note":"心得","water":500,"practices":["sit","stand"],"habits":["冥想"],"customs":["扫地"],"planItems":["读经"],"food":300,"incompleteReason":"sick","incompleteNote":"身体不适"}"`
    );
    // 字段序逐字（最高危：noteData 漂移写坏数据）
    expect(Object.keys(out)).toEqual([
      'note', 'water', 'practices', 'habits', 'customs', 'planItems', 'food',
      'incompleteReason', 'incompleteNote',
    ]);
  });

  it('grace 模式跳过 water/food（其余字段保留）', () => {
    const out = buildCheckinNoteData({ ...fullInput(), isGraceMode: true });
    expect(out.water).toBeUndefined();
    expect(out.food).toBeUndefined();
    expect(out.note).toBe('心得');
    expect(out.practices).toEqual(['sit', 'stand']);
  });

  it('空输入整体省略（不产 null/空数组占位）', () => {
    const out = buildCheckinNoteData({
      note: '', waterMl: 0, isGraceMode: false,
      practices: { sit: false, stand: false, chant: false },
      habitCheckins: {}, habits: [], dailyCustomTodos: [], todayPlanItems: [],
      planToggles: {}, planCheckins: [], totalCal: 0, targetDate: VIEW_DATE,
    });
    expect(Object.keys(out)).toEqual([]);
  });

  it('practices 三项组合只含真值', () => {
    const out = buildCheckinNoteData({
      ...fullInput(), practices: { sit: false, stand: false, chant: true },
    });
    expect(out.practices).toEqual(['chant']);
  });

  it('customs/planItems 键名与内容（多选中只含完成项）', () => {
    const out = buildCheckinNoteData(fullInput());
    expect(out.customs).toEqual(['扫地']);
    expect(out.planItems).toEqual(['读经']);
  });

  it('planItems 回退查证：planToggles 缺失时以当日打卡状态为准', () => {
    // pi1 无 toggle 记录，但当日打卡 done → 计入
    const out = buildCheckinNoteData({
      ...fullInput(),
      planToggles: {},
      planCheckins: [planItemCheckin({ done: true, date: VIEW_DATE })],
    });
    expect(out.planItems).toEqual(['读经']);
  });

  it('reasonNote 去首尾空白后才写入', () => {
    const out = buildCheckinNoteData({ ...fullInput(), reasonNoteOverride: '  累  ' });
    expect(out.incompleteNote).toBe('累');
  });

  it('reasonOverride 空 / reasonNoteOverride 空白时省略两字段', () => {
    const out = buildCheckinNoteData({ ...fullInput(), reasonOverride: undefined, reasonNoteOverride: '   ' });
    expect(out.incompleteReason).toBeUndefined();
    expect(out.incompleteNote).toBeUndefined();
  });
});

describe('buildPlanToggles — lazy initializer', () => {
  it('activePlan 为空返回空对象', () => {
    expect(buildPlanToggles({ activePlan: undefined, planItems: [planItem()], planCheckins: [], targetDate: VIEW_DATE }))
      .toEqual({});
    expect(buildPlanToggles({ activePlan: null, planItems: [planItem()], planCheckins: [], targetDate: VIEW_DATE }))
      .toEqual({});
  });

  it('manual/reflection 类型回填当日打卡状态；其他 link 不进表', () => {
    const items = [
      planItem(),
      planItem({ id: 'pi-auto', name: '自动', link: 'checkin' }),
      planItem({ id: 'pi-ref', name: '反思', link: 'reflection' }),
    ];
    const checkins = [planItemCheckin({ planItemId: 'pi-ref', done: true })];
    const out = buildPlanToggles({ activePlan: plan(), planItems: items, planCheckins: checkins, targetDate: VIEW_DATE });
    expect(out).toEqual({ pi1: false, 'pi-ref': true });
  });

  it('非本计划（planId 不匹配）与已删除项不进表', () => {
    const items = [
      planItem(),
      planItem({ id: 'pi-other', planId: 'p2', name: '他计划' }),
      planItem({ id: 'pi-del', deleted: true }),
    ];
    const out = buildPlanToggles({ activePlan: plan(), planItems: items, planCheckins: [], targetDate: VIEW_DATE });
    expect(out).toEqual({ pi1: false });
  });

  it('打卡记录的日期不匹配时不回填 done', () => {
    const checkins = [planItemCheckin({ done: true, date: '2026-11-02' })];
    const out = buildPlanToggles({ activePlan: plan(), planItems: [planItem()], planCheckins: checkins, targetDate: VIEW_DATE });
    expect(out).toEqual({ pi1: false });
  });
});

describe('buildHabitCheckins — lazy initializer', () => {
  it('进行中习惯回填当日打卡状态', () => {
    const habits = [
      habit(),
      habit({ id: 'h2', name: '运动', checkedDates: [VIEW_DATE] }),
    ];
    expect(buildHabitCheckins({ habits, targetDate: VIEW_DATE })).toEqual({ h1: false, h2: true });
  });

  it('已完成/已删除习惯不进表', () => {
    const habits = [
      habit(),
      habit({ id: 'h-done', status: 'completed' }),
      habit({ id: 'h-del', deleted: true }),
    ];
    expect(buildHabitCheckins({ habits, targetDate: VIEW_DATE })).toEqual({ h1: false });
  });

  it('checkedDates 为 undefined 时回填 false（?? 防御）', () => {
    const habits = [habit({ id: 'h-nodate', checkedDates: undefined })];
    expect(buildHabitCheckins({ habits, targetDate: VIEW_DATE })).toEqual({ 'h-nodate': false });
  });
});
