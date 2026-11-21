// ─── CheckinModal 纯函数提取 ────────────────────────────────────────
// 从 CheckinModal 提取的可测纯函数：useState lazy initializer（planToggles /
// habitCheckins）与 submit 的 noteData 装配协议。
// 字段顺序与赋值条件与原内联代码逐字一致——JSON.stringify 输出逐字节可比
// （apps/mobile/src/features/home/components/CheckinModal.tsx 原行号见注释）。
import type { DailyCustomTodo, Habit, Plan, PlanItem, PlanItemCheckin } from '@egoless-do/core';

/** planToggles lazy initializer（原 L81-92）：manual/reflection 类型支持手动切换，回填当日打卡状态 */
export function buildPlanToggles({ activePlan, planItems, planCheckins, targetDate }: {
  activePlan: Plan | null | undefined;
  planItems: PlanItem[];
  planCheckins: PlanItemCheckin[];
  targetDate: string;
}): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  if (!activePlan) return initial;
  const items = planItems.filter(i => !i.deleted && i.planId === activePlan.id);
  items.forEach(item => {
    // manual 和 reflection 类型支持手动切换
    if (item.link === 'manual' || item.link === 'reflection') {
      initial[item.id] = planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done);
    }
  });
  return initial;
}

/** habitCheckins lazy initializer（原 L107-113）：进行中习惯回填当日打卡状态 */
export function buildHabitCheckins({ habits, targetDate }: {
  habits: Habit[];
  targetDate: string;
}): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  habits.filter(h => !h.deleted && h.status === 'inProgress').forEach(h => {
    initial[h.id] = h.checkedDates?.includes(targetDate) ?? false;
  });
  return initial;
}

/**
 * submit 的 noteData 装配（原 L143-168）。字段序：
 * note → water（非 grace）→ practices → habits → customs → planItems →
 * food（非 grace）→ incompleteReason → incompleteNote。
 * 序列化后与 web 端 buildCheckinNote 同格式。
 */
export function buildCheckinNoteData({
  note, waterMl, isGraceMode, practices, habitCheckins, habits,
  dailyCustomTodos, todayPlanItems, planToggles, planCheckins,
  totalCal, reasonOverride, reasonNoteOverride, targetDate,
}: {
  note: string;
  waterMl: number;
  isGraceMode: boolean;
  practices: { sit: boolean; stand: boolean; chant: boolean };
  habitCheckins: Record<string, boolean>;
  habits: Habit[];
  dailyCustomTodos: DailyCustomTodo[];
  todayPlanItems: PlanItem[];
  planToggles: Record<string, boolean>;
  planCheckins: PlanItemCheckin[];
  totalCal: number;
  reasonOverride?: string;
  reasonNoteOverride?: string;
  targetDate: string;
}): Record<string, unknown> {
  const noteData: Record<string, unknown> = {};
  if (note) noteData.note = note;
  if (!isGraceMode && waterMl > 0) noteData.water = waterMl;
  const pr: string[] = [];
  if (practices.sit) pr.push('sit');
  if (practices.stand) pr.push('stand');
  if (practices.chant) pr.push('chant');
  if (pr.length) noteData.practices = pr;
  const checkedHabits = Object.entries(habitCheckins)
    .filter(([, checked]) => checked)
    .map(([id]) => habits.find(h => !h.deleted && h.id === id)?.name)
    .filter(Boolean);
  if (checkedHabits.length) noteData.habits = checkedHabits;
  // 每日自定义待办
  const doneCustomTodos = dailyCustomTodos
    .filter(t => t.done)
    .map(t => t.name);
  if (doneCustomTodos.length) noteData.customs = doneCustomTodos;
  // 计划事项
  const donePlanItems = todayPlanItems
    .filter(item => planToggles[item.id] ?? planCheckins.some(c => c.planItemId === item.id && c.date === targetDate && c.done))
    .map(item => item.name);
  if (donePlanItems.length) noteData.planItems = donePlanItems;
  if (!isGraceMode && totalCal > 0) noteData.food = totalCal;
  if (reasonOverride) noteData.incompleteReason = reasonOverride;
  if (reasonNoteOverride?.trim()) noteData.incompleteNote = reasonNoteOverride.trim();
  return noteData;
}
