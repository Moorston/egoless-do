// ─── ZhiguanScreen 止观页主控 ──────────────────────────────────
// 三层渐进式架构：Layer 0 一键禅修 / Layer 1 设置 / SessionComplete 结束
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useT } from '../../components/UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import { useZhiguanTimer, usePracticeElapseHints } from './hooks/useZhiguanTimer';
import { BREATH_PATTERNS } from '@egoless-do/core';
import type { BreathPattern, ZhiguanSession } from '@egoless-do/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useMusicStore } from '../music/useMusicStore';

import BreathRing from './components/BreathRing';
import SessionComplete from './SessionComplete';
import ZhiguanSettingsSheet from './ZhiguanSettingsSheet';

type ViewMode = 'idle' | 'practicing' | 'complete';

const SETTINGS_KEY = '@zhiguan_settings';

interface ZhiguanSettings {
  breathPattern: 'standard' | 'calming' | 'closing';
  targetMinutes: number | null;
  backgroundSound: 'none' | 'bell' | 'rain' | 'bowl';
  sankalpa: string;
}

const DEFAULT_SETTINGS: ZhiguanSettings = {
  breathPattern: 'standard',
  targetMinutes: null,
  backgroundSound: 'none',
  sankalpa: '',
};

export default function ZhiguanScreen() {
  const T = useT();
  const insets = useSafeAreaInsets();
  const nav = useRootNavigation();
  const store = useAppStore();
  const musicStore = useMusicStore();

  const [mode, setMode] = useState<ViewMode>('idle');
  const [settings, setSettings] = useState<ZhiguanSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionData, setSessionData] = useState<{ startTime: number; endTime: number; durationSec: number } | null>(null);

  const timer = useZhiguanTimer();
  const bgAnim = useRef(new Animated.Value(0)).current;
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Load settings
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(v => {
      if (v) setSettings(JSON.parse(v));
    });
  }, []);

  // Background color transition
  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: mode === 'practicing' ? 1 : 0,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  // Target time hint
  usePracticeElapseHints(timer.elapsedSecs, {
    on5min: () => {},
    on30min: () => {},
    on60min: () => {
      if (settings.targetMinutes && timer.elapsedSecs >= settings.targetMinutes * 60) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleStart = useCallback(() => {
    timer.start();
    setMode('practicing');

    // Start background sound if selected
    if (settings.backgroundSound !== 'none') {
      const soundMap: Record<string, string> = {
        'bell': 'temple-bell',
        'rain': 'rain',
        'bowl': 'bowl',
      };
      const trackId = soundMap[settings.backgroundSound];
      if (trackId) {
        const track = musicStore.library.find(t => t.id === trackId);
        if (track) {
          musicStore.play(track);
        }
      }
    }
  }, [timer, settings.backgroundSound, musicStore]);

  const handleLongPressStart = useCallback(() => {
    setIsLongPressing(true);
    pressTimerRef.current = setTimeout(() => {
      // Long press triggered
      const now = Date.now();
      const startTime = now - timer.elapsedSecs * 1000;
      setSessionData({
        startTime,
        endTime: now,
        durationSec: timer.elapsedSecs,
      });
      timer.stop();
      setMode('complete');
      setIsLongPressing(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Stop background sound
      musicStore.stop();
    }, 2000);
  }, [timer, musicStore]);

  const handleLongPressEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleSaveSession = useCallback((note?: string) => {
    if (sessionData) {
      const session: ZhiguanSession = {
        id: `zg_${Date.now()}`,
        userId: 'local',
        status: 'completed',
        startTs: sessionData.startTime,
        endTs: sessionData.endTime,
        fiveHindrances: { greed: 3, aversion: 3, sloth: 3, restlessness: 3, doubt: 3 },
        chosenMethod: 'anapanasati',
        eightTactile: {
          movement: false, itching: false, cold: false, warmth: false,
          lightness: false, heaviness: false, roughness: false, smoothness: false,
        },
        closingNotes: note,
        updatedAt: Date.now(),
        deleted: false,
      };
      store.upsertSession(session);
    }
    nav.goBack();
  }, [sessionData, store, nav]);

  const handleAbandon = useCallback(() => {
    musicStore.stop();
    nav.goBack();
  }, [nav, musicStore]);

  const handleSaveSettings = useCallback((newSettings: ZhiguanSettings) => {
    setSettings(newSettings);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    setShowSettings(false);
  }, []);

  const getPattern = (): BreathPattern => {
    switch (settings.breathPattern) {
      case 'calming': return BREATH_PATTERNS.calming;
      case 'closing': return BREATH_PATTERNS.closing;
      default: return BREATH_PATTERNS.standard;
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FAF7F2', '#1A1A1F'],
  });

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgColor }]}>
      {mode === 'idle' && (
        <View style={styles.idleContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{T('zhiguanTitle')}</Text>
            <Text style={styles.subtitle}>{T('zhiguanSubtitle')}</Text>
          </View>

          <View style={styles.centerContent}>
            <BreathRing pattern={getPattern()} size={200} />
            {settings.targetMinutes && (
              <Text style={styles.targetHint}>{T('zhiguanTargetMinutes', { minutes: settings.targetMinutes })}</Text>
            )}
          </View>

          <View style={styles.bottomActions}>
            <Pressable style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>{T('zhiguanStart')}</Text>
            </Pressable>

            <View style={styles.secondaryActions}>
              <Pressable style={styles.iconButton} onPress={() => setShowSettings(true)}>
                <Text style={styles.iconButtonText}>⚙️</Text>
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => nav.navigate('ZhiguanHistory')}>
                <Text style={styles.iconButtonText}>📜</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {mode === 'practicing' && (
        <View style={styles.practiceContainer}>
          <Text style={styles.timer}>{formatTime(timer.elapsedSecs)}</Text>

          <View style={styles.ringContainer}>
            <BreathRing pattern={getPattern()} size={240} />
          </View>

          <Pressable
            style={[styles.stopButton, isLongPressing && styles.stopButtonActive]}
            onPressIn={handleLongPressStart}
            onPressOut={handleLongPressEnd}
          >
            <Text style={styles.stopButtonText}>
              {isLongPressing ? T('zhiguanReleaseToCancel') : T('zhiguanHoldToStop')}
            </Text>
          </Pressable>
        </View>
      )}

      {mode === 'complete' && sessionData && (
        <SessionComplete
          durationSec={sessionData.durationSec}
          startTime={sessionData.startTime}
          sankalpa={settings.sankalpa}
          onSave={handleSaveSession}
          onAbandon={handleAbandon}
        />
      )}

      {showSettings && (
        <ZhiguanSettingsSheet
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  idleContainer: { flex: 1, justifyContent: 'space-between', padding: 20 },
  header: { alignItems: 'center', marginTop: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#4A3F35' },
  subtitle: { fontSize: 14, color: '#8B7355', marginTop: 4 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  targetHint: { fontSize: 13, color: '#8B7355', marginTop: 16 },
  bottomActions: { alignItems: 'center', marginBottom: 20 },
  startButton: {
    backgroundColor: '#C9A96E',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  startButtonText: { fontSize: 18, fontWeight: '600', color: '#1A1A1F' },
  secondaryActions: { flexDirection: 'row', marginTop: 20, gap: 24 },
  iconButton: { padding: 12 },
  iconButtonText: { fontSize: 24 },
  practiceContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timer: { fontSize: 48, fontWeight: '300', color: '#C9A96E', marginBottom: 40 },
  ringContainer: { marginBottom: 60 },
  stopButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
  },
  stopButtonActive: { backgroundColor: 'rgba(220, 38, 38, 0.5)' },
  stopButtonText: { fontSize: 14, color: '#F5EFE6' },
});
