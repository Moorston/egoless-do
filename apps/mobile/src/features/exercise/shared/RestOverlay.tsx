import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT_HERO, FONT_BODY, FONT_SUB } from '@egoless-do/core';

interface Props {
  restSec: number;
  lastSetReps: number | null;
  setIndex: number;
  targetReps?: number;
  onSkip: () => void;
  label: string;
  T: (key: string) => string;
}

export default function RestOverlay({ restSec, lastSetReps, setIndex, targetReps, onSkip, label, T }: Props) {
  const circumference = 2 * Math.PI * 44;
  const progress = restSec > 0 ? restSec / 60 : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.85)', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={120} height={120} style={{ position: 'absolute' }}>
          <Circle cx={60} cy={60} r={44} stroke="rgba(255,255,255,.1)" strokeWidth={6} fill="none" />
          <Circle cx={60} cy={60} r={44} stroke={COLORS.ORANGE} strokeWidth={6} fill="none"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" rotation="-90" origin="60,60" />
        </Svg>
        <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: COLORS.ORANGE }}>{restSec}</Text>
      </View>
      <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.7)', marginTop: 12 }}>{label}</Text>

      <View style={{ marginTop: 24, backgroundColor: 'rgba(255,255,255,.08)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, minWidth: 200 }}>
        {lastSetReps !== null && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('exerciseSet').replace('{n}', String(setIndex))}</Text>
            <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '600' }}>{lastSetReps} {T('exerciseReps')}</Text>
          </View>
        )}
        {targetReps !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('exerciseSet').replace('{n}', String(setIndex + 1))}</Text>
            <Text style={{ fontSize: FONT_BODY, color: COLORS.GREEN, fontWeight: '600' }}>{T('exerciseRepsTarget').replace('{n}', String(targetReps))}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity onPress={onSkip}
        style={{ marginTop: 32, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.15)' }}>
        <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>{T('exerciseSkip')}</Text>
      </TouchableOpacity>
    </View>
  );
}
