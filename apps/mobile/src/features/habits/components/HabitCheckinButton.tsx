// ─── HabitCheckinButton: animated check-in button ────────────────
import { FONT_BUTTON } from '@egoless-do/core';
import { CheckCircle } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  isChecked: boolean;
  onCheckin: () => void;
}

export default function HabitCheckinButton({ isChecked, onCheckin }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (isChecked) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start(() => { onCheckin(); });
  }, [isChecked, onCheckin, scaleAnim]);

  if (isChecked) {
    return (
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: `${P}15`,
        transform: [{ scale: scaleAnim }],
      }}>
        <CheckCircle size={20} color={P} />
        <Text style={{ color: P, fontSize: FONT_BUTTON, fontWeight: '700' }}>{T('habitChecked')}</Text>
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: P,
        transform: [{ scale: scaleAnim }],
      }}>
        <CheckCircle size={20} color="#fff" />
        <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '700' }}>{T('habitCheckinBtn')}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
