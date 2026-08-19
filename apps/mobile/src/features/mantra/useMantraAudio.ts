import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useAudioCache } from '../shared/hooks/useAudioCache';

// Lazy-loaded native module — deferred until first TTS fallback
let _Speech: typeof import('expo-speech') | null = null;
function getSpeech() { return _Speech ??= require('expo-speech') as typeof import('expo-speech'); }

/**
 * Hook for mantra audio playback.
 * Priority: cached MP3 (expo-audio) → fallback expo-speech TTS.
 */
export function useMantraAudio() {
  const [source, setSource] = useState<{ uri: string } | undefined>(undefined);
  const [shouldLoop, setShouldLoop] = useState(false);
  const loopRef = useRef(false);
  const ttsNameRef = useRef('');
  const { getCachedPath } = useAudioCache();

  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  // Sync loop setting
  useEffect(() => {
    player.loop = shouldLoop;
  }, [player, shouldLoop]);

  const isPlaying = status.isLoaded && status.playing;

  const stopAll = useCallback(() => {
    loopRef.current = false;
    try {
      player.pause();
    } catch {}
    setSource(undefined);
    if (_Speech) void _Speech.stop();
  }, [player]);

  /** Play mantra audio. Tries MP3 first, falls back to TTS. */
  const playMantra = useCallback(async (
    mantraId: string,
    mantraName: string,
    opts?: { loop?: boolean },
  ) => {
    stopAll();
    loopRef.current = opts?.loop ?? false;

    const cachedPath = await getCachedPath(mantraId);
    if (cachedPath) {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        setShouldLoop(opts?.loop ?? false);
        setSource({ uri: cachedPath });
        return;
      } catch {
        // Fall through to TTS
      }
    }

    // TTS fallback
    const Speech = getSpeech();
    ttsNameRef.current = mantraName;
    Speech.speak(mantraName, {
      language: 'zh-CN',
      rate: 0.7,
      pitch: 1.0,
      onDone: () => {
        if (loopRef.current) {
          Speech.speak(ttsNameRef.current, { language: 'zh-CN', rate: 0.7, pitch: 1.0 });
        }
      },
      onStopped: () => {},
      onError: () => {},
    });
  }, [stopAll, getCachedPath]);

  const stopMantra = useCallback((): Promise<void> => {
    stopAll();
    return Promise.resolve();
  }, [stopAll]);

  useEffect(() => {
    return () => {
      try { player.pause(); } catch {}
      if (_Speech) void _Speech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, []);

  return { playMantra, stopMantra, isPlaying };
}
