import { FONT_BODY, FONT_SUB, cardAccent, cardTextColor } from '@egoless-do/core';
import { Shield } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  onPress: () => void;
}

export default function GraceReminder({ onPress }: Props) {
  const TH = useTheme();
  const T = useT();
  const warnBg = cardAccent('#F59E0B', TH.bg, 0.45);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: warnBg, borderRadius: 14 }}>
        <Shield size={20} color={cardTextColor(TH.bg)} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: cardTextColor(TH.bg), fontWeight: '700', fontSize: FONT_BODY() }}>{T('graceRemindTitle')}</Text>
          <Text style={{ color: cardTextColor(TH.bg), opacity: 0.8, fontSize: FONT_SUB(), marginTop: 2 }}>{T('graceRemindDesc')}</Text>
        </View>
        <Text style={{ color: cardTextColor(TH.bg), fontSize: FONT_SUB() }}>→</Text>
      </View>
    </TouchableOpacity>
  );
}
