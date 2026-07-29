// ─── ZhiguanScreen 止观页主控 ──────────────────────────────────
// 三层渐进式架构：idle → practicing → complete
// 使用 store 的 draft → startSession → completeSession 生命周期
import {BREATH_PATTERNS, DEFAULT_RADAR, EMPTY_EIGHT_TACTILE, notifyBreath, initialRoundState , FONT_SUB, FONT_TITLE, FONT_STAT_SECTION, FONT_STAT_CARD, FONT_HERO} from '@egoless-do/core';
import type { BreathPattern, ZhiguanMethod, FiveHindranceRadar, EightTactile, SamStage, CountingRoundState } from '@egoless-do/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { useMusicStore } from '../music/useMusicStore';

import SessionComplete from './SessionComplete';
import ZhiguanSettingsSheet from './ZhiguanSettingsSheet';
import BreathRing from './components/BreathRing';
import CountingRound from './components/CountingRound';
import VipassanaPanel from './components/VipassanaPanel';
import { useZhiguanTimer, usePracticeElapseHints } from './hooks/useZhiguanTimer';

type ViewMode = 'idle' | 'practicing' | 'complete';

const SETTINGS_KEY = '@zhiguan_settings';

interface ZhiguanSettings {
  breathPattern: 'standard' | 'calming' | 'closing';
  targetMinutes: number | null;
  backgroundSound: 'none' | 'bell' | 'rain' | 'bowl';
  sankalpa: string;
  chosenMethod: ZhiguanMethod;
  fiveHindrances: FiveHindranceRadar;
  samathaRatio: number;
  vipassanaRatio: number;
}

const DEFAULT_SETTINGS: ZhiguanSettings = {
  breathPattern: 'standard',
  targetMinutes: null,
  backgroundSound: 'none',
  sankalpa: '',
  chosenMethod: 'anapanasati',
  fiveHindrances: { ...DEFAULT_RADAR },
  samathaRatio: 100,
  vipassanaRatio: 0,
};

export default function ZhiguanScreen() {
  const T = useT();
  const insets = useSafeAreaInsets();
  const nav = useRootNavigation();
  const {
    recordBreathCount, initDraft, updateDraft, resetDraft, startSession, completeSession,
  } = useShallowStore(s => ({
    recordBreathCount: s.recordBreathCount,
    initDraft: s.initDraft,
    updateDraft: s.updateDraft,
    resetDraft: s.resetDraft,
    startSession: s.startSession,
    completeSession: s.completeSession,
  }));
  const musicStore = useMusicStore();

  const [mode, setMode] = useState<ViewMode>('idle');
  const [settings, setSettings] = useState<ZhiguanSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [showSettings, setShowSettings] = useState(false);
  const [sessionTiming, setSessionTiming] = useState<{ startTime: number; durationSec: number } | null>(null);

  const timer = useZhiguanTimer();
  const bgAnim = useRef(new Animated.Value(0)).current;
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [roundState, setRoundState] = useState<CountingRoundState>(initialRoundState);
  const [showVipassanaPanel, setShowVipassanaPanel] = useState(false);

  // Breath tap handler -- use functional update to avoid stale closure
  const handleBreathTap = useCallback(() => {
    setRoundState(prev => {
      const next = notifyBreath(prev);
      recordBreathCount(next.totalBreaths);
      return next;
    });
  }, [recordBreathCount]);

  // Initialize draft + load settings
  useEffect(() => {
    initDraft();
    void AsyncStorage.getItem(SETTINGS_KEY).then(v => {
      if (v) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(v) };
        setSettings(loaded);
        updateDraft({
          sankalpa: loaded.sankalpa,
          chosenMethod: loaded.chosenMethod,
          fiveHindrances: loaded.fiveHindrances,
          samathaRatio: loaded.samathaRatio,
          vipassanaRatio: loaded.vipassanaRatio,
        });
      }
    });
    return () => { resetDraft(); };
  }, []);

  // Background color transition
  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: mode === 'practicing' ? 1 : 0,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  // Practice time hints (5min, 30min awareness)
  usePracticeElapseHints(timer.elapsedSecs, {
    on5min: () => {},
    on30min: () => {},
    on60min: () => {},
  });

  // Target time reached haptic
  const targetFiredRef = useRef(false);
  useEffect(() => {
    if (mode !== 'practicing') { targetFiredRef.current = false; return; }
    if (settings.targetMinutes && timer.elapsedSecs >= settings.targetMinutes * 60 && !targetFiredRef.current) {
      targetFiredRef.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [timer.elapsedSecs, settings.targetMinutes, mode]);

  const handleStart = useCallback(() => {
    // Sync draft with latest settings before starting
    updateDraft({
      sankalpa: settings.sankalpa,
      chosenMethod: settings.chosenMethod,
      fiveHindrances: settings.fiveHindrances,
      samathaRatio: settings.samathaRatio,
      vipassanaRatio: settings.vipassanaRatio,
    });
    startSession();

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
  }, [timer, settings, musicStore, updateDraft, startSession]);

  const handleLongPressStart = useCallback(() => {
    setIsLongPressing(true);
    pressTimerRef.current = setTimeout(() => {
      setSessionTiming({
        startTime: Date.now() - timer.elapsedSecs * 1000,
        durationSec: timer.elapsedSecs,
      });
      timer.stop();
      setMode('complete');
      setIsLongPressing(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handleSaveSession = useCallback((closingData: {
    closingNotes?: string;
    eightTactile?: EightTactile;
    selfReportedStage?: SamStage;
    selfReportedStageText?: string;
    dedicationId?: string;
  }) => {
    completeSession({
      closingNotes: closingData.closingNotes,
      eightTactile: closingData.eightTactile ?? { ...EMPTY_EIGHT_TACTILE },
      selfReportedStage: closingData.selfReportedStage,
      selfReportedStageText: closingData.selfReportedStageText,
      dedicationId: closingData.dedicationId,
      samathaRatioAvg: settingsRef.current.samathaRatio,
      vipassanaRatioAvg: settingsRef.current.vipassanaRatio,
    });
    nav.goBack();
  }, [completeSession, nav]);

  const handleAbandon = useCallback(() => {
    resetDraft();
    musicStore.stop();
    nav.goBack();
  }, [nav, musicStore, resetDraft]);

  const handleSaveSettings = useCallback((newSettings: ZhiguanSettings) => {
    setSettings(newSettings);
    void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    updateDraft({
      sankalpa: newSettings.sankalpa,
      chosenMethod: newSettings.chosenMethod,
      fiveHindrances: newSettings.fiveHindrances,
      samathaRatio: newSettings.samathaRatio,
      vipassanaRatio: newSettings.vipassanaRatio,
    });
    setShowSettings(false);
  }, [updateDraft]);

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
              <Text style={styles.targetHint}>{T('zhiguanTargetMinutes').replace('{minutes}', String(settings.targetMinutes))}</Text>
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

          <Pressable onPress={handleBreathTap} style={styles.ringContainer}>
            <BreathRing pattern={getPattern()} size={240} />
          </Pressable>

          <CountingRound state={roundState} T={T} />

          <Pressable
            style={styles.vipassanaToggle}
            onPress={() => setShowVipassanaPanel(true)}
          >
            <Text style={styles.vipassanaToggleText}>📖 {T('zhiguanVipassanaTitle')}</Text>
          </Pressable>

          <Pressable
            style={[styles.stopButton, isLongPressing && styles.stopButtonActive]}
            onPressIn={handleLongPressStart}
            onPressOut={handleLongPressEnd}
          >
            <Text style={styles.stopButtonText}>
              {isLongPressing ? T('zhiguanReleaseToCancel') : T('zhiguanHoldToStop')}
            </Text>
          </Pressable>

          <VipassanaPanel
            visible={showVipassanaPanel}
            onClose={() => setShowVipassanaPanel(false)}
            T={T}
          />
        </View>
      )}

      {mode === 'complete' && sessionTiming && (
        <SessionComplete
          durationSec={sessionTiming.durationSec}
          startTime={sessionTiming.startTime}
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
  title: { fontSize: FONT_STAT_SECTION(), fontWeight: '700', color: '#4A3F35' },
  subtitle: { fontSize: FONT_SUB(), color: '#8B7355', marginTop: 4 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  targetHint: { fontSize: FONT_SUB(), color: '#8B7355', marginTop: 16 },
  bottomActions: { alignItems: 'center', marginBottom: 20 },
  startButton: {
    backgroundColor: '#C9A96E',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  startButtonText: { fontSize: FONT_TITLE(), fontWeight: '600', color: '#1A1A1F' },
  secondaryActions: { flexDirection: 'row', marginTop: 20, gap: 24 },
  iconButton: { padding: 12 },
  iconButtonText: { fontSize: FONT_STAT_CARD() },
  practiceContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timer: { fontSize: FONT_HERO(), fontWeight: '300', color: '#C9A96E', marginBottom: 40 },
  ringContainer: { marginBottom: 20 },
  vipassanaToggle: { paddingVertical: 8, paddingHorizontal: 16, marginBottom: 20 },
  vipassanaToggleText: { fontSize: FONT_SUB(), color: '#8B7355' },
  stopButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
  },
  stopButtonActive: { backgroundColor: 'rgba(220, 38, 38, 0.5)' },
  stopButtonText: { fontSize: FONT_SUB(), color: '#F5EFE6' },
});
