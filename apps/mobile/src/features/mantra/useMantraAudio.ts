import { useState, useCallback, useRef, useEffect } from 'react';

import { useAudioCache } from '../shared/hooks/useAudioCache';

// Lazy-loaded native modules — deferred until first mantra playback
let _Speech: typeof import('expo-speech') | null = null;
let _Audio: typeof import('expo-av').Audio | null = null;

function getSpeech() { return _Speech ??= require('expo-speech'); }
function getAudio() { return _Audio ??= require('expo-av').Audio; }

/**
 * Hook for mantra audio playback.
 * Priority: cached MP3 (expo-av) → fallback expo-speech TTS.
 */
export function useMantraAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<any>(null);
  const loopRef = useRef(false);
  const ttsNameRef = useRef('');
  const { getCachedPath } = useAudioCache();

  const stopAll = useCallback(async () => {
    loopRef.current = false;
    if (soundRef.current) {
      const sound = soundRef.current;
      soundRef.current = null;
      try {
        sound.setOnPlaybackStatusUpdate(null);
        try { await sound.stopAsync(); } catch {}
        await sound.unloadAsync();
      } catch {}
    }
    if (_Speech) _Speech.stop();
    setIsPlaying(false);
  }, []);

  /** Play mantra audio. Tries MP3 first, falls back to TTS. */
  const playMantra = useCallback(async (
    mantraId: string,
    mantraName: string,
    opts?: { loop?: boolean },
  ) => {
    await stopAll();
    loopRef.current = opts?.loop ?? false;

    const cachedPath = await getCachedPath(mantraId);
    if (cachedPath) {
      // MP3 playback via expo-av
      try {
        const Audio = getAudio();
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: cachedPath },
          { shouldPlay: true, isLooping: opts?.loop ?? false },
        );
        soundRef.current = sound;
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate((status: import('expo-av').AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if ('error' in status && status.error) setIsPlaying(false);
            return;
          }
          if (status.didJustFinish && !opts?.loop) {
            setIsPlaying(false);
          }
        });
        return;
      } catch {
        // Fall through to TTS
      }
    }

    // TTS fallback
    const Speech = getSpeech();
    ttsNameRef.current = mantraName;
    setIsPlaying(true);
    Speech.speak(mantraName, {
      language: 'zh-CN',
      rate: 0.7,
      pitch: 1.0,
      onDone: () => {
        if (loopRef.current) {
          Speech.speak(ttsNameRef.current, { language: 'zh-CN', rate: 0.7, pitch: 1.0 });
        } else {
          setIsPlaying(false);
        }
      },
      onStopped: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  }, [stopAll, getCachedPath]);

  const stopMantra = useCallback(async () => {
    await stopAll();
  }, [stopAll]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (_Speech) _Speech.stop();
    };
  }, []);

  return { playMantra, stopMantra, isPlaying };
}
