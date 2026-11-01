import { FONT_BODY } from '@egoless-do/core';
import { Calendar } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';

export function EmptyRecordState() {
  const TH = useTheme();
  const T = useT();

  return (
    <View style={{
      backgroundColor: TH.card, borderRadius: 16, padding: 40, marginBottom: 12,
      borderWidth: 1, borderColor: TH.border, alignItems: 'center',
    }}>
      <Calendar size={40} color={TH.sub} style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('noCheckinRecord')}</Text>
    </View>
  );
}
