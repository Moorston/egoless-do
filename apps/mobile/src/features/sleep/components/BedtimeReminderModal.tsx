// ─── BedtimeReminderModal — 全屏沉浸式睡眠提醒 ─────────────────────
// 暗色背景 + 呼吸月亮 + 环形进度条 + 时辰信息 + 快速仪轨

import { BODY_CLOCK, getCurrentPeriod, type BodyClockPeriod, type Theme } from '@egoless-do/core';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';

import { useT } from '../../../components/UI';
import { useUiStore } from '../../../store/uiStore';

interface Props {
  visible: boolean;
  theme: Theme;
  bedtime: string;
  snoozeCount?: number;
  onStartRitual: (min: number) => void;
  onSnooze: () => void;
  onSkipTonight: () => void;
  onDismiss: () => void;
}

const RING_SIZE = 120;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AUTO_RECORD_SEC = 30;

// Starfield positions [x, y, size, delay]
const STAR_POSITIONS: [number, number, number, number][] = [
  [30, 80, 3, 0], [80, 60, 2, 500], [150, 100, 2.5, 1000],
  [220, 70, 2, 1500], [50, 180, 3, 2000], [180, 160, 2, 800],
  [100, 220, 2.5, 1200], [250, 200, 2, 1800], [40, 260, 2, 600],
  [200, 280, 3, 1400], [120, 320, 2, 900], [270, 340, 2.5, 1100],
];

export default function BedtimeReminderModal({
  visible,
  theme,
  bedtime,
  snoozeCount = 0,
  onStartRitual,
  onSnooze,
  onSkipTonight,
  onDismiss,
}: Props) {
  const period = getCurrentPeriod();
  const primary = theme.primary;
  const sub = theme.sub;
  const T = useT();

  // ── Starfield twinkle ───────────────────────────────────────────

  const starOpacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!visible) {
      starOpacity.setValue(0.3);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(starOpacity, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(starOpacity, { toValue: 0.3, duration: 2500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, starOpacity]);

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

  // ── Countdown ring (native driver) ──────────────────────────────

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

    // 1s tick
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

    // Animate ring over 60s (native driver for 60fps)
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: AUTO_RECORD_SEC * 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    return () => clearInterval(interval);
  }, [visible, onDismiss, progressAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  // 最后 10 秒变红 + 脉冲
  const isUrgent = secondsLeft <= 10;
  const urgentColor = isUrgent ? '#EF4444' : primary;
  const urgentPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isUrgent || !visible) {
      urgentPulse.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(urgentPulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(urgentPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isUrgent, visible, urgentPulse]);

  if (visible) {
    // Haptic feedback on modal appear
    // (done via useEffect on visible change below)
  }

  // ── Haptic on appear ────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      // 轻触反馈
      void import('expo-haptics').then(Haptics => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: '#0F172A' }]}
    >
      {/* Starfield background (decorative, hidden from a11y) */}
      <View style={styles.starfield} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {STAR_POSITIONS.map(([x, y, size, delay], i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: x,
                top: y,
                width: size,
                height: size,
                opacity: starOpacity,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        {/* Breathing moon with gradient (decorative) */}
        <Animated.View
          style={[styles.moonWrap, { transform: [{ scale: breathe }] }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Svg width={90} height={90} viewBox="0 0 90 90">
            <Defs>
              <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={primary} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={primary} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="moonBody" cx="40%" cy="35%" r="60%">
                <Stop offset="0%" stopColor="#FFF" stopOpacity="0.95" />
                <Stop offset="100%" stopColor={primary} stopOpacity="0.8" />
              </RadialGradient>
            </Defs>
            {/* Glow halo */}
            <Circle cx={45} cy={45} r={42} fill="url(#moonGlow)" />
            {/* Crescent moon */}
            <Path
              d="M 45 8 A 37 37 0 1 1 45 82 A 28 28 0 1 0 45 8 Z"
              fill="url(#moonBody)"
            />
          </Svg>
        </Animated.View>

        {/* Bedtime display */}
        <Text style={[styles.bedtimeText, { color: sub }]}>{T('sleepTargetBedtime')} {bedtime}</Text>

        {/* Period info */}
        <Text style={[styles.periodName, { color: '#fff' }]}>{period.nameZh}</Text>
        <View style={[styles.organTag, { backgroundColor: `${primary}30` }]}>
          <Text style={[styles.organText, { color: primary }]}>{period.organ}{T('sleepOrganActive')}</Text>
        </View>
        <Text style={[styles.advice, { color: `${sub}CC` }]}>{period.advice}</Text>

        {/* Countdown ring (with urgent pulse) */}
        <Animated.View
          style={[styles.ringWrap, isUrgent && { transform: [{ scale: urgentPulse }] }]}
          accessibilityRole="progressbar"
          accessibilityLabel={T('sleepAutoRecordCountdown', { sec: secondsLeft })}
          accessibilityLiveRegion="polite"
        >
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={`${urgentColor}30`}
              strokeWidth={RING_STROKE}
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={urgentColor}
              strokeWidth={RING_STROKE}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <AnimatedText style={[styles.ringSeconds, { color: urgentColor }]}>
              {secondsLeft}s
            </AnimatedText>
            <Text style={[styles.ringLabel, { color: `${sub}99` }]}>{T('sleepAutoRecordAfter')}</Text>
          </View>
        </Animated.View>

        {/* Main CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: primary }]}
          onPress={() => onStartRitual(20)}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{T('sleepStartRitual')}</Text>
        </TouchableOpacity>

        {/* Quick ritual durations */}
        <View style={styles.quickRow}>
          {[15, 20, 30].map(min => (
            <TouchableOpacity
              key={min}
              style={[styles.quickBtn, { borderColor: primary }]}
              onPress={() => onStartRitual(min)}
            >
              <Text style={[styles.quickText, { color: primary }]}>{min}{T('sleepMinutes')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity
            onPress={() => {
              useUiStore.getState().showToast(T('sleepSnoozeIn10Min'), 'info');
              onSnooze();
            }}
            style={[styles.cancelBtn, { borderColor: `${sub}50` }]}
          >
            <Text style={[styles.cancelText, { color: `${sub}DD` }]}>{T('sleepRemindLater')}</Text>
            <Text style={[styles.snoozeHint, { color: `${sub}77` }]}>{T('sleepRemaining')} {3 - snoozeCount} {T('sleepTimes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(T('sleepSkipTonight'), T('sleepSkipTonightConfirm'), [
                { text: T('commonCancel'), style: 'cancel' },
                { text: T('commonConfirm'), style: 'destructive', onPress: onSkipTonight },
              ]);
            }}
            style={[styles.cancelBtn, { borderColor: `${sub}50` }]}
          >
            <Text style={[styles.cancelText, { color: `${sub}DD` }]}>{T('sleepSkipTonight')}</Text>
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
  starfield: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 360,
  },
  moonWrap: {
    marginBottom: 20,
  },
  bedtimeText: {
    fontSize: 13,
    marginBottom: 12,
    opacity: 0.7,
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
    gap: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  snoozeHint: {
    fontSize: 11,
    marginTop: 2,
  },
});
