import { FONT_BUTTON } from '@egoless-do/core';
import { Check, Pencil } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface StatusButtonProps {
  isToday: boolean;
  isLocked: boolean;
  onEdit: () => void;
  onSetDone: () => void;
}

export function StatusButton({ isToday, isLocked, onEdit, onSetDone }: StatusButtonProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  if (!isToday) return null;

  return isLocked ? (
    <TouchableOpacity
      onPress={onEdit}
      accessibilityLabel={T('checkinModify')}
      style={{ backgroundColor: P, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}
    >
      <View style={styles.flexRowGap6}>
        <Pencil size={18} color="#fff" />
        <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('checkinModify')}</Text>
      </View>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity onPress={onSetDone}
      accessibilityLabel={T('checkinSubmit')}
      style={{ backgroundColor: TH.accent, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}>
      <View style={styles.flexRowGap6}>
        <Check size={18} color="#fff" />
        <Text style={{ fontWeight: '700', fontSize: FONT_BUTTON(), color: '#fff' }}>
          {T('checkinSubmit')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
