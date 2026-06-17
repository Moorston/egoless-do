import React, { useEffect, useRef } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useMusicStore } from './useMusicStore';
import type { MusicTrack } from '@egoless-do/core';
import { audioPlayerRef } from './audioPlayerRef';

/**
 * 全局音频引擎 Provider，挂载在 App 顶层。
 * 监听 useMusicStore 状态变化执行播放控制。
 */
export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const volume = useMusicStore(s => s.volume);
  const loop = useMusicStore(s => s.loop);

  const source = currentTrack
    ? (currentTrack.file ? currentTrack.file : currentTrack.uri ? { uri: currentTrack.uri } : undefined)
    : undefined;

  const player = useAudioPlayer(source);

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

  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  // Unified play/pause/track-change effect — avoids double play() on track switch
  const prevTrackRef = useRef<MusicTrack | null>(null);
  useEffect(() => {
    if (!currentTrack) {
      if (player.playing) player.pause();
      prevTrackRef.current = null;
      return;
    }
    const trackChanged = currentTrack.id !== prevTrackRef.current?.id;
    prevTrackRef.current = currentTrack;
    if (trackChanged) {
      player.seekTo(0);
    }
    if (isPlaying) {
      player.play();
    } else if (player.playing) {
      player.pause();
    }
  }, [isPlaying, currentTrack, player]);

  return <>{children}</>;
}
