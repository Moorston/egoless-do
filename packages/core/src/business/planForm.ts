// ─── Plan form shared logic (used by both Mobile & Web) ──────
import type { PlanItemLink, PlanItemPriority, CheckinFrequency } from '../types';

/** Form state for a single plan item (used in create/edit screens). */
export interface ItemForm {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  contentUrl: string;
  link: PlanItemLink;
  priority: PlanItemPriority;
  targetMetric: string;
  linkConfig?: { targetMinutes?: number; targetHours?: number; habitId?: string };
  frequency?: CheckinFrequency;
  tags?: string[];
}

/** Link type options for plan items. */
export const LINK_OPTIONS: { value: PlanItemLink; labelKey: string }[] = [
  { value: 'manual', labelKey: 'planLinkManual' },
  { value: 'fasting', labelKey: 'planLinkFasting' },
  { value: 'meditation', labelKey: 'planLinkMeditation' },
  { value: 'exercise', labelKey: 'planLinkExercise' },
  { value: 'reflection', labelKey: 'planLinkReflection' },
];

/** Priority options for plan items. */
export const PRIORITY_OPTIONS: { value: PlanItemPriority; labelKey: string; color: string }[] = [
  { value: 'high', labelKey: 'planPriorityHigh', color: '#FF4444' },
  { value: 'medium', labelKey: 'planPriorityMedium', color: '#FFAA00' },
  { value: 'low', labelKey: 'planPriorityLow', color: '#44AA44' },
];

/** Frequency mode options for plan items. */
export const FREQUENCY_OPTIONS: { mode: CheckinFrequency['mode']; labelKey: string }[] = [
  { mode: 'daily', labelKey: 'freqDaily' },
  { mode: 'interval', labelKey: 'freqInterval' },
  { mode: 'weekly', labelKey: 'freqWeekly' },
  { mode: 'weekly_fixed', labelKey: 'freqWeeklyFixed' },
  { mode: 'monthly', labelKey: 'freqMonthly' },
  { mode: 'monthly_fixed', labelKey: 'freqMonthlyFixed' },
];

/** Create a default frequency object for a given mode. */
export function createDefaultFrequency(mode: CheckinFrequency['mode']): CheckinFrequency {
  switch (mode) {
    case 'daily': return { mode: 'daily' };
    case 'interval': return { mode: 'interval', every: 3 };
    case 'weekly': return { mode: 'weekly', target: 3 };
    case 'weekly_fixed': return { mode: 'weekly_fixed', days: [1, 3, 5] };
    case 'monthly': return { mode: 'monthly', target: 10 };
    case 'monthly_fixed': return { mode: 'monthly_fixed', dates: [1, 15] };
  }
}

/** Validate plan form data. Returns a map of field → error message. */
export function validatePlanForm(
  form: { name: string; goal: string; startDate: string; endDate: string; items: ItemForm[] },
  T: (key: string) => string,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = T('planNameRequired');
  if (!form.goal.trim()) e.goal = T('planGoalRequired');
  if (!form.startDate) e.startDate = T('planTimeError');
  if (!form.endDate) e.endDate = T('planTimeError');
  if (form.startDate && form.endDate && form.endDate <= form.startDate) e.endDate = T('planTimeError');
  form.items.forEach((item, idx) => {
    if (!item.name.trim()) e[`item_${idx}_name`] = T('planNameRequired');
    if (!item.description.trim()) e[`item_${idx}_description`] = T('planItemDescRequired');
    if (!item.targetMetric.trim()) e[`item_${idx}_targetMetric`] = T('planItemTargetRequired');
    if (!item.startDate) e[`item_${idx}_startDate`] = T('planItemTimeError');
    if (!item.endDate) e[`item_${idx}_endDate`] = T('planItemTimeError');
    if (item.startDate && item.endDate && item.endDate <= item.startDate) e[`item_${idx}_endDate`] = T('planItemTimeOrderError');
    if (form.startDate && form.endDate) {
      if (item.startDate < form.startDate || item.endDate > form.endDate) e[`item_${idx}_startDate`] = T('planItemTimeError');
    }
  });
  return e;
}

let _newItemCounter = 0;

/** Create a new empty ItemForm. */
export function createNewItem(planStartDate: string, planEndDate: string): ItemForm {
  return {
    id: `new_${Date.now()}_${++_newItemCounter}`,
    name: '', description: '',
    startDate: planStartDate || '', endDate: planEndDate || '',
    contentUrl: '', link: 'manual', priority: 'medium', targetMetric: '',
    frequency: undefined,
  };
}
