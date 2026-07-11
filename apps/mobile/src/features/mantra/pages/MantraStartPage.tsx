// ─── MantraStartPage — Pre-session screen with mantra info and audio ───
// Shows mantra details, audio download/preview, loop option, and begin button.

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL } from '@egoless-do/core';
import type { MantraDef } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';

// ─── Props interface ────────────────────────────────────────────────

/**
 * Props for the {@link MantraStartPage} component.
 *
 * Provides the selected mantra definition, session configuration,
 * audio playback state and controls, and navigation callbacks.
 */
interface Props {
  /** The mantra definition selected by the user for the upcoming session. */
  mantra: MantraDef;
  /** Number of rounds (each round = 108 beads) the user has targeted. */
  targetRounds: number;
  /** Whether the mantra's audio file has been downloaded and cached locally. */
  audioCached: boolean;
  /** Whether the audio should loop continuously during chanting. */
  audioLoop: boolean;
  /** Setter to toggle the audio loop option. */
  setAudioLoop: (v: boolean) => void;
  /** Whether the mantra audio is currently playing. */
  isPlaying: boolean;
  /** The mantra ID currently being downloaded, or null if no download is in progress. */
  downloading: string | null;
  /** Download progress as a fraction from 0 to 1. */
  dlProgress: number;
  /** Callback to navigate back to the mantra selection page. */
  onBack: () => void;
  /** Callback to start the active chanting session. */
  onBeginChanting: () => void;
  /** Callback to initiate downloading the mantra's audio file. */
  onDownloadAudio: () => void;
  /** Callback to preview (play/stop) the cached mantra audio. */
  onPreviewAudio: () => void;
}

/**
 * Pre-session detail page shown before starting a mantra chanting session.
 *
 * Displays:
 * - The mantra name, subtitle, pronunciation guide, and meaning.
 * - Audio controls: download button (if not cached), play/preview button,
 *   download progress indicator, loop toggle, and audio attribution.
 * - A summary of the target rounds configuration.
 * - A prominent "Begin" button to start the active chanting session.
 *
 * @param props - {@link Props}
 * @returns A safe-area view with the pre-session mantra details and controls.
 */
export default function MantraStartPage(props: Props) {
  const {
    mantra, targetRounds, audioCached, audioLoop, setAudioLoop,
    isPlaying, downloading, dlProgress,
    onBack, onBeginChanting, onDownloadAudio, onPreviewAudio,
  } = props;

  const TH = useTheme();
  const T = useT();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Back button */}
      <TouchableOpacity onPress={onBack}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        <Text style={{ fontSize: FONT_BODY(), color: TH.text, marginLeft: 8 }}>{T('chantingBack')}</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: TH.text, marginBottom: 8, textAlign: 'center' }}>
          {mantra.name}
        </Text>
        {mantra.subtitle && (
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 16, textAlign: 'center' }}>{mantra.subtitle}</Text>
        )}
        {mantra.pronunciation && (
          <Text style={{ fontSize: FONT_BODY(), color: '#F59E0B', marginBottom: 16, textAlign: 'center' }}>{mantra.pronunciation}</Text>
        )}
        {mantra.meaning && (
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 24, textAlign: 'center', fontStyle: 'italic' }}>{mantra.meaning}</Text>
        )}

        {/* Audio section */}
        {mantra.audioUrl ? (
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {downloading === mantra.id ? (
              <View style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30`, minWidth: 200, alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.primary }}>{T('chantingDownloadProgress')} {Math.round(dlProgress * 100)}%</Text>
                <View style={{ height: 4, width: '100%', backgroundColor: `${TH.border}60`, borderRadius: 2, marginTop: 8 }}>
                  <View style={{ height: 4, width: `${dlProgress * 100}%`, backgroundColor: TH.primary, borderRadius: 2 }} />
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={audioCached ? onPreviewAudio : onDownloadAudio}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: `${TH.primary}15`, borderWidth: 1, borderColor: `${TH.primary}30` }}>
                <Text style={{ fontSize: 20 }}>{isPlaying ? '🔊' : audioCached ? '▶️' : '⬇️'}</Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.primary }}>
                  {isPlaying ? T('chantingListening') : audioCached ? T('chantingListening') : T('chantingDownloadAudio')}
                </Text>
              </TouchableOpacity>
            )}

            {audioCached && (
              <TouchableOpacity onPress={() => setAudioLoop(!audioLoop)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: TH.primary, backgroundColor: audioLoop ? TH.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {audioLoop && <Text style={{ fontSize: 12, color: '#fff' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{T('chantingLoopAudio')}</Text>
              </TouchableOpacity>
            )}

            {mantra.audioAttribution ? (
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 8, textAlign: 'center' }}>
                {T('chantingAudioSource')}: {mantra.audioAttribution}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 24 }}>{T('chantingNoAudio')}</Text>
        )}

        <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 24, textAlign: 'center' }}>
          {T('mantraTargetDesc')}: {targetRounds} 遍 · 每遍 108 颗
        </Text>

        <TouchableOpacity onPress={onBeginChanting}
          style={{ paddingVertical: 16, paddingHorizontal: 48, borderRadius: 16, backgroundColor: '#FBBF24' }}>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{T('mantraBegin')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
