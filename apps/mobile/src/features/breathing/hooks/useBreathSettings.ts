// ─── useBreathSettings — Breathing audio preference persistence ───
// Loads and saves guideStyle, voiceEnabled, cueEnabled to AsyncStorage.

import { createLogger } from '@egoless-do/core';
import type { GuideStyle } from '@egoless-do/core';
import { safeGetItem, safeSetItem, safeMultiGet } from '../../../store/safeAsyncStorage';
import { useState, useEffect, useCallback } from 'react';

const log = createLogger('Breathing');
const GUIDE_STYLE_KEY = 'breathing_guide_style';
const VOICE_KEY = 'breathing_voice_enabled';
const CUE_KEY = 'breathing_cue_enabled';

/**
 * Hook that manages breathing session audio/guide preferences with AsyncStorage persistence.
 *
 * Loads `guideStyle`, `voiceEnabled`, and `cueEnabled` from AsyncStorage on mount and
 * provides toggle functions that atomically update state and persist to storage.
 *
 * @returns An object containing:
 *   - `guideStyle` — current guide style (`'scientific'` or `'spiritual'`)
 *   - `setGuideStyle` — raw React setter for guide style (not auto-persisted)
 *   - `voiceEnabled` — whether voice guidance audio is on
 *   - `toggleVoice` — callback to flip and persist `voiceEnabled`
 *   - `cueEnabled` — whether phase-change cue sounds are on
 *   - `toggleCue` — callback to flip and persist `cueEnabled`
 *   - `toggleGuideStyle` — callback to flip guide style (see note below)
 *
 * Side effects:
 *   - Reads three keys from AsyncStorage on mount.
 *   - Writes to AsyncStorage on every toggle.
 */
export function useBreathSettings() {
  const [guideStyle, setGuideStyle] = useState<GuideStyle>('scientific');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cueEnabled, setCueEnabled] = useState(true);

  /**
   * Effect: load persisted preferences from AsyncStorage on mount.
   *
   * Side effects: reads GUIDE_STYLE_KEY, VOICE_KEY, CUE_KEY from AsyncStorage
   * and updates corresponding state. Logs a warning on failure.
   */
  useEffect(() => {
    safeMultiGet([GUIDE_STYLE_KEY, VOICE_KEY, CUE_KEY]).then(vals => {
      vals.forEach(([k, v]) => {
        if (k === GUIDE_STYLE_KEY && (v === 'scientific' || v === 'spiritual')) setGuideStyle(v);
        if (k === VOICE_KEY && v !== null) setVoiceEnabled(v === '1');
        if (k === CUE_KEY && v !== null) setCueEnabled(v === '1');
      });
    }).catch((e: unknown) => log.warn('AsyncStorage error', e));
  }, []);

  /**
   * Toggle voice guidance on/off and persist the new value to AsyncStorage.
   *
   * @returns void
   * Side effects: updates `voiceEnabled` state and writes to AsyncStorage.
   */
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => {
      const next = !v;
      safeSetItem(VOICE_KEY, next ? '1' : '0').catch((e: unknown) => log.warn('AsyncStorage error', e));
      return next;
    });
  }, []);

  /**
   * Toggle cue sound on/off and persist the new value to AsyncStorage.
   *
   * @returns void
   * Side effects: updates `cueEnabled` state and writes to AsyncStorage.
   */
  const toggleCue = useCallback(() => {
    setCueEnabled(v => {
      const next = !v;
      AsyncStorage.setItem(CUE_KEY, next ? '1' : '0').catch((e: unknown) => log.warn('AsyncStorage error', e));
      return next;
    });
  }, []);

  /**
   * Toggle guide style between `'scientific'` and `'spiritual'`.
   *
   * @returns void
   * Side effects: updates `guideStyle` state only (does NOT persist to AsyncStorage).
   *
   * **Note:** This function is currently unused — no consumer destructures or calls it.
   * The `guideStyle` value is read directly by `BreathingEngine` but style switching
   * is handled elsewhere (`BreathingScreen` has its own local state for this).
   * Consider removing if not needed, or adding AsyncStorage persistence if it should be retained.
   */
  // unused — no consumer calls toggleGuideStyle; kept for potential future use
  const toggleGuideStyle = useCallback(() => {
    setGuideStyle(s => s === 'scientific' ? 'spiritual' : 'scientific');
  }, []);

  return {
    guideStyle,
    setGuideStyle,
    voiceEnabled,
    toggleVoice,
    cueEnabled,
    toggleCue,
    toggleGuideStyle,
  };
}
