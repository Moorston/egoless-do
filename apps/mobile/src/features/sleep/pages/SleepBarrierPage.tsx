// ─── SleepBarrierPage — Barrier (仪轨) session UI ────────────────
// Shows countdown circle, practice selection, and skip button.

import { Wind, Brain, BellRing, BookOpen } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '../../../components/UI';
import { styles } from '../sleepStyles';

/**
 * Props for the {@link SleepBarrierPage} component.
 *
 * @property currentPeriod - The current traditional-Chinese-medicine time
 *   period object containing the period name (`nameZh`) and associated
 *   organ (`organ`).
 * @property remainingSec - Seconds remaining before the barrier countdown
 *   reaches zero.
 * @property barrierDuration - Total barrier duration in minutes, used to
 *   calculate the progress ratio for the countdown display.
 * @property glowAnim - An `Animated.Value` (0-1) driving the pulsing glow
 *   opacity and scale of the countdown circle.
 * @property completedPractice - List of practice type identifiers the user
 *   has already completed during this barrier session (e.g. "breathing").
 * @property awayMin - Total minutes the user spent away from the app
 *   during the barrier session.
 * @property onChoosePractice - Callback invoked when the user taps a
 *   practice option. Receives the practice type string.
 * @property onSkipToGratitude - Callback invoked when the user taps the
 *   skip button to proceed directly to the gratitude phase.
 */
interface Props {
  currentPeriod: { nameZh: string; organ: string };
  remainingSec: number;
  barrierDuration: number;
  glowAnim: Animated.Value;
  completedPractice: string[];
  awayMin: number;
  onChoosePractice: (type: string) => void;
  onSkipToGratitude: () => void;
}

/**
 * Sleep Barrier page component.
 *
 * Renders the active barrier (yigui / ritual) session UI, which consists of:
 *
 * - A **countdown circle** that displays the remaining minutes:seconds and
 *   pulses with a purple glow animation driven by `glowAnim`.
 * - The current TCM time period name and associated organ.
 * - A **practice progress** section listing which practices the user has
 *   completed so far during this barrier session.
 * - A row of four **practice choice buttons** (breathing, meditation,
 *   mantra, reading) that delegate to `onChoosePractice`.
 * - A **skip** button that jumps directly to the gratitude phase via
 *   `onSkipToGratitude`.
 * - A warning showing total away time if the user left the app.
 *
 * @param props - {@link Props}
 * @returns A `SafeAreaView` containing the full barrier session layout
 *   with a dark (#0a0a1a) background.
 */
export default function SleepBarrierPage(props: Props) {
  const { currentPeriod, remainingSec, barrierDuration, glowAnim, completedPractice, awayMin,
    onChoosePractice, onSkipToGratitude } = props;
  const T = useT();

  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <View style={styles.barrierCenter}>
        <Text style={styles.barrierPeriod}>{currentPeriod.nameZh} · {currentPeriod.organ}</Text>

        <Animated.View style={[styles.barrierCircle, {
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
          borderColor: '#8B5CF6',
        }]}>
          <View style={[styles.barrierCircleInner, { borderColor: '#8B5CF6' }]}>
            <Text style={styles.barrierTime}>{min}:{String(sec).padStart(2, '0')}</Text>
            <Text style={styles.barrierLabel}>{T('sleepBarrierActive')}</Text>
          </View>
        </Animated.View>

        {/* Practice progress */}
        {completedPractice.length > 0 && (
          <View style={styles.practiceProgress}>
            <Text style={styles.practiceProgressTitle}>{T('sleepPracticeProgress')}</Text>
            {completedPractice.map(p => (
              <Text key={p} style={styles.practiceProgressItem}>✓ {p}</Text>
            ))}
          </View>
        )}

        {/* Choose practice */}
        <Text style={styles.barrierStepTitle}>{T('sleepStep1')}</Text>
        <View style={styles.barrierChoiceRow}>
          {[
            { type: 'breathing', Icon: Wind, label: T('sleepChooseBreath') },
            { type: 'meditation', Icon: Brain, label: T('sleepChooseMeditate') },
            { type: 'mantra', Icon: BellRing, label: T('sleepChooseMantra') },
            { type: 'reading', Icon: BookOpen, label: T('sleepChooseReading') },
          ].map(({ type, Icon, label }) => (
            <TouchableOpacity key={type} style={styles.barrierChoiceBtn} onPress={() => onChoosePractice(type)}>
              <Icon size={24} color="#8B5CF6" />
              <Text style={styles.barrierChoiceLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.barrierSkipBtn} onPress={onSkipToGratitude}>
          <Text style={styles.barrierSkipText}>{T('sleepStep2')} →</Text>
        </TouchableOpacity>

        {awayMin > 0 && (
          <Text style={styles.barrierAwayText}>{T('sleepBarrierAway')} {awayMin}{T('sleepMinutes')}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
