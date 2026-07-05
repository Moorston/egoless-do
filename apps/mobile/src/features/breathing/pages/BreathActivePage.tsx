// ─── BreathActivePage — Active breathing session UI ──────────────
// Shows breathing bubble, cycle counter, pause button with ring progress.

import React from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BODY, FONT_SUB, FONT_STAT_SECTION, fmtMS } from '@egoless-do/core';
import type { BreathingPreset } from '@egoless-do/core';
import { phaseLabelKey } from '@egoless-do/core';
import { Play, Pause } from 'lucide-react-native';
import { styles } from '../breathStyles';

/**
 * Props for {@link BreathActivePage}.
 *
 * @property preset         - The active breathing preset (phases, name key, ratio key).
 * @property currentCycle    - Zero-based index of the current breathing cycle.
 * @property currentPhaseIdx - Zero-based index into `preset.phases` for the active phase.
 * @property phaseSec        - Elapsed seconds within the current phase.
 * @property totalElapsed    - Total elapsed seconds since the session started.
 * @property cycles          - Total number of cycles configured for this session.
 * @property isPaused        - Whether the session is currently paused.
 * @property holdAnim        - Animated.Value (0-1) driving the ring progress fill on the
 *                             pause button; animates over 3 seconds of long-press.
 * @property holdScale       - Animated.Value controlling the scale transform on the pause
 *                             button during a long-press (pulses outward).
 * @property onTogglePause   - Callback invoked on tap to toggle pause/resume.
 * @property onHoldStart     - Callback invoked on press-in to start the long-press end-session timer.
 * @property onHoldEnd       - Callback invoked on press-out to cancel the long-press timer.
 */
interface Props {
  preset: BreathingPreset;
  currentCycle: number;
  currentPhaseIdx: number;
  phaseSec: number;
  totalElapsed: number;
  cycles: number;
  isPaused: boolean;
  holdAnim: Animated.Value;
  holdScale: Animated.Value;
  onTogglePause: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

/**
 * Active breathing session screen displayed while the user is performing the exercise.
 *
 * Renders:
 *   - Preset name and ratio header
 *   - Central breathing bubble that scales based on the current phase (inhale grows,
 *     exhale shrinks, hold gently pulses) with a countdown timer inside
 *   - Cycle counter ("Cycle X / Y") and total elapsed time
 *   - A single pause/resume button with an animated ring progress indicator
 *     (long-pressing for 3 seconds ends the session via `onHoldEnd` / ring fill)
 *   - A hint label shown only when paused, instructing the user to long-press to end
 *
 * @param props - See {@link Props}.
 * @returns A `SafeAreaView` containing the active session UI.
 */
export default function BreathActivePage(props: Props) {
  const { preset, currentCycle, currentPhaseIdx, phaseSec, totalElapsed, cycles, isPaused,
    holdAnim, holdScale, onTogglePause, onHoldStart, onHoldEnd } = props;
  const TH = useTheme();
  const T = useT();

  const currentPhase = preset.phases[currentPhaseIdx];
  const phaseProgress = currentPhase ? phaseSec / currentPhase.durationSec : 0;
  const phaseColor = currentPhase.type === 'inhale' ? '#10B981'
    : currentPhase.type === 'exhale' ? '#EF4444' : '#F59E0B';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.activeHeader}>
        <Text style={[styles.activeTitle, { color: TH.text }]}>{T(preset.nameKey)}</Text>
        <Text style={[styles.activeSubtitle, { color: TH.sub }]}>{T('breathPhaseRatio')} {T(preset.ratioKey)}</Text>
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
          <Text style={[styles.phaseCountdown, { color: phaseColor }]}>{Math.max(0, currentPhase.durationSec - phaseSec)}</Text>
        </View>

        {/* Cycle counter */}
        <Text style={[styles.cycleText, { color: TH.sub }]}>
          {T('breathCycles')} {currentCycle + 1} / {cycles}
        </Text>

        {/* Total time */}
        <Text style={[styles.timeText, { color: TH.sub }]}>{fmtMS(totalElapsed)}</Text>
      </View>

      {/* Controls — single pause button with ring progress, long-press to end */}
      <View style={styles.activeControls}>
        <Animated.View style={{ transform: [{ scale: holdScale }] }}>
          <TouchableOpacity
            style={[styles.pauseBtn, { backgroundColor: isPaused ? '#EF4444' : TH.primary }]}
            onPress={onTogglePause}
            onPressIn={onHoldStart}
            onPressOut={onHoldEnd}
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
