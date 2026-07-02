import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Animated, Easing, StyleSheet, AppState, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, createLogger } from '@egoless-do/core';
import type { BreathingPreset, GuideStyle, BreathPhaseType } from '@egoless-do/core';
import { BREATHING_PRESETS, cycleDuration, phaseLabelKey, getDescKey, getTipsKey } from '@egoless-do/core';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Play, Pause, ChevronRight, X, Check, Volume2, VolumeX } from 'lucide-react-native';
import { useBreathAudio } from './useBreathAudio';

const log = createLogger('Breathing');
const GUIDE_STYLE_KEY = 'breathing_guide_style';
const VOICE_KEY = 'breathing_voice_enabled';
const CUE_KEY = 'breathing_cue_enabled';

type Page = 'select' | 'prepare' | 'countdown' | 'active' | 'postDistress' | 'report';

export default function BreathingScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { addBreathRecord, addMedMinutes, addReflection } = useAppStore(useShallow(s => ({
    addBreathRecord: s.addBreathRecord,
    addMedMinutes: s.addMedMinutes,
    addReflection: s.addReflection,
  })));

  const [guideStyle, setGuideStyle] = useState<GuideStyle>('scientific');
  const [page, setPage] = useState<Page>('select');
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset | null>(null);
  const selectedPresetRef = useRef<BreathingPreset | null>(null);
  const [cycles, setCycles] = useState(8);
  const cyclesRef = useRef(8);

  // Audio — store in refs for stable breathLoop
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cueEnabled, setCueEnabled] = useState(true);
  const { playPhaseSound, speakCount, speakPhase, resetCount } = useBreathAudio({ cueEnabled, voiceEnabled });
  const audioRef = useRef({ playPhaseSound, speakCount, speakPhase, resetCount });
  audioRef.current = { playPhaseSound, speakCount, speakPhase, resetCount };

  // Breathing state (driven by rAF + shared clock)
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [phaseSec, setPhaseSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const lastPhaseIdxRef = useRef(-1);
  const lastSecRef = useRef(-1);

  // Long-press tracking
  const holdCompletedRef = useRef(false);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdScale = useRef(new Animated.Value(1)).current;
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Distress assessment
  const [preDistress, setPreDistress] = useState(5);
  const [postDistress, setPostDistress] = useState(5);


  // Load saved preferences
  useEffect(() => {
    AsyncStorage.multiGet([GUIDE_STYLE_KEY, VOICE_KEY, CUE_KEY]).then(vals => {
      vals.forEach(([k, v]) => {
        if (k === GUIDE_STYLE_KEY && (v === 'scientific' || v === 'spiritual')) setGuideStyle(v);
        if (k === VOICE_KEY && v !== null) setVoiceEnabled(v === '1');
        if (k === CUE_KEY && v !== null) setCueEnabled(v === '1');
      });
    }).catch(() => {});
  }, []);

  const saveGuideStyle = useCallback((style: GuideStyle) => {
    setGuideStyle(style);
    AsyncStorage.setItem(GUIDE_STYLE_KEY, style).catch(() => {});
  }, []);

  // Current phase info
  const currentPhase = selectedPreset?.phases[currentPhaseIdx];
  const phaseProgress = currentPhase ? phaseSec / currentPhase.durationSec : 0;

  // Main rAF loop — stored in ref, zero deps, never recreated
  const breathLoopRef = useRef<(() => void) | null>(null);
  breathLoopRef.current = () => {
    const preset = selectedPresetRef.current;
    if (!preset || isPausedRef.current) return;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current - pausedElapsedRef.current) / 1000;
    const audio = audioRef.current;

    const cycleDur = cycleDuration(preset);
    const totalDur = cycleDur * cyclesRef.current;
    if (elapsed >= totalDur) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setTotalElapsed(Math.floor(totalDur));
      setPage('postDistress');
      return;
    }

    const curCycle = Math.floor(elapsed / cycleDur);
    const cycleElapsed = elapsed % cycleDur;

    let accum = 0;
    let phaseIdx = 0;
    let phaseElapsed = 0;
    for (let i = 0; i < preset.phases.length; i++) {
      const p = preset.phases[i];
      if (cycleElapsed < accum + p.durationSec) {
        phaseIdx = i;
        phaseElapsed = cycleElapsed - accum;
        break;
      }
      accum += p.durationSec;
      if (i === preset.phases.length - 1) {
        phaseIdx = i;
        phaseElapsed = p.durationSec;
      }
    }

    const curPhase = preset.phases[phaseIdx];
    const curSec = Math.floor(phaseElapsed);

    setCurrentCycle(curCycle);
    setCurrentPhaseIdx(phaseIdx);
    setPhaseSec(curSec);
    setTotalElapsed(Math.floor(elapsed));

    if (phaseIdx !== lastPhaseIdxRef.current) {
      lastPhaseIdxRef.current = phaseIdx;
      lastSecRef.current = curSec; // skip count for this second to avoid voice conflict
      audio.resetCount();
      audio.playPhaseSound();
      audio.speakPhase(curPhase.type);
    }

    if (curSec !== lastSecRef.current && curSec > 0) {
      lastSecRef.current = curSec;
      audio.speakCount(curPhase.durationSec - curSec);
    }

    rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
  };

  // Pause/resume handling — only depends on isPaused and page
  const pauseStartRef = useRef(0);
  useEffect(() => {
    if (page !== 'active') return;
    isPausedRef.current = isPaused;
    if (isPaused) {
      pauseStartRef.current = Date.now();
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    } else {
      if (pauseStartRef.current > 0) {
        pausedElapsedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
    }
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isPaused, page]);

  // C1: Pause rAF on background, resume on foreground
  const bgTimestampRef = useRef(0);
  useEffect(() => {
    if (page !== 'active') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state.match(/inactive|background/)) {
        bgTimestampRef.current = Date.now();
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      } else if (state === 'active' && bgTimestampRef.current > 0 && !isPausedRef.current) {
        const bgDuration = Date.now() - bgTimestampRef.current;
        pausedElapsedRef.current += bgDuration;
        bgTimestampRef.current = 0;
        rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
      }
    });
    return () => sub.remove();
  }, [page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    };
  }, []);

  // Countdown effect: 3 → 2 → 1 → active
  useEffect(() => {
    if (page !== 'countdown') return;
    // Animate number pop-in
    countdownAnim.setValue(0);
    Animated.spring(countdownAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

    const timer = setTimeout(() => {
      if (countdownNum > 1) {
        setCountdownNum(n => n - 1);
      } else {
        // Countdown done, start breathing
        startTimeRef.current = Date.now();
        rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
        setPage('active');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [page, countdownNum, countdownAnim]);

  const handleStart = useCallback((preset: BreathingPreset) => {
    setSelectedPreset(preset);
    selectedPresetRef.current = preset;
    setCycles(preset.defaultCycles);
    cyclesRef.current = preset.defaultCycles;
    setPage('prepare');
  }, []);

  const handleBeginBreathing = useCallback(() => {
    // Cancel any lingering rAF from previous session
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    // Reset hold animation
    holdAnim.setValue(0);
    holdScale.setValue(1);
    holdCompletedRef.current = false;
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    // Sync refs with current state
    selectedPresetRef.current = selectedPreset;
    cyclesRef.current = cycles;
    // Reset ALL state
    setCurrentCycle(0);
    setCurrentPhaseIdx(0);
    setPhaseSec(0);
    setTotalElapsed(0);
    setIsPaused(false);
    isPausedRef.current = false;
    lastPhaseIdxRef.current = -1;
    lastSecRef.current = -1;
    pausedElapsedRef.current = 0;
    pauseStartRef.current = 0;
    setCountdownNum(3);
    setPage('countdown');
  }, [selectedPreset, cycles, holdAnim, holdScale]);

  const handleTogglePause = useCallback(() => {
    // Don't toggle if long press just completed
    if (holdCompletedRef.current) { holdCompletedRef.current = false; return; }
    setIsPaused(p => !p);
  }, []);

  // Long press start — animate ring fill over 3s (only when paused)
  const handleHoldStart = useCallback(() => {
    if (!isPausedRef.current) return;
    holdCompletedRef.current = false;
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.setValue(0);
    holdAnim.removeAllListeners();

    Animated.spring(holdScale, { toValue: 1.1, damping: 8, stiffness: 200, useNativeDriver: true }).start();

    holdAnim.addListener(({ value }) => {
      if (value >= 1) {
        holdAnim.removeAllListeners();
        holdCompletedRef.current = true;
        holdTimeoutRef.current = setTimeout(() => {
          if (holdTimeoutRef.current !== null) {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            setPage('postDistress');
          }
        }, 100);
      }
    });
    Animated.timing(holdAnim, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
    }).start();
  }, [holdAnim, holdScale]);

  // Long press end — cancel if released early
  const handleHoldEnd = useCallback(() => {
    if (holdCompletedRef.current) return; // Already completed, don't cancel
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.removeAllListeners();
    Animated.spring(holdScale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    holdAnim.stopAnimation(() => {
      Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    });
  }, [holdAnim, holdScale]);

  const handleFinish = useCallback(() => {
    // Clean up rAF and hold animation
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.setValue(0);
    holdScale.setValue(1);
    holdCompletedRef.current = false;
    isPausedRef.current = false;
    setReflection('');
    setSaving(false);
    setPage('select');
    setSelectedPreset(null);
    selectedPresetRef.current = null;
  }, [holdAnim, holdScale]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save to dedicated breathing history
      addBreathRecord({
        date: new Date().toISOString().slice(0, 10),
        presetKey: selectedPreset?.key ?? 'unknown',
        durationSec: totalElapsed,
        cycles,
        preDistress,
        postDistress,
        reflection: reflection.trim() || undefined,
        guideStyle: guideStyle,
      });
      // Also add to generic meditation minutes (for total stats)
      addMedMinutes(Math.round(totalElapsed / 60));
      if (reflection.trim()) {
        addReflection({ content: reflection.trim(), tags: ['调息'], mood: '' });
      }
    } catch (e) {
      log.warn('Save breathing record failed', e);
      Alert.alert(T('breathSaveFailed') || '保存失败', T('breathRetry') || '请重试');
    }
    setSaving(false);
    handleFinish();
  }, [reflection, totalElapsed, cycles, preDistress, postDistress, guideStyle, selectedPreset, handleFinish, addBreathRecord, addMedMinutes, addReflection]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── Selection Page ──
  if (page === 'select') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <SimpleHeader routeName="Breathing" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text }}>{T('breathingSubtitle')}</Text>
          <TouchableOpacity onPress={() => nav.navigate('BreathHistory' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.primary }}>{T('breathingHistory')}</Text>
            <ChevronRight size={14} color={TH.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {BREATHING_PRESETS.map(preset => (
            <TouchableOpacity
              key={preset.key}
              style={[styles.presetCard, { borderColor: `${TH.primary}30` }]}
              onPress={() => handleStart(preset)}
              activeOpacity={0.7}
            >
              <View style={styles.presetHeader}>
                <Text style={[styles.presetName, { color: TH.text }]}>{T(preset.nameKey)}</Text>
                <Text style={[styles.presetEn, { color: TH.sub }]}>{T(preset.enKey)}</Text>
                <Text style={[styles.presetRatio, { color: TH.primary }]}>段比 {T(preset.ratioKey)}</Text>
              </View>

              {/* Style toggle */}
              <View style={styles.styleToggle}>
                <TouchableOpacity
                  style={[styles.styleBtn, guideStyle === 'scientific' && { backgroundColor: `${TH.primary}20` }]}
                  onPress={() => saveGuideStyle('scientific')}
                >
                  <Text style={[styles.styleBtnText, { color: guideStyle === 'scientific' ? TH.primary : TH.sub }]}>
                    {T('breathScientific')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.styleBtn, guideStyle === 'spiritual' && { backgroundColor: `${TH.primary}20` }]}
                  onPress={() => saveGuideStyle('spiritual')}
                >
                  <Text style={[styles.styleBtnText, { color: guideStyle === 'spiritual' ? TH.primary : TH.sub }]}>
                    {T('breathSpiritual')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.presetDesc, { color: TH.text }]}>{T(getDescKey(preset, guideStyle))}</Text>

              <View style={styles.presetFooter}>
                <Text style={[styles.presetCycles, { color: TH.sub }]}>
                  {preset.defaultCycles} {T('breathCycles')} · {formatTime(cycleDuration(preset) * preset.defaultCycles)}
                </Text>
                <ChevronRight size={18} color={TH.sub} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Preparation Page ──
  if (page === 'prepare' && selectedPreset) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T(selectedPreset.nameKey)}</Text>
          <TouchableOpacity onPress={() => setPage('select')}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[styles.prepSubtitle, { color: TH.sub }]}>
            {T(selectedPreset.enKey)} · 段比 {T(selectedPreset.ratioKey)}
          </Text>

          {/* Description */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathGuideTitle')}</Text>
            <Text style={[styles.infoBody, { color: TH.text }]}>{T(getDescKey(selectedPreset, guideStyle))}</Text>
          </View>

          {/* Guide */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathGuide')}</Text>
            <Text style={[styles.infoBody, { color: TH.text }]}>
              {guideStyle === 'scientific' ? T('breathGuideSci') : T('breathGuideSpr')}
            </Text>
            <Text style={[styles.infoBody, { color: TH.text, marginTop: 8 }]}>
              {T(getTipsKey(selectedPreset, guideStyle))}
            </Text>
          </View>

          {/* Phase diagram */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathPhaseDiagram')}</Text>
            <View style={styles.phaseRow}>
              {selectedPreset.phases.map((p, i) => (
                <View key={i} style={styles.phaseItem}>
                  <View style={[styles.phaseBar, {
                    width: p.durationSec * 18,
                    backgroundColor: p.type === 'inhale' ? '#10B981' : p.type === 'exhale' ? '#EF4444' : '#F59E0B',
                  }]}>
                    <Text style={styles.phaseBarText}>{p.durationSec}s</Text>
                  </View>
                  <Text style={[styles.phaseLabel, { color: TH.sub }]}>{T(phaseLabelKey(p.type))}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pre-distress */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathPreDistress')}</Text>
            <View style={styles.distressRow}>
              <Text style={{ color: TH.sub }}>😌</Text>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.distressValue, { color: TH.primary }]}>{preDistress}</Text>
              </View>
              <Text style={{ color: TH.sub }}>😰</Text>
            </View>
            <View style={styles.distressButtons}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.distressBtn, preDistress === n && { backgroundColor: TH.primary }]}
                  onPress={() => setPreDistress(n)}
                >
                  <Text style={[styles.distressBtnText, { color: preDistress === n ? '#fff' : TH.sub }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Audio controls */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <View style={styles.audioToggleRow}>
              <Volume2 size={18} color={voiceEnabled ? TH.primary : TH.sub} />
              <Text style={[styles.audioToggleLabel, { color: TH.text }]}>{T('breathVoiceGuide')}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: voiceEnabled ? TH.primary : `${TH.sub}30` }]}
                onPress={() => {
                  const v = !voiceEnabled;
                  setVoiceEnabled(v);
                  AsyncStorage.setItem(VOICE_KEY, v ? '1' : '0').catch(() => {});
                }}
              >
                <View style={[styles.toggleDot, { alignSelf: voiceEnabled ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>
            <View style={[styles.audioToggleRow, { marginTop: 10 }]}>
              {cueEnabled ? <Volume2 size={18} color={TH.primary} /> : <VolumeX size={18} color={TH.sub} />}
              <Text style={[styles.audioToggleLabel, { color: TH.text }]}>{T('breathCueSound')}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: cueEnabled ? TH.primary : `${TH.sub}30` }]}
                onPress={() => {
                  const v = !cueEnabled;
                  setCueEnabled(v);
                  AsyncStorage.setItem(CUE_KEY, v ? '1' : '0').catch(() => {});
                }}
              >
                <View style={[styles.toggleDot, { alignSelf: cueEnabled ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: TH.primary }]}
            onPress={handleBeginBreathing}
          >
            <Text style={styles.startBtnText}>{T('breathStart')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Countdown Page (3 → 2 → 1) ──
  if (page === 'countdown') {
    return (
      <SafeAreaView style={[styles.activeContainer, { backgroundColor: '#0a0a1a' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.Text style={{
            fontSize: 120,
            fontWeight: '900',
            color: '#fff',
            opacity: countdownAnim,
            transform: [{ scale: countdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }}>
            {countdownNum}
          </Animated.Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>
            {countdownNum === 3 ? T('breathReady') : countdownNum === 2 ? T('breathAdjust') : T('breathBegin')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active Breathing Page ──
  if (page === 'active' && selectedPreset && currentPhase) {
    const phaseColor = currentPhase.type === 'inhale' ? '#10B981'
      : currentPhase.type === 'exhale' ? '#EF4444' : '#F59E0B';

    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.activeHeader}>
          <Text style={[styles.activeTitle, { color: TH.text }]}>{T(selectedPreset.nameKey)}</Text>
          <Text style={[styles.activeSubtitle, { color: TH.sub }]}>段比 {T(selectedPreset.ratioKey)}</Text>
        </View>

        <View style={styles.activeCenter}>
          {/* Bubble — scale driven by rAF phaseProgress */}
          <View style={[styles.bubble, {
            backgroundColor: `${phaseColor}30`,
            borderColor: phaseColor,
            transform: [{
              scale: currentPhase.type === 'inhale' ? 1 + phaseProgress * 0.5
                : currentPhase.type === 'exhale' ? 1.5 - phaseProgress * 0.8
                : 1.2 + Math.sin(phaseProgress * Math.PI * 4) * 0.05,
            }],
            opacity: currentPhase.type === 'hold' ? 0.8 + Math.sin(phaseProgress * Math.PI * 4) * 0.1 : 0.6,
          }]}>
            <Text style={[styles.phaseText, { color: phaseColor }]}>{T(phaseLabelKey(currentPhase.type))}</Text>
            <Text style={[styles.phaseCountdown, { color: phaseColor }]}>{currentPhase.durationSec - phaseSec}</Text>
          </View>

          {/* Cycle counter */}
          <Text style={[styles.cycleText, { color: TH.sub }]}>
            {T('breathCycles')} {currentCycle + 1} / {cycles}
          </Text>

          {/* Total time */}
          <Text style={[styles.timeText, { color: TH.sub }]}>{formatTime(totalElapsed)}</Text>
        </View>

        {/* Controls — single pause button with ring progress, long-press to end */}
        <View style={styles.activeControls}>
          <Animated.View style={{ transform: [{ scale: holdScale }] }}>
            <TouchableOpacity
              style={[styles.pauseBtn, { backgroundColor: isPaused ? '#EF4444' : TH.primary }]}
              onPress={handleTogglePause}
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
            >
              {/* Ring progress (3s fill) — white ring inset 3px */}
              <View style={styles.ringContainer}>
                <View style={styles.ringBg} />
                <Animated.View style={[styles.ringFill, {
                  transform: [{ rotate: holdAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-90deg', '270deg'],
                  })}],
                  opacity: holdAnim.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }),
                }]} />
              </View>
              {isPaused ? <Play size={28} color="#fff" /> : <Pause size={28} color="#fff" />}
            </TouchableOpacity>
          </Animated.View>
          {isPaused && (
            <Text style={[styles.holdHint, { color: TH.sub }]}>{T('breathLongPressHint')}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Record Save Page (postDistress + report + reflection) ──
  if ((page === 'postDistress' || page === 'report') && selectedPreset) {
    const distressChange = preDistress - postDistress;
    const distressPercent = preDistress > 0 ? Math.round((distressChange / preDistress) * 100) : 0;

    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T('breathReport')}</Text>
          <TouchableOpacity onPress={handleFinish}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Session summary */}
          <View style={[styles.reportCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.reportName, { color: TH.primary }]}>{T(selectedPreset.nameKey)}</Text>
            <View style={styles.reportRow}>
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathCycles')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>{cycles}</Text>
            </View>
            <View style={styles.reportRow}>
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathDuration')}</Text>
              <Text style={[styles.reportValue, { color: TH.text }]}>{formatTime(totalElapsed)}</Text>
            </View>
          </View>

          {/* Post-distress assessment */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathPostDistress')}</Text>
            <View style={styles.distressRow}>
              <Text style={{ color: TH.sub }}>😌</Text>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.distressValue, { color: TH.primary }]}>{postDistress}</Text>
              </View>
              <Text style={{ color: TH.sub }}>😰</Text>
            </View>
            <View style={styles.distressButtons}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.distressBtn, postDistress === n && { backgroundColor: TH.primary }]}
                  onPress={() => setPostDistress(n)}
                >
                  <Text style={[styles.distressBtnText, { color: postDistress === n ? '#fff' : TH.sub }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Distress change */}
            <View style={[styles.reportRow, { marginTop: 12 }]}>
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathDistressChange')}</Text>
              <Text style={[styles.reportValue, { color: distressChange >= 0 ? '#10B981' : '#EF4444' }]}>
                {preDistress} → {postDistress} ({distressChange >= 0 ? '-' : '+'}{Math.abs(distressPercent)}%)
              </Text>
            </View>
          </View>

          {/* Reflection input */}
          <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
            <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathThisReflection')}</Text>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              placeholder={T('breathReflectionPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              maxLength={500}
              style={{
                minHeight: 80, maxHeight: 160,
                backgroundColor: TH.bg,
                borderRadius: 10,
                padding: 12,
                color: TH.text,
                fontSize: FONT_BODY,
                borderWidth: 1,
                borderColor: TH.border,
                textAlignVertical: 'top',
              }}
            />
            <Text style={{ color: TH.sub, fontSize: 11, marginTop: 4 }}>{T('breathSaveTagHint')}</Text>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: saving ? TH.sub : TH.primary, marginTop: 16 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Check size={20} color="#fff" />
            <Text style={styles.startBtnText}>{saving ? T('breathSaving') : T('breathSaveRecord')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Selection page
  presetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  presetHeader: {
    marginBottom: 10,
  },
  presetName: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  presetEn: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  presetRatio: {
    fontSize: FONT_SUB,
    fontWeight: '600',
    marginTop: 4,
  },
  styleToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  styleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  styleBtnText: {
    fontSize: FONT_SUB,
    fontWeight: '600',
  },
  presetDesc: {
    fontSize: FONT_BODY,
    lineHeight: 22,
    marginBottom: 10,
  },
  presetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetCycles: {
    fontSize: FONT_SUB,
  },

  // Preparation page
  prepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 0,
  },
  prepTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  prepSubtitle: {
    fontSize: FONT_SUB,
    marginBottom: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoBody: {
    fontSize: FONT_BODY,
    lineHeight: 22,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
  },
  phaseItem: {
    alignItems: 'center',
    gap: 4,
  },
  phaseBar: {
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  phaseLabel: {
    fontSize: 11,
  },

  // Distress
  distressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  distressValue: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
    textAlign: 'center',
  },
  distressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distressBtn: {
    width: 32,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distressBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assessmentTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#fff',
    fontSize: FONT_BODY,
    fontWeight: '700',
  },

  // Active page
  activeHeader: {
    alignItems: 'center',
    padding: 16,
  },
  activeTitle: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  activeSubtitle: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  activeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  phaseCountdown: {
    fontSize: FONT_STAT_SECTION,
    fontWeight: '900',
    marginTop: 4,
  },
  cycleText: {
    fontSize: FONT_SUB,
    marginTop: 16,
  },
  timeText: {
    fontSize: FONT_SUB,
    marginTop: 4,
  },
  activeContainer: {
    flex: 1,
  },
  activeControls: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  pauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
  },
  ringBg: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ringFill: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#fff',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  holdHint: {
    fontSize: FONT_SUB,
  },

  // Report
  reportTitle: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  reportName: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  reportLabel: {
    fontSize: FONT_BODY,
  },
  reportValue: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  audioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioToggleLabel: {
    fontSize: FONT_BODY,
    flex: 1,
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});
