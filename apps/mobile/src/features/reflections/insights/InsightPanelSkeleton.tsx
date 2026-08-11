import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type DimensionValue } from 'react-native';

import { useTheme } from '../../../components/UI';

export default function InsightPanelSkeleton() {
  const TH = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  const shimmer = (width: DimensionValue, height: number, borderRadius = 6) => (
    <View style={{ width, height, borderRadius, backgroundColor: `${TH.sub}15`, overflow: 'hidden' }}>
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
          backgroundColor: `${TH.sub}08`,
        }}
      />
    </View>
  );

  return (
    <View style={{ padding: 16 }}>
      {/* Summary skeleton */}
      <View style={{ marginBottom: 20 }}>
        {shimmer('85%', 14)}
      </View>

      {/* Topics skeleton - 4 chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {shimmer(72, 50, 10)}
        {shimmer(72, 50, 10)}
        {shimmer(72, 50, 10)}
        {shimmer(72, 50, 10)}
      </View>
    </View>
  );
}
