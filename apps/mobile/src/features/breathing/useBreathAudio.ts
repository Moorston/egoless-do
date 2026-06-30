// ─── Breathing Audio Hook ──────────────────────────────────
// expo-audio: phase cue sounds
// expo-speech: voice counting + phase announcements

import { useEffect, useRef, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { createLogger } from '@egoless-do/core';

const log = createLogger('BreathAudio');

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

const PHASE_LABELS: Record<string, string> = {
  inhale: '吸气',
  hold: '闭气',
  exhale: '呼气',
};

export interface BreathAudioOptions {
  cueEnabled: boolean;
  voiceEnabled: boolean;
}

export function useBreathAudio(opts: BreathAudioOptions) {
  const cuePlayer = useAudioPlayer(opts.cueEnabled ? BELL_FILE : undefined);
  const lastCountRef = useRef(-1);
  const voiceEnabledRef = useRef(opts.voiceEnabled);
  voiceEnabledRef.current = opts.voiceEnabled;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch(e => log.warn('setAudioMode failed', e));
  }, []);

  useEffect(() => {
    if (cuePlayer) cuePlayer.volume = 0.3;
  }, [cuePlayer]);

  const playPhaseSound = useCallback(() => {
    if (!opts.cueEnabled || !cuePlayer) return;
    try {
      cuePlayer.seekTo(0);
      cuePlayer.play();
    } catch (e) {
      log.warn('Phase sound failed', e);
    }
  }, [cuePlayer, opts.cueEnabled]);

  const speakCount = useCallback((num: number) => {
    if (!voiceEnabledRef.current) return;
    if (num === lastCountRef.current) return;
    lastCountRef.current = num;
    Speech.speak(String(num), { language: 'zh-CN', rate: 0.9 });
  }, []);

  const speakPhase = useCallback((phaseType: string) => {
    if (!voiceEnabledRef.current) return;
    const label = PHASE_LABELS[phaseType];
    if (label) {
      Speech.speak(label, { language: 'zh-CN', rate: 0.7 });
    }
  }, []);

  const resetCount = useCallback(() => {
    lastCountRef.current = -1;
  }, []);

  // Stop speech on unmount
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  return { playPhaseSound, speakCount, speakPhase, resetCount };
}
