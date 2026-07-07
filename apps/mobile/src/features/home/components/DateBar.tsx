import { FONT_BODY, dateStr, addDays, formatDateBar } from '@egoless-do/core';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  viewDate: string;
  onNavigate: (date: string) => void;
}

export default function DateBar({ viewDate, onNavigate }: Props) {
  const TH = useTheme();
  const T = useT();
  const isToday = viewDate === dateStr();

  if (isToday) return null;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      height: 48, backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 12,
      marginBottom: 12, borderBottomWidth: 1, borderBottomColor: TH.border,
    }}>
      <TouchableOpacity
        onPress={() => onNavigate(addDays(viewDate, -1))}
        style={{ padding: 6 }}
        activeOpacity={0.6}
      >
        <ChevronLeft size={20} color={TH.text} />
      </TouchableOpacity>
      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
        {formatDateBar(viewDate, isToday, T)}
      </Text>
      <TouchableOpacity
        onPress={() => {
          const next = addDays(viewDate, 1);
          if (next <= dateStr()) onNavigate(next);
        }}
        style={{ padding: 6 }}
        activeOpacity={0.6}
        disabled={isToday}
      >
        <ChevronRight size={20} color={isToday ? TH.border : TH.text} />
      </TouchableOpacity>
    </View>
  );
}