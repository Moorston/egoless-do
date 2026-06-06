import React from 'react';
import { View, Text } from 'react-native';
import { FONT_HERO, FONT_TITLE } from '@egoless-do/core';

interface Props {
  countdown: number;
  label: string;
}

export default function CountdownPage({ countdown, label }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{countdown}</Text>
      <Text style={{ fontSize: FONT_TITLE, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{label}</Text>
    </View>
  );
}
