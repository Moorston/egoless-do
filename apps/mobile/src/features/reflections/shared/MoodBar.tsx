import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../../../components/UI';

interface Props {
  mood: string;
  icon: string;
  count: number;
  percentage: number;
  color: string;
  onPress: () => void;
}

export default function MoodBar({ mood, icon, count, percentage, color, onPress }: Props) {
  const TH = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: FONT_SMALL(), width: 20, textAlign: 'center' }}>{icon}</Text>
      <Text style={{ fontSize: FONT_SMALL(), color: TH.text, width: 36 }}>{mood}</Text>
      <View style={{ flex: 1, height: 8, backgroundColor: `${TH.sub}15`, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: FONT_TINY(), color: TH.sub, width: 36, textAlign: 'right' }}>
        {percentage}%
      </Text>
      <Text style={{ fontSize: FONT_TINY(), color: TH.sub, width: 28, textAlign: 'right' }}>
        {count}次
      </Text>
    </TouchableOpacity>
  );
}
