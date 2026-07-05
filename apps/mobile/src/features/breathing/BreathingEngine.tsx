// ─── BreathingEngine — rAF-driven breathing exercise controller ──
// State machine + rAF loop + hooks; delegates UI to page components.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Animated, Easing, AppState, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import { FONT_BODY, createLogger, fmtMS, dateStr } from '@egoless-do/core';
import type { BreathingPreset } from '@egoless-do/core';
import { cycleDuration } from '@egoless-do/core';
import { useBreathAudio } from './useBreathAudio';
import { useBreathSettings } from './hooks/useBreathSettings';
import { styles } from './breathStyles';
import BreathPreparePage from './pages/BreathPreparePage';
import BreathActivePage from './pages/BreathActivePage';
import BreathReportPage from './pages/BreathReportPage';

const log = createLogger('Breathing');

/** Breathing engine page states — drives the page routing state machine. */
type Page = 'prepare' | 'countdown' | 'active' | 'postDistress' | 'report';

/** Props accepted by BreathingEngine. */
interface Props {
  /** The selected breathing preset to run (e.g. 4-7-8, box breathing). */
  initialPreset: BreathingPreset;
  /** Callback to navigate back to the preset selection screen. */
  onBack: () => void;
}

/**
 * BreathingEngine — requestAnimationFrame-driven breathing exercise controller.
 *
 * Orchestrates the full breathing session lifecycle:
 * - **Prepare** → preset info, pre-distress rating, audio toggles
 * - **Countdown** → 3-2-1 animated countdown before session starts
 * - **Active** → real-time rAF loop driving phase transitions + audio cues
 * - **PostDistress** → post-session distress rating
 * - **Report** → reflection input + save to store
 *
 * The rAF loop is stored in a ref for zero-allocation per-frame execution.
 * UI is delegated to page components; only the timer logic lives here.
 *
 * @param initialPreset - The breathing preset configuration
 * @param onBack - Navigation callback to return to preset selection
 */
export default function BreathingEngine({ initialPreset, onBack }: Props) {
  const TH = useTheme();
  const T = useT();

  /** Extract store actions and language for audio cue localization. */
  const { addBreathRecord, addMedMinutes, addReflection, language } = useShallowStore(s => ({
    addBreathRecord: s.addBreathRecord,
    addMedMinutes: s.addMedMinutes,
    addReflection: s.addReflection,
    language: s.language,
  })));

  /** Persistent user preferences (guideStyle, voice, cue toggles). */
  const settings = useBreathSettings();

  /** Current page state — drives conditional rendering below. */
  const [page, setPage] = useState<Page>('prepare');
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset>(initialPreset);
  /** Ref mirror of selectedPreset — read inside rAF loop without triggering re-renders. */
  const selectedPresetRef = useRef<BreathingPreset>(initialPreset);
  const [cycles, setCycles] = useState(initialPreset.defaultCycles);
  /** Ref mirror of cycles — read inside rAF loop. */
  const cyclesRef = useRef(initialPreset.defaultCycles);

  // Audio — store in refs for stable breathLoop (rAF callback must have zero deps)
  const speechLanguage = language === 'en' ? 'en-US' : language === 'zh-Hant' ? 'zh-TW' : 'zh-CN';
  const phaseLabels = useMemo(() => ({
    inhale: T('breathInhale'),
    hold: T('breathHold'),
    exhale: T('breathExhale'),
  }), [T]);
  const { playPhaseSound, speakCount, speakPhase, resetCount } = useBreathAudio({
    cueEnabled: settings.cueEnabled, voiceEnabled: settings.voiceEnabled, phaseLabels, speechLanguage,
  });
  /** Ref to latest audio functions — allows rAF loop to access stable references. */
  const audioRef = useRef({ playPhaseSound, speakCount, speakPhase, resetCount });
  audioRef.current = { playPhaseSound, speakCount, speakPhase, resetCount };

  // ── Breathing state (all driven by rAF + shared clock) ─────────
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [phaseSec, setPhaseSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  /** Ref mirror of isPaused — read inside rAF loop without triggering re-renders. */
  const isPausedRef = useRef(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const countdownAnim = useRef(new Animated.Value(1)).current;
  /** Handle for the current requestAnimationFrame — null when idle or paused. */
  const rafRef = useRef<number | null>(null);
  /** Timestamp when the breathing session began (after countdown). */
  const startTimeRef = useRef(0);
  /** Accumulated pause duration in ms — subtracted from wall-clock elapsed. */
  const pausedElapsedRef = useRef(0);
  /** Index of the last phase that triggered audio — avoids duplicate speak calls. */
  const lastPhaseIdxRef = useRef(-1);
  /** Last second value that triggered speakCount — prevents double-counting. */
  const lastSecRef = useRef(-1);

  // ── Long-press tracking (hold-to-end gesture) ──────────────────
  const holdCompletedRef = useRef(false);
  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdScale = useRef(new Animated.Value(1)).current;
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Distress self-assessment (0-10 scale) ───────────────────────
  const [preDistress, setPreDistress] = useState(5);
  const [postDistress, setPostDistress] = useState(5);

  /**
   * Main rAF loop — stored in ref for zero-dep, never-recreated callback.
   *
   * Calculates the current breathing phase from elapsed time,
   * updates UI state, and triggers audio cues on phase transitions.
   * Terminates when total duration is reached.
   */
  const breathLoopRef = useRef<(() => void) | null>(null);
  breathLoopRef.current = () => {
    const preset = selectedPresetRef.current;
    if (!preset || isPausedRef.current) return;
    const now = Date.now();
    const elapsed = (now - startTimeRef.current - pausedElapsedRef.current) / 1000;
    const audio = audioRef.current;

    // Check if all cycles are complete
    const cycleDur = cycleDuration(preset);
    const totalDur = cycleDur * cyclesRef.current;
    if (elapsed >= totalDur) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setTotalElapsed(Math.floor(totalDur));
      setPage('postDistress');
      return;
    }

    // Determine which cycle and phase we are in
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

    // Update UI state
    setCurrentCycle(curCycle);
    setCurrentPhaseIdx(phaseIdx);
    setPhaseSec(curSec);
    setTotalElapsed(Math.floor(elapsed));

    // Trigger audio cues on phase transition
    if (phaseIdx !== lastPhaseIdxRef.current) {
      lastPhaseIdxRef.current = phaseIdx;
      lastSecRef.current = curSec;
      audio.resetCount();
      audio.playPhaseSound();
      audio.speakPhase(curPhase.type);
    }

    // Speak countdown within each phase
    if (curSec !== lastSecRef.current && curSec > 0) {
      lastSecRef.current = curSec;
      audio.speakCount(curPhase.durationSec - curSec);
    }

    // Schedule next frame
    rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
  };

  /**
   * Pause/resume effect — stops and restarts the rAF loop.
   * Tracks pause duration so the clock remains accurate across pauses.
   */
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

  /**
   * AppState effect — pauses rAF when app goes to background,
   * resumes on foreground with elapsed time adjusted for background duration.
   */
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

  /** Cleanup effect — cancels all animation frames and timers on unmount. */
  useEffect(() => {
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
      holdAnim.removeAllListeners();
    };
  }, []);

  /**
   * Countdown effect — drives the 3→2→1 animated countdown.
   * Each tick decrements the number with a spring animation.
   * When countdown reaches 0, the rAF breathing loop starts.
   */
  useEffect(() => {
    if (page !== 'countdown') return;
    countdownAnim.setValue(0);
    Animated.spring(countdownAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    const timer = setTimeout(() => {
      if (countdownNum > 1) {
        setCountdownNum(n => n - 1);
      } else {
        // Countdown done — start the breathing rAF loop
        startTimeRef.current = Date.now();
        rafRef.current = requestAnimationFrame(() => breathLoopRef.current?.());
        setPage('active');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [page, countdownNum, countdownAnim]);

  /**
   * Resets all state and starts the countdown sequence.
   * Called when the user taps "Start" on the prepare page.
   */
  const handleBeginBreathing = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    holdAnim.setValue(0);
    holdScale.setValue(1);
    holdCompletedRef.current = false;
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    selectedPresetRef.current = selectedPreset;
    cyclesRef.current = cycles;
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

  /**
   * Toggles pause/resume of the breathing session.
   * Ignores the tap if a long-press just completed (prevents accidental resume).
   */
  const handleTogglePause = useCallback(() => {
    if (holdCompletedRef.current) { holdCompletedRef.current = false; return; }
    setIsPaused(p => !p);
  }, []);

  /**
   * Starts the long-press ring fill animation (3 seconds to complete).
   * Only activates when paused. If held for 3s, triggers session end.
   */
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

  /**
   * Cancels the long-press ring animation if the user releases early.
   * Resets the ring fill with a smooth 200ms fade-out.
   */
  const handleHoldEnd = useCallback(() => {
    if (holdCompletedRef.current) return;
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.removeAllListeners();
    Animated.spring(holdScale, { toValue: 1, damping: 10, useNativeDriver: true }).start();
    holdAnim.stopAnimation(() => {
      Animated.timing(holdAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    });
  }, [holdAnim, holdScale]);

  /**
   * Cleans up all animation state and navigates back.
   * Called when user dismisses the report page or finishes early.
   */
  const handleFinish = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    holdAnim.setValue(0);
    holdScale.setValue(1);
    holdCompletedRef.current = false;
    isPausedRef.current = false;
    setReflection('');
    setSaving(false);
    onBack();
  }, [holdAnim, holdScale, onBack]);

  /**
   * Persists the completed breathing session to the store.
   * Saves a BreathRecord, adds meditation minutes, and optionally creates
   * a reflection entry from the user's reflection text.
   */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      addBreathRecord({
        date: dateStr(),
        presetKey: selectedPreset?.key ?? 'unknown',
        durationSec: totalElapsed,
        cycles,
        preDistress,
        postDistress,
        reflection: reflection.trim() || undefined,
        guideStyle: settings.guideStyle,
      });
      addMedMinutes(Math.round(totalElapsed / 60));
      if (reflection.trim()) {
        addReflection({ content: reflection.trim(), tags: [T('breathReflectionTag')], mood: '' });
      }
    } catch (e) {
      log.warn('Save breathing record failed', e);
      Alert.alert(T('breathSaveFailed') || '保存失败', T('breathRetry') || '请重试');
    }
    setSaving(false);
    handleFinish();
  }, [reflection, totalElapsed, cycles, preDistress, postDistress, settings.guideStyle, selectedPreset, handleFinish, addBreathRecord, addMedMinutes, addReflection]);

  // ── Page routing ──────────────────────────────────────────────

  if (page === 'prepare' && selectedPreset) {
    return (
      <BreathPreparePage
        preset={selectedPreset}
        guideStyle={settings.guideStyle}
        preDistress={preDistress}
        setPreDistress={setPreDistress}
        voiceEnabled={settings.voiceEnabled}
        cueEnabled={settings.cueEnabled}
        onToggleVoice={settings.toggleVoice}
        onToggleCue={settings.toggleCue}
        onBack={onBack}
        onBegin={handleBeginBreathing}
      />
    );
  }

  if (page === 'countdown') {
    return (
      <SafeAreaView style={[styles.activeContainer, { backgroundColor: '#0a0a1a' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.Text style={{
            fontSize: 120, fontWeight: '900', color: '#fff', opacity: countdownAnim,
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

  if (page === 'active' && selectedPreset) {
    return (
      <BreathActivePage
        preset={selectedPreset}
        currentCycle={currentCycle}
        currentPhaseIdx={currentPhaseIdx}
        phaseSec={phaseSec}
        totalElapsed={totalElapsed}
        cycles={cycles}
        isPaused={isPaused}
        holdAnim={holdAnim}
        holdScale={holdScale}
        onTogglePause={handleTogglePause}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
      />
    );
  }

  if ((page === 'postDistress' || page === 'report') && selectedPreset) {
    return (
      <BreathReportPage
        preset={selectedPreset}
        cycles={cycles}
        totalElapsed={totalElapsed}
        preDistress={preDistress}
        postDistress={postDistress}
        setPostDistress={setPostDistress}
        reflection={reflection}
        setReflection={setReflection}
        saving={saving}
        onClose={handleFinish}
        onSave={handleSave}
      />
    );
  }

  return null;
}
