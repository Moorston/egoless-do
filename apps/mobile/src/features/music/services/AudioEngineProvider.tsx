import React, { useEffect, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useMusicStore } from '../useMusicStore';
import type { MusicTrack } from '@egoless-do/core';
import { audioPlayerRef } from './audioPlayerRef';

/**
 * 全局音频引擎 Provider，挂载在 App 顶层。
 * 监听 useMusicStore 状态变化执行播放控制。
 * 使用 useAudioPlayerStatus 同步播放进度到 store。
 */
export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const volume = useMusicStore(s => s.volume);
  const loop = useMusicStore(s => s.loop);
  const playMode = useMusicStore(s => s.playMode);

  const source = currentTrack
    ? (currentTrack.file ? currentTrack.file : currentTrack.uri ? { uri: currentTrack.uri } : undefined)
    : undefined;

  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  // Sync playback status to store
  useEffect(() => {
    useMusicStore.getState().setPlaybackStatus(status.currentTime, status.duration);
  }, [status.currentTime, status.duration]);

  // Handle track finished
  useEffect(() => {
    if (status.didJustFinish) {
      if (playMode === 'repeat-one') {
        // loop is handled by player.loop, just restart
        return;
      }
      useMusicStore.getState().playNext();
    }
  }, [status.didJustFinish, playMode]);

  useEffect(() => {
    audioPlayerRef.current = player;
    return () => { audioPlayerRef.current = null; };
  }, [player]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  // Set loop based on playMode
  useEffect(() => {
    player.loop = playMode === 'repeat-one';
  }, [player, playMode]);

  // Unified play/pause/track-change effect
  const prevTrackRef = useRef<MusicTrack | null>(null);
  useEffect(() => {
    if (!currentTrack) {
      if (player.playing) player.pause();
      prevTrackRef.current = null;
      return;
    }
    const trackChanged = currentTrack.id !== prevTrackRef.current?.id;
    prevTrackRef.current = currentTrack;
    try {
      if (trackChanged) {
        player.seekTo(0);
      }
      if (isPlaying && !player.playing) {
        player.play();
      } else if (!isPlaying && player.playing) {
        player.pause();
      }
    } catch (e) {
      console.warn('[AudioEngine] playback error:', e);
      useMusicStore.getState().setError('playback_failed');
    }
  }, [isPlaying, currentTrack, player]);

  return <>{children}</>;
}
