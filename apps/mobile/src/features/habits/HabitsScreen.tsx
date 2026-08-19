import { FONT_BUTTON, tomorrow } from '@egoless-do/core';
import type { Habit } from '@egoless-do/core';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, ScreenHeader, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import type { RootStackParamList } from '../../navigation/types';
import {useShallowStore} from '../../store/useAppStore';

import HabitActionMenu from './components/HabitActionMenu';
import HabitCalendarModal from './components/HabitCalendarModal';
import HabitCard from './components/HabitCard';
import HabitDeleteConfirmModal from './components/HabitDeleteConfirmModal';
import HabitEmptyState from './components/HabitEmptyState';
import HabitFilterBar from './components/HabitFilterBar';
import HabitFormModal from './components/HabitFormModal';
import HabitStatusReasonModal from './components/HabitStatusReasonModal';
import { STATUS_ORDER } from './constants';
import { useHabitActions } from './hooks/useHabitActions';
import { useHabitForm } from './hooks/useHabitForm';

export default function HabitsScreen() {
  const TH = useTheme();
  const P = TH.primary;
  const T = useT();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { habits, checkHabitAutoStatus, autoSyncHabits, checkinHabit } = useShallowStore(s => ({
    habits: s.habits,
    checkHabitAutoStatus: s.checkHabitAutoStatus,
    autoSyncHabits: s.autoSyncHabits,
    checkinHabit: s.checkinHabit,
  }));

  const [filter, setFilter] = useState('all');
  const [showCal, setShowCal] = useState<string | null>(null);

  const formState = useHabitForm(tomorrow());
  const actionState = useHabitActions();

  useEffect(() => {
    checkHabitAutoStatus();
    autoSyncHabits?.();
  }, [checkHabitAutoStatus, autoSyncHabits]);

  const allHabits = useMemo(() => (habits ?? []).filter(h => !h.deleted), [habits]);

  const filtered = useMemo(() =>
    (filter === 'all' ? allHabits : allHabits.filter(h => h.status === filter))
      .slice().sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((b.startDate ?? '').localeCompare(a.startDate ?? ''))),
    [allHabits, filter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allHabits.length };
    allHabits.forEach(h => { counts[h.status] = (counts[h.status] || 0) + 1; });
    return counts;
  }, [allHabits]);

  const calHabit = useMemo(() => (habits ?? []).find(h => h.id === showCal && !h.deleted), [habits, showCal]);

  const handleViewDetail = useCallback((h: Habit) => nav.navigate('HabitDetail', { habitId: h.id }), [nav]);
  const handleCalendar = useCallback((id: string) => setShowCal(id), []);

  const renderHabitItem = useCallback(({ item: h }: { item: Habit }) => (
    <HabitCard
      habit={h}
      primaryColor={P}
      onPress={handleViewDetail}
      onLongPress={actionState.setActionMenuHabit}
      onCheckin={checkinHabit}
      onStart={(id) => actionState.changeStatus(id, 'inProgress')}
      onCalendar={handleCalendar}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  ), [P, handleViewDetail, actionState.setActionMenuHabit, checkinHabit, actionState.changeStatus, handleCalendar]);

  const keyExtractor = useCallback((h: Habit) => h.id, []);

  const ListHeader = useMemo(() => (
    <>
      <ScreenHeader title={T('habitTitle')} compact
        right={
          <TouchableOpacity onPress={formState.openAdd}
            style={{ backgroundColor: P, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>+ {T('habitAdd')}</Text>
          </TouchableOpacity>
        }
      />
      <HabitFilterBar filter={filter} filterCounts={filterCounts} primaryColor={P} onChangeFilter={setFilter} />
    </>
  ), [T, P, filter, filterCounts, formState.openAdd]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Habits" />
      <FlatList
        data={filtered}
        renderItem={renderHabitItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        removeClippedSubviews={true}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<HabitEmptyState primaryColor={P} onCreate={formState.openAdd} />}
      />

      <HabitFormModal
        visible={formState.showAdd}
        editingId={formState.editingId}
        form={formState.form}
        setForm={formState.setForm}
        showAlarmPicker={formState.showAlarmPicker}
        setShowAlarmPicker={formState.setShowAlarmPicker}
        onSave={formState.saveHabit}
        onClose={formState.closeForm}
      />

      <HabitActionMenu
        habit={actionState.actionMenuHabit}
        onClose={actionState.closeActionMenu}
        onViewDetail={handleViewDetail}
        onStart={(id) => actionState.changeStatus(id, 'inProgress')}
        onEdit={(h) => { formState.openEdit(h); actionState.closeActionMenu(); }}
        onPause={(id) => actionState.changeStatus(id, 'paused')}
        onResume={(id) => actionState.changeStatus(id, 'inProgress')}
        onAbandon={(id) => actionState.changeStatus(id, 'abandoned')}
        onDelete={(id) => { actionState.setConfirmDelete(id); actionState.closeActionMenu(); }}
      />

      <HabitStatusReasonModal
        visible={!!actionState.statusModal}
        status={actionState.statusModal?.ns ?? null}
        reason={actionState.reason}
        onChangeReason={actionState.setReason}
        onConfirm={actionState.confirmStatus}
        onClose={actionState.closeStatusModal}
      />

      <HabitDeleteConfirmModal
        visible={!!actionState.confirmDelete}
        onConfirm={actionState.executeDelete}
        onClose={actionState.closeDeleteConfirm}
      />

      <HabitCalendarModal
        visible={!!showCal}
        habitName={calHabit?.name ?? ''}
        checkedDates={calHabit?.checkedDates ?? []}
        primaryColor={P}
        onClose={() => setShowCal(null)}
      />
    </SafeAreaView>
  );
}
