import { Music } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface Props {
  isPlaying: boolean;
  color?: string;
  size?: number;
}

export default function AnimatedMusicIcon({ isPlaying, color = '#fff', size = 20 }: Props) {
  const bar1 = useRef(new Animated.Value(0.25)).current;
  const bar2 = useRef(new Animated.Value(0.5)).current;
  const bar3 = useRef(new Animated.Value(0.375)).current;

  useEffect(() => {
    if (!isPlaying) {
      bar1.setValue(0.25);
      bar2.setValue(0.5);
      bar3.setValue(0.375);
      return;
    }

    const createAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.25, duration: 300, useNativeDriver: true }),
        ])
      );

    const a1 = createAnim(bar1, 0);
    const a2 = createAnim(bar2, 150);
    const a3 = createAnim(bar3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isPlaying, bar1, bar2, bar3]);

  if (!isPlaying) {
    return <Music size={size} color={color} />;
  }

  const barWidth = Math.max(2, size / 6);
  const barHeight = size * 0.8;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, height: size }}>
      <Animated.View style={{ width: barWidth, height: barHeight, backgroundColor: color, borderRadius: 1, transform: [{ scaleY: bar1 }] }} />
      <Animated.View style={{ width: barWidth, height: barHeight, backgroundColor: color, borderRadius: 1, transform: [{ scaleY: bar2 }] }} />
      <Animated.View style={{ width: barWidth, height: barHeight, backgroundColor: color, borderRadius: 1, transform: [{ scaleY: bar3 }] }} />
    </View>
  );
}
