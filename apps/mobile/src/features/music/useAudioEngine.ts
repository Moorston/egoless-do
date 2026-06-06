import { useEffect, useRef } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useMusicStore } from './useMusicStore';
import type { MusicTrack } from '@egoless-do/core';
import { audioPlayerRef } from './audioPlayerRef';

/**
 * 全局音频引擎，挂载在 app 顶层组件，监听 useMusicStore 状态变化执行播放控制。
 * 使用模块级 ref 共享 player 实例。
 */
export function useAudioEngine() {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const volume = useMusicStore(s => s.volume);
  const loop = useMusicStore(s => s.loop);

  // 根据 currentTrack 构建音频源
  const source = currentTrack
    ? (currentTrack.file ? currentTrack.file : currentTrack.uri ? { uri: currentTrack.uri } : undefined)
    : undefined;

  const player = useAudioPlayer(source);

  // 将 player 存入模块级 ref
  useEffect(() => {
    audioPlayerRef.current = player;
    return () => { audioPlayerRef.current = null; };
  }, [player]);

  // 初始化音频会话
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  // 同步 volume 和 loop
  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  // 播放/暂停同步
  useEffect(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      player.play();
    } else {
      if (player.playing) player.pause();
    }
  }, [isPlaying, currentTrack, player]);

  // 切换曲目时从头播放
  const prevTrackRef = useRef<MusicTrack | null>(null);
  useEffect(() => {
    if (currentTrack && currentTrack.id !== prevTrackRef.current?.id) {
      player.seekTo(0);
      if (isPlaying) player.play();
    }
    prevTrackRef.current = currentTrack;
  }, [currentTrack, player, isPlaying]);

  return { player };
}
