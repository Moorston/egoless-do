/**
 * 实时活跃标记组件
 * 绿色脉冲动画圆点 + 昵称 + 城市 + 活动时长
 */

import {ActiveSession , FONT_LABEL, FONT_TINY, FONT_SMALL} from '@egoless-do/core';
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

import { useGlobalTick } from '../hooks/useGlobalTick';
import { formatDisplayName, getCheckinTypeIcon } from '../services/globalPulseApi';

interface ActiveMarkerProps {
  session: ActiveSession;
  city?: string;
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const ActiveMarker: React.FC<ActiveMarkerProps> = ({ session, city }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const tick = useGlobalTick(1000);
  const duration = useMemo(() => formatDuration(session.started_at), [session.started_at, tick]);

  // 脉冲动画
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim, opacityAnim]);

  const displayName = useMemo(
    () => formatDisplayName(session.nickname, session.user_hash),
    [session.nickname, session.user_hash]
  );

  const typeIcon = getCheckinTypeIcon(session.type);
  const subtitle = city ? `${city} · ${duration}` : duration;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <View style={styles.dotInner}>
        <Text style={styles.dotText}>{typeIcon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    position: 'absolute',
    top: 0,
  },
  dotInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dotText: {
    fontSize: FONT_LABEL(),
  },
  name: {
    fontSize: FONT_SMALL(),
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
    maxWidth: 76,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_TINY(),
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 1,
    maxWidth: 76,
    textAlign: 'center',
  },
});

export default ActiveMarker;
