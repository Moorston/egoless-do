// ─── MantraActivePage — Active chanting session UI ───────────────
// Shows MalaRing counter, controls (undo/audio/pause/stop), exit button.

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../../components/UI';
import { FONT_BODY, FONT_SUB, FONT_SMALL } from '@egoless-do/core';
import { MalaRing } from '../../shared/components/MalaRing';

// ─── Props interface ────────────────────────────────────────────────

/**
 * Props for the {@link MantraActivePage} component.
 *
 * Provides all the state, display values, formatting utilities,
 * and action callbacks needed for the active chanting UI.
 */
interface Props {
  /** Display name of the mantra being chanted. */
  mantraName: string;
  /** Optional pronunciation guide text shown below the mantra name. */
  mantraPronunciation?: string;
  /** Current bead count for the active session. */
  count: number;
  /** Elapsed active time in milliseconds (excluding paused time). */
  elapsed: number;
  /** Target number of rounds for this session. */
  targetRounds: number;
  /** Number of beads per round (typically 108). */
  BEAD_COUNT: number;
  /** Whether the session is currently paused. */
  isPaused: boolean;
  /** Whether the mantra audio is currently playing. */
  isPlaying: boolean;
  /** Utility function to format milliseconds into a human-readable time string. */
  formatTime: (ms: number) => string;
  /** Callback invoked when the user taps anywhere on the mala ring area to count a bead. */
  onTap: () => void;
  /** Callback to undo the last bead count (decrement by 1). */
  onUndo: () => void;
  /** Callback to toggle audio playback on/off. */
  onToggleAudio: () => void;
  /** Callback to toggle between paused and active states. */
  onTogglePause: () => void;
  /** Callback to end the current session and navigate to the report. */
  onEndSession: () => void;
  /** Callback to exit the session (abandon without saving). */
  onExit: () => void;
}

/**
 * Active chanting session page.
 *
 * This is the primary interaction screen during a mantra session. It provides:
 * - A full-screen tappable area centered on a {@link MalaRing} visualization
 *   where each tap counts one bead.
 * - The mantra name and pronunciation displayed above the ring.
 * - Elapsed time and target-round summary below the ring.
 * - A hint text prompting the user to tap anywhere to count.
 * - An exit button (top-right corner) to abandon the session.
 * - A bottom control bar with four actions: undo last bead, toggle audio,
 *   pause/resume, and stop (end session).
 *
 * @param props - {@link Props}
 * @returns A full-screen safe-area view with the chanting UI.
 */
export default function MantraActivePage(props: Props) {
  const {
    mantraName, mantraPronunciation, count, elapsed, targetRounds, BEAD_COUNT,
    isPaused, isPlaying, formatTime,
    onTap, onUndo, onToggleAudio, onTogglePause, onEndSession, onExit,
  } = props;

  const TH = useTheme();
  const T = useT();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Exit button */}
      <TouchableOpacity onPress={onExit}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: `${TH.card}CC` }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#EF4444' }}>✕ {T('chantingExit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={onTap}
      >
        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4 }}>{mantraName}</Text>
        {mantraPronunciation && (
          <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 4 }}>{mantraPronunciation}</Text>
        )}

        <MalaRing
          count={count}
          beadCount={BEAD_COUNT}
          size={280}
          beadColor="#FBBF24"
          trackColor={`${TH.border}40`}
          textColor="#FBBF24"
          centerSubLabel={'108'}
          centerLabel={`${T('mantraRounds')}: ${Math.floor(count / BEAD_COUNT)}`}
        />

        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 16 }}>
          {formatTime(elapsed)} · {T('mantraTarget')}: {targetRounds} {T('mantraRounds')}
        </Text>

        <Text style={{ fontSize: FONT_SMALL, color: `${TH.sub}80`, marginTop: 8 }}>
          {T('mantraTapAnywhere')}
        </Text>
      </TouchableOpacity>

      {/* Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 32, paddingBottom: 20 }}>
        <TouchableOpacity onPress={onUndo}
          style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: TH.card }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>← {T('mantraBack')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleAudio}
          style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: isPlaying ? '#F59E0B' : TH.card }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: isPlaying ? '#fff' : TH.text }}>
            {isPlaying ? '🔊' : '🔇'}
          </Text>
        </TouchableOpacity>

        {isPaused ? (
          <TouchableOpacity onPress={onTogglePause}
            style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#10B981' }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('mantraResume')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onTogglePause}
            style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: TH.card }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('mantraPause')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onEndSession}
          style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#EF4444' }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#fff' }}>{T('mantraStop')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
