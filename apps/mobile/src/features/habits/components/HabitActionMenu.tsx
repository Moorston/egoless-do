// ─── HabitActionMenu: long-press action sheet ────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BUTTON } from '@egoless-do/core';
import { COLORS } from '@egoless-do/core';
import type { Habit } from '@egoless-do/core';

interface Props {
  habit: Habit | null;
  onClose: () => void;
  onViewDetail: (h: Habit) => void;
  onStart: (id: string) => void;
  onEdit: (h: Habit) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onAbandon: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HabitActionMenu({
  habit, onClose, onViewDetail, onStart, onEdit,
  onPause, onResume, onAbandon, onDelete,
}: Props) {
  const TH = useTheme();
  const P = TH.primary;
  const T = useT();

  const btn = (label: string, color: string, bg: string, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={{
        marginHorizontal: 16, marginBottom: 12, paddingVertical: 14,
        borderRadius: 12, backgroundColor: bg, alignItems: 'center',
      }}
    >
      <Text style={{ color, fontSize: FONT_BUTTON, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={!!habit} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}
      >
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: 40, paddingTop: 20,
        }}>
          <View style={{
            width: 40, height: 4, borderRadius: 2,
            backgroundColor: TH.border, alignSelf: 'center', marginBottom: 20,
          }} />
          {btn(T('habitViewDetail'), '#3B82F6', 'rgba(59,130,246,.15)', () => {
            if (habit) onViewDetail(habit);
            onClose();
          })}
          {habit?.status === 'notStarted' && btn(T('habitStartBtn'), '#fff', COLORS.GREEN, () => {
            if (habit) onStart(habit.id);
            onClose();
          })}
          {(habit?.status === 'notStarted' || habit?.status === 'inProgress') && btn(T('habitEdit'), '#fff', P, () => {
            if (habit) onEdit(habit);
            onClose();
          })}
          {habit?.status === 'inProgress' && btn(T('habitPauseBtn'), COLORS.YELLOW, 'rgba(255,193,7,.15)', () => {
            if (habit) onPause(habit.id);
            onClose();
          })}
          {habit?.status === 'paused' && btn(T('habitResumeBtn'), '#fff', COLORS.GREEN, () => {
            if (habit) onResume(habit.id);
            onClose();
          })}
          {habit?.status === 'paused' && btn(T('habitAbandonBtn'), COLORS.RED, 'rgba(239,68,68,.15)', () => {
            if (habit) onAbandon(habit.id);
            onClose();
          })}
          {(habit?.status === 'notStarted' || habit?.status === 'abandoned') && btn(T('habitDelete'), COLORS.RED, 'rgba(239,68,68,.15)', () => {
            onDelete(habit?.id ?? '');
            onClose();
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
