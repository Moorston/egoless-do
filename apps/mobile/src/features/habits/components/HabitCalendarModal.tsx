// ─── HabitCalendarModal: calendar modal wrapping CalendarGrid ────
import { FONT_TITLE } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import CalendarGrid from '../../../components/charts/CalendarGrid';

interface Props {
  visible: boolean;
  habitName: string;
  checkedDates: string[];
  primaryColor: string;
  onClose: () => void;
}

export default function HabitCalendarModal({
  visible, habitName, checkedDates, primaryColor, onClose,
}: Props) {
  const TH = useTheme();
  const T = useT();

  const history = (checkedDates ?? []).map(d => ({ date: d, done: true }));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, maxHeight: '80%',
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text }}>
              {T('habitCalendar')} — {habitName}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={26} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <CalendarGrid
            history={history}
            primaryColor={primaryColor}
            textColor={TH.text}
            subColor={TH.sub}
            borderColor={TH.border}
          />
        </View>
      </View>
    </Modal>
  );
}
