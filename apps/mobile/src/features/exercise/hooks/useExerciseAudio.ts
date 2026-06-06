import { useState, useEffect, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISE_SOUNDS } from '@egoless-do/core';
import { useMusicStore } from '../../music/useMusicStore';

const SOUND_FILES: Record<string, number> = {
  '海潮': require('../../../../assets/sounds/ocean.mp3'),
  '雨声': require('../../../../assets/sounds/rain.mp3'),
  '钵声': require('../../../../assets/sounds/bowl.mp3'),
  '鸟叫': require('../../../../assets/sounds/birds.mp3'),
  '流水': require('../../../../assets/sounds/flowing-stream.mp3'),
  '风铃': require('../../../../assets/sounds/wind-chimes.mp3'),
};
const BELL_FILE = require('../../../../assets/sounds/temple_bell.mp3');

export function useExerciseAudio() {
  const [selectedSound, setSelectedSound] = useState<string>('无');
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  // 音乐 store（用于从音乐库播放的背景音乐）
  const musicCurrentTrack = useMusicStore(s => s.currentTrack);
  const musicIsPlaying = useMusicStore(s => s.isPlaying);

  // 环境音播放器（保留给 ExerciseTopBar 的音效选择器）
  const bgSource = SOUND_FILES[selectedSound];
  const bgPlayer = useAudioPlayer(bgSource ?? undefined);
  bgPlayer.loop = true;
  bgPlayer.volume = 0.25;

  // 钟声播放器（独立，不受音乐模块影响）
  const bellPlayer = useAudioPlayer(BELL_FILE);
  bellPlayer.volume = 0.5;

  // Init audio session + restore last selected sound
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    AsyncStorage.getItem('sport_selected_sound').then(v => {
      if (v && EXERCISE_SOUNDS.some(s => s.key === v)) setSelectedSound(v);
    }).catch(() => {});
  }, []);

  // Persist selected sound
  useEffect(() => {
    AsyncStorage.setItem('sport_selected_sound', selectedSound).catch(() => {});
  }, [selectedSound]);

  // 如果音乐模块正在播放，暂停环境音
  useEffect(() => {
    if (musicCurrentTrack && musicIsPlaying) {
      if (bgPlayer.playing) bgPlayer.pause();
    }
  }, [musicCurrentTrack, musicIsPlaying, bgPlayer]);

  const playBell = useCallback(() => {
    bellPlayer.seekTo(0);
    bellPlayer.play();
  }, [bellPlayer]);

  const selectSound = useCallback((key: string) => {
    setSelectedSound(key);
    // 如果音乐模块正在播放，先停止音乐
    if (key !== '无' && musicCurrentTrack) {
      useMusicStore.getState().stop();
    }
    if (key === '无') { bgPlayer.pause(); }
    else { bgPlayer.play(); }
    setShowSoundPicker(false);
  }, [bgPlayer, musicCurrentTrack]);

  const cycleSound = useCallback(() => {
    const idx = EXERCISE_SOUNDS.findIndex(s => s.key === selectedSound);
    const next = EXERCISE_SOUNDS[(idx + 1) % EXERCISE_SOUNDS.length];
    selectSound(next.key);
  }, [selectedSound, selectSound]);

  return {
    selectedSound, setSelectedSound,
    showSoundPicker, setShowSoundPicker,
    bgPlayer, bellPlayer,
    playBell, selectSound, cycleSound,
  };
}
