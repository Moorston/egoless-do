// ─── BreathRing 呼吸圆环 ────────────────────────────────────────
// 纯呼吸动画组件，跟随吸气-屏-呼气节奏膨胀/收缩
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { BreathPattern } from '@egoless-do/core';

interface BreathRingProps {
  pattern: BreathPattern;
  visible?: boolean;
  size?: number;
  style?: object;
}

const RING_COLOR = '#C9A96E';

export default function BreathRing({ pattern, visible = true, size = 220, style }: BreathRingProps) {
  const anim = useRef(new Animated.Value(0)).current;

  const total = pattern.inhale + pattern.hold + pattern.exhale;
  const inhaleRatio = pattern.inhale / total;
  const holdRatio = pattern.hold / total;

  useEffect(() => {
    const dur = total * 1000;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: dur,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (visible) loop.start();
    return () => loop.stop();
  }, [total, visible, anim]);

  const scale = anim.interpolate({
    inputRange: [0, inhaleRatio, inhaleRatio + holdRatio, 1],
    outputRange: [1.0, 1.1, 1.1, 1.0],
  });

  if (!visible) return null;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: RING_COLOR,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 4, backgroundColor: 'transparent' },
});
