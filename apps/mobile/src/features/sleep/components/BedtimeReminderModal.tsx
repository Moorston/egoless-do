// ─── BedtimeReminderModal — 全屏沉浸式睡眠提醒 ─────────────────────
// 暗色背景 + 呼吸月亮 + 环形进度条 + 时辰信息 + 快速仪轨

import { BODY_CLOCK, getCurrentPeriod, type BodyClockPeriod, type Theme } from '@egoless-do/core';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  visible: boolean;
  theme: Theme;
  bedtime: string;
  onStartRitual: (min: number) => void;
  onSnooze: () => void;
  onSkipTonight: () => void;
  onDismiss: () => void;
}

const RING_SIZE = 120;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AUTO_RECORD_SEC = 60;

export default function BedtimeReminderModal({
  visible,
  theme,
  bedtime,
  onStartRitual,
  onSnooze,
  onSkipTonight,
  onDismiss,
}: Props) {
  const period = getCurrentPeriod();
  const primary = theme.primary;
  const bg = theme.bg;
  const text = theme.text;
  const sub = theme.sub;

  // ── Breathing animation ─────────────────────────────────────────

  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) {
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, breathe]);

  // ── Countdown ring ─────────────────────────────────────────────

  const [secondsLeft, setSecondsLeft] = useState(AUTO_RECORD_SEC);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(AUTO_RECORD_SEC);
      progressAnim.setValue(1);
      return;
    }
    setSecondsLeft(AUTO_RECORD_SEC);
    progressAnim.setValue(1);

    // 100ms tick for smooth UI
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return next;
      });
    }, 1000);

    // Animate ring over 60s
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: AUTO_RECORD_SEC * 1000,
      useNativeDriver: false,
    }).start();

    return () => clearInterval(interval);
  }, [visible, onDismiss, progressAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  if (!visible) return null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.content}>
        {/* Breathing moon */}
        <Animated.View style={[styles.moonWrap, { transform: [{ scale: breathe }] }]}>
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Circle cx={40} cy={40} r={36} fill={`${primary}20`} />
            <Circle cx={40} cy={40} r={28} fill={`${primary}40`} />
            <Circle cx={40} cy={40} r={20} fill={primary} />
          </Svg>
        </Animated.View>

        {/* Period info */}
        <Text style={[styles.periodName, { color: text }]}>{period.nameZh}</Text>
        <View style={[styles.organTag, { backgroundColor: `${primary}20` }]}>
          <Text style={[styles.organText, { color: primary }]}>{period.organ}当令</Text>
        </View>
        <Text style={[styles.advice, { color: sub }]}>{period.advice}</Text>

        {/* Countdown ring */}
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={`${primary}20`}
              strokeWidth={RING_STROKE}
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={primary}
              strokeWidth={RING_STROKE}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <AnimatedText style={[styles.ringSeconds, { color: primary }]}>
              {secondsLeft}s
            </AnimatedText>
            <Text style={[styles.ringLabel, { color: sub }]}>后自动记录</Text>
          </View>
        </View>

        {/* Main CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: primary }]}
          onPress={() => onStartRitual(20)}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>开始睡眠仪轨</Text>
        </TouchableOpacity>

        {/* Quick ritual durations */}
        <View style={styles.quickRow}>
          {[15, 20, 30].map(min => (
            <TouchableOpacity
              key={min}
              style={[styles.quickBtn, { borderColor: primary }]}
              onPress={() => onStartRitual(min)}
            >
              <Text style={[styles.quickText, { color: primary }]}>{min}分钟</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity onPress={onSnooze} style={styles.textBtn}>
            <Text style={[styles.textBtnLabel, { color: sub }]}>稍后提醒</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkipTonight} style={styles.textBtn}>
            <Text style={[styles.textBtnLabel, { color: sub }]}>跳过今晚</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Animated SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 360,
  },
  moonWrap: {
    marginBottom: 24,
  },
  periodName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  organTag: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  organText: {
    fontSize: 14,
    fontWeight: '600',
  },
  advice: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 28,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSeconds: {
    fontSize: 26,
    fontWeight: '800',
  },
  ringLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  textBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  textBtnLabel: {
    fontSize: 14,
  },
});
