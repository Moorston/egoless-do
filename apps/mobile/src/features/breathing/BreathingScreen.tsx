import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, createLogger } from '@egoless-do/core';
import type { BreathingPreset, GuideStyle, BreathPhaseType } from '@egoless-do/core';
import { BREATHING_PRESETS, cycleDuration, phaseLabelKey, getDescKey, getTipsKey } from '@egoless-do/core';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Wind, Play, Pause, ChevronRight, X, Check, Volume2, VolumeX } from 'lucide-react-native';
import { useBreathAudio } from './useBreathAudio';

const log = createLogger('Breathing');
const GUIDE_STYLE_KEY = 'breathing_guide_style';
const VOICE_KEY = 'breathing_voice_enabled';
const CUE_KEY = 'breathing_cue_enabled';

type Page = 'select' | 'prepare' | 'active' | 'postDistress' | 'report';

export default function BreathingScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();

  const [guideStyle, setGuideStyle] = useState<GuideStyle>('scientific');
  const [page, setPage] = useState<Page>('select');
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset | null>(null);
  const [cycles, setCycles] = useState(8);

  // Audio
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cueEnabled, setCueEnabled] = useState(true);
  const { playPhaseSound, speakCount, speakPhase, resetCount } = useBreathAudio({ cueEnabled, voiceEnabled });

  // Breathing state (driven by rAF + shared clock)
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [phaseSec, setPhaseSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const lastPhaseIdxRef = useRef(-1);
  const lastSecRef = useRef(-1);

  // Long-press-to-end animation (same pattern as exercise page)
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
    });
  }, []);

  const saveGuideStyle = useCallback((style: GuideStyle) => {
    setGuideStyle(style);
    AsyncStorage.setItem(GUIDE_STYLE_KEY, style).catch(() => {});
  }, []);

  // Current phase info
  const currentPhase = selectedPreset?.phases[currentPhaseIdx];
  const phaseProgress = currentPhase ? phaseSec / currentPhase.durationSec : 0;

  // Main rAF loop — single clock source for audio-visual sync
  const breathLoop = useCallback(() => {
    if (!selectedPreset) return;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current - pausedElapsedRef.current) / 1000;
    const preset = selectedPreset;

    // Compute current cycle and phase from elapsed time
    const cycleDur = cycleDuration(preset);
    const totalDur = cycleDur * cycles;
    if (elapsed >= totalDur) {
      // All cycles done
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setTotalElapsed(Math.floor(totalDur));
      setPage('postDistress');
      return;
    }

    const curCycle = Math.floor(elapsed / cycleDur);
    const cycleElapsed = elapsed % cycleDur;

    // Find current phase
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

    // Update React state (batched)
    setCurrentCycle(curCycle);
    setCurrentPhaseIdx(phaseIdx);
    setPhaseSec(curSec);
    setTotalElapsed(Math.floor(elapsed));

    // Audio: phase transition
    if (phaseIdx !== lastPhaseIdxRef.current) {
      lastPhaseIdxRef.current = phaseIdx;
      resetCount();
      playPhaseSound();
      speakPhase(curPhase.type);
    }

    // Audio: count per second (countdown to match display)
    if (curSec !== lastSecRef.current && curSec > 0) {
      lastSecRef.current = curSec;
      speakCount(curPhase.durationSec - curSec);
    }

    rafRef.current = requestAnimationFrame(breathLoop);
  }, [selectedPreset, cycles, playPhaseSound, speakPhase, speakCount, resetCount]);

  // Pause/resume handling
  const pauseStartRef = useRef(0);
  useEffect(() => {
    if (page !== 'active') return;
    if (isPaused) {
      pauseStartRef.current = Date.now();
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    } else {
      if (pauseStartRef.current > 0) {
        pausedElapsedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      rafRef.current = requestAnimationFrame(breathLoop);
    }
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [isPaused, page, breathLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, []);

  const handleStart = useCallback((preset: BreathingPreset) => {
    setSelectedPreset(preset);
    setCycles(preset.defaultCycles);
    setPage('prepare');
  }, []);

  const handleBeginBreathing = useCallback(() => {
    // Reset state
    setCurrentCycle(0);
    setCurrentPhaseIdx(0);
    setPhaseSec(0);
    setTotalElapsed(0);
    setIsPaused(false);
    lastPhaseIdxRef.current = -1;
    lastSecRef.current = -1;
    pausedElapsedRef.current = 0;
    setPage('active');

    // Start rAF loop (single clock source)
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(breathLoop);
  }, [breathLoop]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(p => !p);
  }, []);

  // Long press start — animate ring fill over 3s
  const handleHoldStart = useCallback(() => {
    if (!isPaused) return; // Only allow hold-to-end when paused
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.setValue(0);
    holdAnim.removeAllListeners();

    Animated.spring(holdScale, { toValue: 1.15, damping: 8, stiffness: 200, useNativeDriver: true }).start();

    const anim = Animated.timing(holdAnim, {
      toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false,
    });
    holdAnim.addListener(({ value }) => {
      if (value >= 1) {
        holdAnim.removeAllListeners();
        Animated.spring(holdScale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
        holdTimeoutRef.current = setTimeout(() => {
          if (holdTimeoutRef.current !== null) {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            setPage('postDistress');
          }
        }, 200);
      }
    });
    anim.start();
  }, [isPaused, holdAnim, holdScale]);

  // Long press end — cancel if released early
  const handleHoldEnd = useCallback(() => {
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.removeAllListeners();
    Animated.spring(holdScale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    holdAnim.stopAnimation(() => {
      Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    });
  }, [holdAnim, holdScale]);

  const handlePostDistressSubmit = useCallback(() => {
    setPage('report');
  }, []);

  const handleFinish = useCallback(() => {
    setPage('select');
    setSelectedPreset(null);
  }, []);

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
            <Text style={[styles.infoTitle, { color: TH.primary }]}>规仪说明</Text>
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
            <Text style={[styles.infoTitle, { color: TH.primary }]}>段比示意</Text>
            <View style={styles.phaseRow}>
              {selectedPreset.phases.map((p, i) => (
                <View key={i} style={styles.phaseItem}>
                  <View style={[styles.phaseBar, {
                    width: p.durationSec * 18,
                    backgroundColor: p.type === 'inhale' ? '#10B981' : p.type === 'exhale' ? '#EF4444' : '#F59E0B',
                  }]}>
                    <Text style={styles.phaseBarText}>{p.durationSec}{T('breathCycles') ? 's' : ''}</Text>
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
              <Text style={[styles.audioToggleLabel, { color: TH.text }]}>语音引导</Text>
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
              <Text style={[styles.audioToggleLabel, { color: TH.text }]}>换气提示音</Text>
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

        {/* Controls — single pause button, long-press to end (same as exercise) */}
        <View style={styles.activeControls}>
          <Animated.View style={{ transform: [{ scale: holdScale }] }}>
            <TouchableOpacity
              style={[styles.pauseBtn, { backgroundColor: isPaused ? '#fff' : 'rgba(255,255,255,0.2)' }]}
              onPress={handleTogglePause}
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
            >
              {isPaused ? <Play size={32} color="#333" /> : <Pause size={32} color="#fff" />}
            </TouchableOpacity>
          </Animated.View>
          {isPaused && (
            <Text style={[styles.holdHint, { color: TH.sub }]}>长按 3 秒结束调息</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Post-Distress Assessment ──
  if (page === 'postDistress') {
    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T('breathReport')}</Text>
          <TouchableOpacity onPress={handleFinish}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={[styles.assessmentTitle, { color: TH.text }]}>{T('breathPostDistress')}</Text>
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
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: TH.primary, marginTop: 24 }]}
            onPress={handlePostDistressSubmit}
          >
            <Check size={20} color="#fff" />
            <Text style={styles.startBtnText}>{T('commonDone')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Report Page ──
  if (page === 'report' && selectedPreset) {
    const distressChange = preDistress - postDistress;
    const distressPercent = preDistress > 0 ? Math.round((distressChange / preDistress) * 100) : 0;

    return (
      <View style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.prepHeader}>
          <Text style={[styles.prepTitle, { color: TH.text }]}>{T('breathReport')}</Text>
          <TouchableOpacity onPress={handleFinish}>
            <X size={22} color={TH.sub} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Text style={[styles.reportTitle, { color: TH.text }]}>{T('breathReport')}</Text>

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
            <View style={styles.reportRow}>
              <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathDistressChange')}</Text>
              <Text style={[styles.reportValue, { color: distressChange >= 0 ? '#10B981' : '#EF4444' }]}>
                {preDistress} → {postDistress} ({distressChange >= 0 ? '-' : '+'}{Math.abs(distressPercent)}%)
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: TH.primary, marginTop: 24 }]}
            onPress={handleFinish}
          >
            <Text style={styles.startBtnText}>{T('commonDone')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    width: 28,
    height: 28,
    borderRadius: 14,
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
