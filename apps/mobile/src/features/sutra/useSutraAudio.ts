import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useAudioCache } from '../shared/hooks/useAudioCache';

/**
 * Hook for sutra audio playback (MP3 only, no TTS fallback).
 */
export function useSutraAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { getCachedPath } = useAudioCache();

  const stopAudio = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) { setIsPlaying(false); return; }
    soundRef.current = null; // prevent re-entry
    try {
      sound.setOnPlaybackStatusUpdate(null);
      try { await sound.stopAsync(); } catch {}
      await sound.unloadAsync();
    } catch {}
    setIsPlaying(false);
  }, []);

  /** Play sutra audio from cache. Returns false if not cached. */
  const playSutra = useCallback(async (
    sutraId: string,
    opts?: { loop?: boolean },
  ): Promise<boolean> => {
    await stopAudio();

    const cachedPath = await getCachedPath(sutraId);
    if (!cachedPath) return false;

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: cachedPath },
        { shouldPlay: true, isLooping: opts?.loop ?? false },
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ('error' in status && status.error) setIsPlaying(false);
          return;
        }
        if (status.didJustFinish && !opts?.loop) {
          setIsPlaying(false);
        }
      });
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, [stopAudio, getCachedPath]);

  const stopSutra = useCallback(async () => {
    await stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        const sound = soundRef.current;
        soundRef.current = null;
        sound.setOnPlaybackStatusUpdate(null);
        sound.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return { playSutra, stopSutra, isPlaying };
}
