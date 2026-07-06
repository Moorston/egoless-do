import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BODY, FONT_SUB, COLORS, cardAccent, cardTextColor } from '@egoless-do/core';
import type { Plan } from '@egoless-do/core';

interface Props {
  plan: Plan;
  onGoToPlan: () => void;
  onDismiss: () => void;
}

export default function DelayedReminder({ plan, onGoToPlan, onDismiss }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <TouchableOpacity
      onPress={onGoToPlan}
      activeOpacity={0.8}
      style={{ borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: cardAccent(COLORS.RED, TH.bg, 0.45), borderRadius: 14 }}>
        <AlertTriangle size={20} color={cardTextColor(TH.bg)} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: cardTextColor(TH.bg), fontWeight: '700', fontSize: FONT_BODY }}>{T('planDelayedNotify')}</Text>
          <Text style={{ color: cardTextColor(TH.bg), opacity: 0.8, fontSize: FONT_SUB, marginTop: 2 }}>
            {T('planDelayed')}: {plan.name}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
          <X size={16} color={cardTextColor(TH.bg)} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
