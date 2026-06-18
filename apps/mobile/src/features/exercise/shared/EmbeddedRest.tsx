import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONT_STAT_CARD, FONT_SUB } from '@egoless-do/core';

interface Props {
  restSec: number;
  totalSec?: number;
  onSkip: () => void;
  T: (key: string) => string;
}

export default function EmbeddedRest({ restSec, totalSec = 60, onSkip, T }: Props) {
  return (
    <View style={{ position: 'absolute', top: 56, left: 20, right: 20, zIndex: 20, backgroundColor: 'rgba(0,0,0,.7)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: COLORS.ORANGE, fontVariant: ['tabular-nums'] }}>{restSec}s</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,.15)', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${totalSec > 0 ? (1 - restSec / totalSec) * 100 : 0}%`, backgroundColor: COLORS.ORANGE, borderRadius: 3 }} />
      </View>
      <TouchableOpacity onPress={onSkip}
        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.15)' }}>
        <Text style={{ color: '#fff', fontSize: FONT_SUB }}>{T('exerciseSkipShort')}</Text>
      </TouchableOpacity>
    </View>
  );
}
