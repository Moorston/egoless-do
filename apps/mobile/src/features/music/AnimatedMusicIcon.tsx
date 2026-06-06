import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Play } from 'lucide-react-native';

interface Props {
  isPlaying: boolean;
  color?: string;
  size?: number;
}

export default function AnimatedMusicIcon({ isPlaying, color = '#fff', size = 20 }: Props) {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(8)).current;
  const bar3 = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    if (!isPlaying) {
      bar1.setValue(4);
      bar2.setValue(8);
      bar3.setValue(6);
      return;
    }

    const createAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 16, duration: 300, useNativeDriver: false }),
          Animated.timing(val, { toValue: 4, duration: 300, useNativeDriver: false }),
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
    return <Play size={size} color={color} style={{ marginLeft: 2 }} />;
  }

  const barWidth = Math.max(2, size / 6);
  const barColor = color;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: size }}>
      <Animated.View style={{ width: barWidth, height: bar1, backgroundColor: barColor, borderRadius: 1 }} />
      <Animated.View style={{ width: barWidth, height: bar2, backgroundColor: barColor, borderRadius: 1 }} />
      <Animated.View style={{ width: barWidth, height: bar3, backgroundColor: barColor, borderRadius: 1 }} />
    </View>
  );
}
