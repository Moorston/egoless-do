import { EXERCISE_SOUNDS } from '@egoless-do/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useState, useEffect, useCallback, useRef } from 'react';

import { audioSessionManager } from '../../../services/AudioSessionManager';

const SOUND_FILES: Record<string, number> = {
  '海潮': require('../../../../assets/sounds/ocean.mp3') as number,
  '雨声': require('../../../../assets/sounds/rain.mp3') as number,
  '钵声': require('../../../../assets/sounds/bowl.mp3') as number,
  '鸟叫': require('../../../../assets/sounds/birds.mp3') as number,
  '流水': require('../../../../assets/sounds/flowing-stream.mp3') as number,
  '风铃': require('../../../../assets/sounds/wind-chimes.mp3') as number,
};
const BELL_FILE = require('../../../../assets/sounds/temple_bell.mp3') as number;

export function useExerciseAudio() {
  const [selectedSound, setSelectedSound] = useState<string>('无');
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const shouldAutoPlayRef = useRef(false);

  // 环境音播放器
  const bgSource = SOUND_FILES[selectedSound];
  const bgPlayer = useAudioPlayer(bgSource ?? undefined);

  // 钟声播放器（独立，不受管理器影响）
  const bellPlayer = useAudioPlayer(BELL_FILE);

  useEffect(() => {
    bgPlayer.loop = true;
    bgPlayer.volume = 0.25;
  }, [bgPlayer]);

  useEffect(() => {
    bellPlayer.volume = 0.5;
  }, [bellPlayer]);

  // Auto-play when bgPlayer source changes after selectSound
  useEffect(() => {
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      const allowed = audioSessionManager.requestPlay('ambient');
      if (allowed) {
        bgPlayer.play();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [bgSource, bgPlayer, audioSessionManager]);

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
    void bellPlayer.seekTo(0);
    bellPlayer.play();
  }, [bellPlayer]);

  const selectSound = useCallback((key: string) => {
    setSelectedSound(key);

    if (key === '无') {
      shouldAutoPlayRef.current = false;
      bgPlayer.pause();
      audioSessionManager.notifyStopped('ambient');
    } else {
      // Mark for auto-play; actual play happens in useEffect after source updates
      shouldAutoPlayRef.current = true;
    }
    setShowSoundPicker(false);
  }, [bgPlayer]);

  // 环境音和钟声在组件卸载时停止，并通知管理器
  const selectedSoundRef = useRef(selectedSound);
  const bgPlayerRef = useRef(bgPlayer);
  const bellPlayerRef = useRef(bellPlayer);
  useEffect(() => { selectedSoundRef.current = selectedSound; }, [selectedSound]);
  useEffect(() => { bgPlayerRef.current = bgPlayer; }, [bgPlayer]);
  useEffect(() => { bellPlayerRef.current = bellPlayer; }, [bellPlayer]);
  useEffect(() => {
    return () => {
      // remove() releases native resources; best-effort since hook may release first
      try { bgPlayerRef.current.remove(); } catch {}
      try { bellPlayerRef.current.remove(); } catch {}
      if (selectedSoundRef.current !== '无') {
        audioSessionManager.notifyStopped('ambient');
      }
    };
  }, []);

  const cycleSound = useCallback(() => {
    setSelectedSound(prev => {
      const idx = EXERCISE_SOUNDS.findIndex(s => s.key === prev);
      const next = EXERCISE_SOUNDS[(idx + 1) % EXERCISE_SOUNDS.length];
      if (next.key === '无') {
        bgPlayer.pause();
        audioSessionManager.notifyStopped('ambient');
      } else {
        shouldAutoPlayRef.current = true;
      }
      setShowSoundPicker(false);
      return next.key;
    });
  }, [bgPlayer]);

  /** Stop all audio immediately (call on exercise end, not unmount) */
  const stopAll = useCallback(() => {
    try { bgPlayer.pause(); } catch {}
    try { bellPlayer.pause(); } catch {}
    audioSessionManager.notifyStopped('ambient');
  }, [bgPlayer, bellPlayer]);

  // Unmount cleanup — best-effort; stopAll should be called explicitly before navigation
  useEffect(() => {
    return () => {
      try { bgPlayerRef.current.remove(); } catch {}
      try { bellPlayerRef.current.remove(); } catch {}
      if (selectedSoundRef.current !== '无') {
        audioSessionManager.notifyStopped('ambient');
      }
    };
  }, []);

  return {
    selectedSound, setSelectedSound,
    showSoundPicker, setShowSoundPicker,
    bgPlayer, bellPlayer,
    playBell, selectSound, cycleSound, stopAll,
  };
}
