import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Waves, Bell, Dumbbell, Music, Heart } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Waves, Bell, Dumbbell, Music, Heart,
};

interface Props {
  icon: string;
  name: string;
  count: number;
  gradient: readonly [string, string];
  onPress: () => void;
  T: (key: string) => string;
}

export default React.memo(function CategoryCard({ icon, name, count, gradient, onPress, T }: Props) {
  const IconComp = ICON_MAP[icon] ?? Music;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1, aspectRatio: 1 }}>
      <LinearGradient
        colors={[...gradient] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 20, padding: 16, justifyContent: 'space-between' }}
      >
        <IconComp size={32} color="rgba(255,255,255,.85)" />
        <View>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#fff' }}>{name}</Text>
          <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
            {T('musicTrackCount').replace('{n}', String(count))}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});
