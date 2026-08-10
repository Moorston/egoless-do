// ─── BreathPreparePage — Pre-session preparation UI ─────────────
// Shows preset info, phase diagram, distress scale, audio toggles.

import {createLogger, phaseLabelKey, getDescKey, getTipsKey} from '@egoless-do/core';
import type { BreathingPreset, GuideStyle } from '@egoless-do/core';
import { X, Volume2, VolumeX } from 'lucide-react-native';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { styles } from '../breathStyles';


/**
 * Props for {@link BreathPreparePage}.
 *
 * @property preset           - The selected breathing preset containing phase config, name key, etc.
 * @property guideStyle       - Current guide style (`'scientific'` or `'spiritual'`) used to select
 *                              which description/tips text to display.
 * @property preDistress      - Pre-session distress level selected by the user (0-10 scale).
 * @property setPreDistress   - Setter to update the pre-session distress value.
 * @property voiceEnabled     - Whether voice guidance audio is currently enabled.
 * @property cueEnabled       - Whether phase-change cue sound is currently enabled.
 * @property onToggleVoice    - Callback invoked when the user taps the voice guidance toggle.
 * @property onToggleCue      - Callback invoked when the user taps the cue sound toggle.
 * @property onBack           - Callback invoked when the user taps the close (X) button.
 * @property onBegin          - Callback invoked when the user taps the "Start" button to begin the session.
 */
interface Props {
  preset: BreathingPreset;
  guideStyle: GuideStyle;
  preDistress: number;
  setPreDistress: (n: number) => void;
  voiceEnabled: boolean;
  cueEnabled: boolean;
  onToggleVoice: () => void;
  onToggleCue: () => void;
  onBack: () => void;
  onBegin: () => void;
}

/**
 * Preparation screen shown before a breathing session begins.
 *
 * Renders a scrollable view with:
 *   - Preset name and ratio summary
 *   - Style-aware description card (scientific vs. spiritual)
 *   - Phase diagram with proportional bars for each breath phase
 *   - Pre-session distress scale (0-10) with emoji endpoints
 *   - Audio toggle controls for voice guidance and cue sounds
 *   - "Start" button to begin the active session
 *
 * @param props - See {@link Props}.
 * @returns A `SafeAreaView` containing the full pre-session UI.
 */
export default function BreathPreparePage(props: Props) {
  const { preset, guideStyle, preDistress, setPreDistress, voiceEnabled, cueEnabled,
    onToggleVoice, onToggleCue, onBack, onBegin } = props;
  const TH = useTheme();
  const T = useT();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.prepHeader}>
        <Text style={[styles.prepTitle, { color: TH.text }]}>{T(preset.nameKey)}</Text>
        <TouchableOpacity onPress={onBack}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={[styles.prepSubtitle, { color: TH.sub }]}>
          {T(preset.enKey)} · {T('breathPhaseRatio')} {T(preset.ratioKey)}
        </Text>

        {/* Description */}
        <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathGuideTitle')}</Text>
          <Text style={[styles.infoBody, { color: TH.text }]}>{T(getDescKey(preset, guideStyle))}</Text>
        </View>

        {/* Guide */}
        <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathGuide')}</Text>
          <Text style={[styles.infoBody, { color: TH.text }]}>
            {guideStyle === 'scientific' ? T('breathGuideSci') : T('breathGuideSpr')}
          </Text>
          <Text style={[styles.infoBody, { color: TH.text, marginTop: 8 }]}>
            {T(getTipsKey(preset, guideStyle))}
          </Text>
        </View>

        {/* Phase diagram */}
        <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathPhaseDiagram')}</Text>
          <View style={styles.phaseRow}>
            {preset.phases.map((p, i) => (
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
              onPress={onToggleVoice}
            >
              <View style={[styles.toggleDot, { alignSelf: voiceEnabled ? 'flex-end' : 'flex-start' }]} />
            </TouchableOpacity>
          </View>
          <View style={[styles.audioToggleRow, { marginTop: 10 }]}>
            {cueEnabled ? <Volume2 size={18} color={TH.primary} /> : <VolumeX size={18} color={TH.sub} />}
            <Text style={[styles.audioToggleLabel, { color: TH.text }]}>{T('breathCueSound')}</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: cueEnabled ? TH.primary : `${TH.sub}30` }]}
              onPress={onToggleCue}
            >
              <View style={[styles.toggleDot, { alignSelf: cueEnabled ? 'flex-end' : 'flex-start' }]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: TH.primary }]}
          onPress={onBegin}
        >
          <Text style={styles.startBtnText}>{T('breathStart')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
