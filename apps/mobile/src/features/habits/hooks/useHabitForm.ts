// ─── useHabitForm: habit add/edit form state ─────────────────────
import { track } from '../../analytics/track';
import { Events } from '../../analytics/events';
import { activeOnly } from '@egoless-do/core';
import type { Habit, HabitLink } from '@egoless-do/core';
import { useState, useCallback } from 'react';

import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { requestNotificationPermission, rescheduleAllHabitReminders } from '../../notifications/NotificationService';

export interface HabitFormState {
  name: string;
  startDate: string;
  targetDays: number;
  goal: string;
  insight: string;
  createTag: boolean;
  alarmEnabled: boolean;
  alarmHour: number;
  alarmMinute: number;
  link: HabitLink;
  linkConfig: { targetHours?: number; targetMinutes?: number };
}

const emptyForm: HabitFormState = {
  name: '',
  startDate: '',  // will be set by caller using tomorrow()
  targetDays: 21,
  goal: '',
  insight: '',
  createTag: false,
  alarmEnabled: false,
  alarmHour: 8,
  alarmMinute: 0,
  link: 'none',
  linkConfig: {},
};

export function useHabitForm(defaultStartDate: string) {
  const { addHabit, updateHabit } = useShallowStore(s => ({
    addHabit: s.addHabit,
    updateHabit: s.updateHabit,
  }));

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormState>({ ...emptyForm, startDate: defaultStartDate });
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm, startDate: defaultStartDate });
    setShowAdd(true);
  }, [defaultStartDate]);

  const openEdit = useCallback((h: Habit) => {
    setEditingId(h.id);
    setForm({
      name: h.name,
      startDate: h.startDate,
      targetDays: h.targetDays,
      goal: h.goal,
      insight: h.insight,
      createTag: h.createTag,
      alarmEnabled: h.alarmEnabled,
      alarmHour: h.alarmHour,
      alarmMinute: h.alarmMinute,
      link: h.link ?? 'none',
      linkConfig: h.linkConfig ?? {},
    });
    setShowAdd(true);
  }, []);

  const saveHabit = useCallback(async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateHabit(editingId, { ...form, targetDays: +form.targetDays });
    } else {
      addHabit({ ...form, targetDays: +form.targetDays });
      // PostHog: 习惯创建
      track(Events.HABIT_CREATED, {
        habit_category: 'custom',
        target_days: +form.targetDays,
        has_alarm: form.alarmEnabled || false,
      });
    }
    setShowAdd(false);
    if (form.alarmEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        const habits = activeOnly(useAppStore.getState().habits ?? []) as Habit[];
        await rescheduleAllHabitReminders(habits).catch(() => {});
      }
    }
  }, [form, editingId, addHabit, updateHabit]);

  const closeForm = useCallback(() => setShowAdd(false), []);

  return {
    showAdd,
    editingId,
    form,
    setForm,
    showAlarmPicker,
    setShowAlarmPicker,
    openAdd,
    openEdit,
    saveHabit,
    closeForm,
  };
}
