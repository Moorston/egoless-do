import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useState, useCallback, useEffect } from 'react';

import { useAudioCache } from '../shared/hooks/useAudioCache';

/**
 * Hook for sutra audio playback (MP3 only, no TTS fallback).
 * Uses expo-audio (migrated from expo-av).
 */
export function useSutraAudio() {
  const [source, setSource] = useState<{ uri: string } | undefined>(undefined);
  const [shouldLoop, setShouldLoop] = useState(false);
  const { getCachedPath } = useAudioCache();

  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  // Sync loop setting
  useEffect(() => {
    player.loop = shouldLoop;
  }, [player, shouldLoop]);

  // Track playing state from status
  const isPlaying = status.isLoaded && status.playing;

  // Handle playback finished
  useEffect(() => {
    if (status.didJustFinish && !shouldLoop) {
      // Player auto-stops, nothing to do
    }
  }, [status.didJustFinish, shouldLoop]);

  const stopAudio = useCallback(() => {
    try {
      player.pause();
    } catch {}
    setSource(undefined);
  }, [player]);

  /** Play sutra audio from cache. Returns false if not cached. */
  const playSutra = useCallback(async (
    sutraId: string,
    opts?: { loop?: boolean },
  ): Promise<boolean> => {
    stopAudio();

    const cachedPath = await getCachedPath(sutraId);
    if (!cachedPath) return false;

    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      setShouldLoop(opts?.loop ?? false);
      setSource({ uri: cachedPath });
      return true;
    } catch {
      return false;
    }
  }, [stopAudio, getCachedPath]);

  const stopSutra = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  return { playSutra, stopSutra, isPlaying };
}
