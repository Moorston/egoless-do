// ─── HabitEmptyState: empty state with create prompt ─────────────
import { FONT_BODY, FONT_BUTTON, FONT_SUB } from '@egoless-do/core';
import { BookOpen } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  primaryColor: string;
  onCreate: () => void;
}

export default function HabitEmptyState({ primaryColor: P, onCreate }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 }}>
      <BookOpen size={64} color={`${P}60`} style={{ marginBottom: 20 }} />
      <Text style={{ color: TH.text, fontSize: FONT_BODY, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
        {T('habitEmptyTitle')}
      </Text>
      <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
        {T('habitEmptyDesc')}
      </Text>
      <TouchableOpacity
        onPress={onCreate}
        style={{
          backgroundColor: P, paddingHorizontal: 24, paddingVertical: 12,
          borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>
          + {T('habitAdd')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
