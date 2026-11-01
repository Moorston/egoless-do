import { FONT_BODY } from '@egoless-do/core';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { ThemedInput, useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface ReflectionCardProps {
  isReadOnly: boolean;
  note: string;
  onSaveNote: (val: string) => void;
  onNoteBlur: () => void;
}

export function ReflectionCard({ isReadOnly, note, onSaveNote, onNoteBlur }: ReflectionCardProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border, marginTop: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Sparkles size={16} color={P} />
        <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY() }}>{T('checkinNote')}</Text>
      </View>
      {isReadOnly ? (
        <Text style={{ color: TH.text, fontSize: FONT_BODY(), lineHeight: 22 }}>
          {note || '—'}
        </Text>
      ) : (
        <ThemedInput
          value={note}
          onChangeText={onSaveNote}
          onBlur={onNoteBlur}
          placeholder={T('checkinNotePlaceholder')}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80 }}
        />
      )}
    </View>
  );
}
