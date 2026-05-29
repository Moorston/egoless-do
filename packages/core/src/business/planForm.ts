// ─── Plan form shared logic (used by both Mobile & Web) ──────
import type { PlanItemLink } from '../types';

/** Form state for a single plan item (used in create/edit screens). */
export interface ItemForm {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  contentUrl: string;
  link: PlanItemLink;
  linkConfig?: { habitId?: string; targetMinutes?: number; targetHours?: number };
}

/** Link type options for plan items. */
export const LINK_OPTIONS: { value: PlanItemLink; labelKey: string }[] = [
  { value: 'manual', labelKey: 'planLinkManual' },
  { value: 'checkin', labelKey: 'planLinkCheckin' },
  { value: 'fasting', labelKey: 'planLinkFasting' },
  { value: 'meditation', labelKey: 'planLinkMeditation' },
  { value: 'exercise', labelKey: 'planLinkExercise' },
  { value: 'habit', labelKey: 'planLinkHabit' },
];

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
    if (!item.startDate) e[`item_${idx}_startDate`] = T('planItemTimeError');
    if (!item.endDate) e[`item_${idx}_endDate`] = T('planItemTimeError');
    if (item.startDate && item.endDate && item.endDate <= item.startDate) e[`item_${idx}_endDate`] = T('planItemTimeOrderError');
    if (form.startDate && form.endDate) {
      if (item.startDate < form.startDate || item.endDate > form.endDate) e[`item_${idx}_startDate`] = T('planItemTimeError');
    }
  });
  return e;
}

/** Create a new empty ItemForm. */
export function createNewItem(planStartDate: string, planEndDate: string): ItemForm {
  return {
    id: `new_${Date.now()}`,
    name: '', description: '',
    startDate: planStartDate || '', endDate: planEndDate || '',
    contentUrl: '', link: 'manual',
  };
}
