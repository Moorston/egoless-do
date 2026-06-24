import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, Clock } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';
import type { PlayMode } from './useMusicStore';
import { audioPlayerRef } from './audioPlayerRef';
import WaveformBar from './WaveformBar';
import AnimatedMusicIcon from './AnimatedMusicIcon';

const PLAY_MODES: { mode: PlayMode; icon: typeof Repeat; label: string }[] = [
  { mode: 'sequential', icon: Repeat, label: '顺序' },
  { mode: 'repeat-all', icon: Repeat, label: '列表循环' },
  { mode: 'repeat-one', icon: Repeat1, label: '单曲循环' },
  { mode: 'shuffle', icon: Shuffle, label: '随机' },
];

const SLEEP_PRESETS = [15, 30, 45, 60, 90];

interface Props {
  primaryColor: string;
  category?: string;
}

export default function PlayerBar({ primaryColor, category }: Props) {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const playMode = useMusicStore(s => s.playMode);
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);
  const volume = useMusicStore(s => s.volume);
  const sleepTimerMinutes = useMusicStore(s => s.sleepTimerMinutes);
  const sleepTimerRemaining = useMusicStore(s => s.sleepTimerRemaining);
  const error = useMusicStore(s => s.error);

  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const play = useMusicStore(s => s.play);
  const setPlayMode = useMusicStore(s => s.setPlayMode);
  const playNext = useMusicStore(s => s.playNext);
  const playPrevious = useMusicStore(s => s.playPrevious);
  const setVolume = useMusicStore(s => s.setVolume);
  const setSleepTimer = useMusicStore(s => s.setSleepTimer);
  const setError = useMusicStore(s => s.setError);

  const [showSleepModal, setShowSleepModal] = useState(false);

  const progress = duration > 0 ? currentTime / duration : 0;
  const currentTimeStr = formatTime(currentTime);
  const durationStr = formatTime(duration);

  const handleSeek = useCallback((ratio: number) => {
    try { audioPlayerRef.current?.seekTo(ratio * duration); } catch {}
  }, [duration]);

  const handleTogglePlay = useCallback(() => {
    isPlaying ? pause() : resume();
  }, [isPlaying, pause, resume]);

  const handleCycleMode = useCallback(() => {
    const idx = PLAY_MODES.findIndex(m => m.mode === playMode);
    setPlayMode(PLAY_MODES[(idx + 1) % PLAY_MODES.length].mode);
  }, [playMode, setPlayMode]);

  const handleToggleVolume = useCallback(() => {
    setVolume(volume > 0 ? 0 : 0.3);
  }, [volume, setVolume]);

  const handleSleepSelect = useCallback((minutes: number | null) => {
    setSleepTimer(minutes);
    setShowSleepModal(false);
  }, [setSleepTimer]);

  const formatSleepTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  const ModeIcon = PLAY_MODES.find(m => m.mode === playMode)?.icon ?? Repeat;
  const modeLabel = PLAY_MODES.find(m => m.mode === playMode)?.label ?? '';

  return (
    <>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 }}>
        {/* Error banner */}
        {error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239,68,68,.2)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#EF4444', fontSize: FONT_SUB, flex: 1 }}>播放失败</Text>
            <TouchableOpacity onPress={() => { setError(null); play(currentTrack); }}>
              <Text style={{ color: primaryColor, fontSize: FONT_SUB, fontWeight: '600' }}>重试</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Track info + controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '600' }} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
              {currentTimeStr} / {durationStr}
            </Text>
          </View>

          {/* Sleep timer */}
          {sleepTimerMinutes && (
            <TouchableOpacity onPress={() => setShowSleepModal(true)} style={{ padding: 6 }}>
              <Text style={{ color: primaryColor, fontSize: FONT_SUB, fontWeight: '600' }}>
                {formatSleepTime(sleepTimerRemaining)}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSleepModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <Clock size={18} color={sleepTimerMinutes ? primaryColor : 'rgba(255,255,255,.5)'} />
          </TouchableOpacity>

          {/* Volume */}
          <TouchableOpacity onPress={handleToggleVolume} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            {volume > 0 ? <Volume2 size={18} color="rgba(255,255,255,.5)" /> : <VolumeX size={18} color="rgba(255,255,255,.5)" />}
          </TouchableOpacity>

          {/* Play mode */}
          <TouchableOpacity onPress={handleCycleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <ModeIcon size={18} color={playMode !== 'sequential' ? primaryColor : 'rgba(255,255,255,.5)'} />
          </TouchableOpacity>
        </View>

        {/* Playback controls row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          {/* Previous */}
          <TouchableOpacity onPress={playPrevious} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <SkipBack size={22} color="rgba(255,255,255,.7)" />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity onPress={handleTogglePlay} style={{ padding: 8 }}>
            <AnimatedMusicIcon isPlaying={isPlaying} color="#fff" size={28} />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity onPress={playNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <SkipForward size={22} color="rgba(255,255,255,.7)" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Mode label */}
          <Text style={{ color: 'rgba(255,255,255,.3)', fontSize: FONT_SUB }}>{modeLabel}</Text>
        </View>

        {/* Waveform progress bar */}
        <WaveformBar
          trackId={currentTrack.id}
          progress={progress}
          primaryColor={primaryColor}
          barCount={50}
          height={26}
          onPress={handleSeek}
        />
      </View>

      {/* Sleep Timer Modal */}
      <Modal visible={showSleepModal} transparent animationType="fade" onRequestClose={() => setShowSleepModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: '#fff', marginBottom: 16, textAlign: 'center' }}>定时关闭</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {SLEEP_PRESETS.map(min => (
                <TouchableOpacity key={min} onPress={() => handleSleepSelect(min)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: sleepTimerMinutes === min ? primaryColor : 'rgba(255,255,255,.1)' }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: FONT_BODY }}>{min}分钟</Text>
                </TouchableOpacity>
              ))}
              {sleepTimerMinutes && (
                <TouchableOpacity onPress={() => handleSleepSelect(null)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,.2)', width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: FONT_BODY }}>关闭定时</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowSleepModal(false)} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_BODY }}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
