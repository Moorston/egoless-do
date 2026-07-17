import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION, type Theme } from '@egoless-do/core';
import { CheckCircle2, Trophy, Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, TouchableWithoutFeedback, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CelebrationData {
  planName: string;
  totalDays: number;
  completedDays: number;
  totalDurationMin: number;
  totalCalories: number;
  weightChange?: number;       // kg
  bodyFatChange?: number;      // %
}

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  data: CelebrationData;
  onDismiss: () => void;
}

// ── Particle ──
function Particle({ delay, color, size }: { delay: number; color: string; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const xOffset = useRef(new Animated.Value(Math.random() * 100 - 50)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(xOffset, {
            toValue: Math.random() * 60 - 30,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(xOffset, {
            toValue: Math.random() * 40 - 20,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [delay, anim, xOffset]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.6, -50] }) },
          { translateX: xOffset },
          { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.8] }) },
        ],
      }}
    />
  );
}

// ── Main overlay ──
export default function CelebrationOverlay({ visible, TH, T, data, onDismiss }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const completionRate = data.totalDays > 0 ? Math.round((data.completedDays / data.totalDays) * 100) : 0;

  if (!visible) return null;

  const PARTICLE_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];

  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Particles */}
        {Array.from({ length: 20 }, (_, i) => (
          <Particle
            key={i}
            delay={i * 120}
            color={PARTICLE_COLORS[i % PARTICLE_COLORS.length]}
            size={8 + Math.random() * 12}
          />
        ))}

        {/* Content */}
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          <Trophy size={56} color="#f59e0b" />
          <Text style={styles.title}>{T('bodyPlanComplete') || '🎉 训练计划完成！'}</Text>
          <Text style={[styles.planName, { color: TH.text }]}>{data.planName}</Text>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { borderColor: TH.border }]}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{completionRate}%</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>{T('bodyCompletionRate') || '完成率'}</Text>
            </View>
            <View style={[styles.statItem, { borderColor: TH.border }]}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{String(data.totalDurationMin)}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>{T('bodyMin') || '分钟'}</Text>
            </View>
            <View style={[styles.statItem, { borderColor: TH.border }]}>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>{String(data.totalCalories)}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>{T('bodyKcal') || 'kcal'}</Text>
            </View>
          </View>

          {/* Weight change */}
          {(data.weightChange != null || data.bodyFatChange != null) && (
            <View style={[styles.changeRow, { borderTopColor: TH.border }]}>
              {data.weightChange != null && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.changeValue, { color: data.weightChange < 0 ? '#10b981' : '#ef4444' }]}>
                    {data.weightChange > 0 ? '+' : ''}{data.weightChange.toFixed(1)}kg
                  </Text>
                  <Text style={[styles.changeLabel, { color: TH.sub }]}>{T('bodyWeight')}</Text>
                </View>
              )}
              {data.bodyFatChange != null && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.changeValue, { color: data.bodyFatChange < 0 ? '#10b981' : '#ef4444' }]}>
                    {data.bodyFatChange > 0 ? '+' : ''}{data.bodyFatChange.toFixed(1)}%
                  </Text>
                  <Text style={[styles.changeLabel, { color: TH.sub }]}>{T('bodyBodyFat')}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.tapHint}>{T('bodyTapToDismiss') || '点击任意位置关闭'}</Text>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  planName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
  },
  statValue: {
    fontSize: FONT_STAT_CARD(),
    fontWeight: '900',
  },
  statLabel: {
    fontSize: FONT_BADGE(),
    marginTop: 4,
  },
  changeRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  changeValue: {
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '800',
  },
  changeLabel: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  tapHint: {
    fontSize: FONT_SMALL(),
    color: 'rgba(255,255,255,0.4)',
    marginTop: 24,
  },
});