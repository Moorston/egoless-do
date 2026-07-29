// ─── Breathing Audio Hook ──────────────────────────────────
// expo-audio: phase cue sounds (loaded on first use)
// expo-speech: voice counting + phase announcements (loaded on first use)

import { createLogger } from '@egoless-do/core';
import { useEffect, useRef, useCallback } from 'react';

const log = createLogger('BreathAudio');

// Lazy-loaded native modules — deferred until first actual use
let _Speech: typeof import('expo-speech') | null = null;
let _AudioModeAsync: typeof import('expo-audio').setAudioModeAsync | null = null;
let _useAudioPlayer: typeof import('expo-audio').useAudioPlayer | null = null;

function getSpeech() {
  if (!_Speech) _Speech = require('expo-speech');
  return _Speech;
}

function getAudioModeAsync() {
  if (!_AudioModeAsync) {
    _AudioModeAsync = require('expo-audio').setAudioModeAsync;
  }
  return _AudioModeAsync;
}

function getUseAudioPlayer() {
  if (!_useAudioPlayer) {
    _useAudioPlayer = require('expo-audio').useAudioPlayer;
  }
  return _useAudioPlayer;
}

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export interface BreathAudioOptions {
  cueEnabled: boolean;
  voiceEnabled: boolean;
  phaseLabels?: Record<string, string>;
  speechLanguage?: string;
}

export function useBreathAudio(opts: BreathAudioOptions) {
  // useAudioPlayer is a hook — must be called unconditionally.
  // We lazy-require the module but call the hook synchronously.
  const useAudioPlayerHook = getUseAudioPlayer()!;
  const cuePlayer = useAudioPlayerHook(opts.cueEnabled ? BELL_FILE : undefined);
  const lastCountRef = useRef(-1);
  const voiceEnabledRef = useRef(opts.voiceEnabled);
  voiceEnabledRef.current = opts.voiceEnabled;

  useEffect(() => {
    getAudioModeAsync()!({
      playsInSilentMode: true,
    }).catch(e => log.warn('setAudioMode failed', e));
  }, []);

  useEffect(() => {
    if (cuePlayer) cuePlayer.volume = 0.3;
  }, [cuePlayer]);

  const playPhaseSound = useCallback(() => {
    if (!opts.cueEnabled || !cuePlayer) return;
    try {
      void cuePlayer.seekTo(0);
      cuePlayer.play();
    } catch (e) {
      log.warn('Phase sound failed', e);
    }
  }, [cuePlayer, opts.cueEnabled]);

  const speakCount = useCallback((num: number) => {
    if (!voiceEnabledRef.current) return;
    if (num === lastCountRef.current) return;
    lastCountRef.current = num;
    const Speech = getSpeech()!;
    void Speech.stop();
    Speech.speak(String(num), { language: opts.speechLanguage ?? 'zh-CN', rate: 0.9 });
  }, [opts.speechLanguage]);

  const speakPhase = useCallback((phaseType: string) => {
    if (!voiceEnabledRef.current) return;
    const label = opts.phaseLabels?.[phaseType];
    if (label) {
      const Speech = getSpeech()!;
      void Speech.stop();
      Speech.speak(label, { language: opts.speechLanguage ?? 'zh-CN', rate: 0.7 });
    }
  }, [opts.phaseLabels, opts.speechLanguage]);

  const resetCount = useCallback(() => {
    lastCountRef.current = -1;
  }, []);

  // Stop speech on unmount (lazy load only if speech was ever used)
  useEffect(() => {
    return () => { if (_Speech) void _Speech.stop(); };
  }, []);

  return { playPhaseSound, speakCount, speakPhase, resetCount };
}
