/**
 * 脉冲标记组件
 * 带有脉冲动画的打卡标记
 * 使用 React.memo 和原生驱动优化性能
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { CheckinType } from '../types/globalPulse';
import { getCheckinTypeColor } from '../services/globalPulseApi';

interface PulseMarkerProps {
  type: CheckinType;
  size?: number;
}

export const PulseMarker: React.FC<PulseMarkerProps> = memo(({
  type,
  size = 24
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 使用 useMemo 缓存颜色计算
  const color = useMemo(() => getCheckinTypeColor(type), [type]);

  useEffect(() => {
    // 脉冲动画 - 使用原生驱动
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // 缩放动画 - 使用原生驱动
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    scaleAnimation.start();

    return () => {
      pulseAnimation.stop();
      scaleAnimation.stop();
    };
  }, []);

  // 使用 useMemo 缓存插值计算
  const pulseOpacity = useMemo(() =>
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 0],
    }),
    [pulseAnim]
  );

  const pulseScale = useMemo(() =>
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    }),
    [pulseAnim]
  );

  // 使用 useMemo 缓存样式
  const containerStyle = useMemo(() => [
    styles.container,
    { width: size * 2, height: size * 2 }
  ], [size]);

  const pulseRingStyle = useMemo(() => [
    styles.pulseRing,
    {
      backgroundColor: color,
      opacity: pulseOpacity,
      transform: [{ scale: pulseScale }],
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ], [color, pulseOpacity, pulseScale, size]);

  const centerDotStyle = useMemo(() => [
    styles.centerDot,
    {
      backgroundColor: color,
      transform: [{ scale: scaleAnim }],
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ], [color, scaleAnim, size]);

  const highlightStyle = useMemo(() => [
    styles.highlight,
    {
      width: size * 0.4,
      height: size * 0.4,
      borderRadius: size * 0.2,
    },
  ], [size]);

  return (
    <View style={containerStyle}>
      {/* 脉冲环 */}
      <Animated.View style={pulseRingStyle} />

      {/* 中心点 */}
      <Animated.View style={centerDotStyle} />

      {/* 内部高光 */}
      <View style={highlightStyle} />
    </View>
  );
});

// 设置显示名称，便于调试
PulseMarker.displayName = 'PulseMarker';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  centerDot: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    top: '20%',
    left: '20%',
  },
});

export default PulseMarker;
