import { useState, useEffect, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISE_SOUNDS } from '@egoless-do/core';
import { audioSessionManager } from '../../music/AudioSessionManager';

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

  // 环境音播放器
  const bgSource = SOUND_FILES[selectedSound];
  const bgPlayer = useAudioPlayer(bgSource ?? undefined);
  bgPlayer.loop = true;
  bgPlayer.volume = 0.25;

  // 钟声播放器（独立，不受管理器影响）
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

  const playBell = useCallback(() => {
    bellPlayer.seekTo(0);
    bellPlayer.play();
  }, [bellPlayer]);

  const selectSound = useCallback((key: string) => {
    setSelectedSound(key);

    if (key === '无') {
      bgPlayer.pause();
      audioSessionManager.notifyStopped('ambient');
    } else {
      // 通过管理器请求播放环境音（会自动暂停音乐）
      const allowed = audioSessionManager.requestPlay('ambient');
      if (allowed) {
        bgPlayer.play();
      }
    }
    setShowSoundPicker(false);
  }, [bgPlayer]);

  // 环境音停止时通知管理器
  useEffect(() => {
    return () => {
      if (selectedSound !== '无') {
        audioSessionManager.notifyStopped('ambient');
      }
    };
  }, [selectedSound]);

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
