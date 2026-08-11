import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { SkipBack, SkipForward, Volume2, VolumeX, Clock, List } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import AnimatedMusicIcon from '../../components/AnimatedMusicIcon';
import { useTheme, useT } from '../../components/UI';
import { audioPlayerRef } from '../services/audioPlayerRef';
import { useMusicStore } from '../useMusicStore';
import { PLAY_MODES } from '../utils/constants';
import { formatTime } from '../utils/format';

import FullPlayerScreen from './FullPlayerScreen';
import QueueModal from './QueueModal';
import SleepTimerModal from './SleepTimerModal';
import WaveformBar from './WaveformBar';

interface Props {
  primaryColor: string;
  category?: string;
  _category?: string;
}

export default function PlayerBar({ primaryColor }: Props) {
  const TH = useTheme();
  const T = useT();

  const {
    currentTrack,
    isPlaying,
    playMode,
    currentTime,
    duration,
    volume,
    sleepTimerMinutes,
    sleepTimerRemaining,
    error,
  } = useMusicStore(useShallow(s => ({
    currentTrack: s.currentTrack,
    isPlaying: s.isPlaying,
    playMode: s.playMode,
    currentTime: s.currentTime,
    duration: s.duration,
    volume: s.volume,
    sleepTimerMinutes: s.sleepTimerMinutes,
    sleepTimerRemaining: s.sleepTimerRemaining,
    error: s.error,
  })));

  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const play = useMusicStore(s => s.play);
  const setPlayMode = useMusicStore(s => s.setPlayMode);
  const playNext = useMusicStore(s => s.playNext);
  const playPrevious = useMusicStore(s => s.playPrevious);
  const setVolume = useMusicStore(s => s.setVolume);
  const setError = useMusicStore(s => s.setError);

  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);

  const progress = duration > 0 ? currentTime / duration : 0;
  const currentTimeStr = formatTime(currentTime);
  const durationStr = formatTime(duration);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const handleSeek = useCallback((ratio: number) => {
    try { void audioPlayerRef.current?.seekTo(ratio * duration); } catch {}
    setDragProgress(null);
  }, [duration]);

  const handleSeekDrag = useCallback((ratio: number) => {
    setDragProgress(ratio);
  }, []);

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

  const formatSleepTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  const modeDef = PLAY_MODES.find(m => m.mode === playMode) ?? PLAY_MODES[0];
  const ModeIcon = modeDef.icon;
  const modeLabel = T(modeDef.labelKey);

  return (
    <>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TH.cardSolid, borderTopWidth: 1, borderTopColor: TH.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 }}>
        {/* Error banner */}
        {error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239,68,68,.2)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#EF4444', fontSize: FONT_SUB(), flex: 1 }}>{T('musicPlayFailed')}</Text>
            <TouchableOpacity onPress={() => { setError(null); play(currentTrack); }} accessibilityLabel={T('musicRetry')}>
              <Text style={{ color: primaryColor, fontSize: FONT_SUB(), fontWeight: '600' }}>{T('musicRetry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Track info + controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowFullPlayer(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={currentTrack.name}>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600' }} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>
              {currentTimeStr} / {durationStr}
            </Text>
          </TouchableOpacity>

          {/* Sleep timer */}
          {sleepTimerMinutes && (
            <TouchableOpacity onPress={() => setShowSleepModal(true)} style={{ padding: 6 }} accessibilityLabel={T('musicSleepTimer')}>
              <Text style={{ color: primaryColor, fontSize: FONT_SUB(), fontWeight: '600' }}>
                {formatSleepTime(sleepTimerRemaining)}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowSleepModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel={T('musicSleepTimer')}>
            <Clock size={18} color={sleepTimerMinutes ? primaryColor : TH.sub} />
          </TouchableOpacity>

          {/* Queue */}
          <TouchableOpacity onPress={() => setShowQueueModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel="Queue">
            <List size={18} color={TH.sub} />
          </TouchableOpacity>

          {/* Volume */}
          <TouchableOpacity onPress={handleToggleVolume} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel={volume > 0 ? 'Mute' : 'Unmute'}>
            {volume > 0 ? <Volume2 size={18} color={TH.sub} /> : <VolumeX size={18} color={TH.sub} />}
          </TouchableOpacity>

          {/* Play mode */}
          <TouchableOpacity onPress={handleCycleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel={modeLabel}>
            <ModeIcon size={18} color={playMode !== 'sequential' ? primaryColor : TH.sub} />
          </TouchableOpacity>
        </View>

        {/* Playback controls row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <TouchableOpacity onPress={playPrevious} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel="Previous">
            <SkipBack size={22} color={TH.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTogglePlay} style={{ padding: 8 }} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
            <AnimatedMusicIcon isPlaying={isPlaying} color={TH.text} size={28} />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }} accessibilityLabel="Next">
            <SkipForward size={22} color={TH.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{modeLabel}</Text>
        </View>

        {/* Waveform progress bar */}
        <WaveformBar
          trackId={currentTrack.id}
          progress={dragProgress ?? progress}
          primaryColor={primaryColor}
          inactiveColor={TH.border}
          barCount={50}
          height={26}
          onPress={handleSeek}
          onSeek={handleSeekDrag}
          onSeekEnd={handleSeek}
        />
        {dragProgress != null && (
          <Text style={{ color: primaryColor, fontSize: FONT_SUB(), textAlign: 'center', marginTop: 2 }}>
            {formatTime(dragProgress * duration)}
          </Text>
        )}
      </View>

      {/* Sleep Timer Modal */}
      <SleepTimerModal visible={showSleepModal} onClose={() => setShowSleepModal(false)} primaryColor={primaryColor} />

      {/* Queue Modal */}
      <QueueModal visible={showQueueModal} onClose={() => setShowQueueModal(false)} primaryColor={primaryColor} />

      {/* Full Player Screen */}
      <FullPlayerScreen visible={showFullPlayer} onClose={() => setShowFullPlayer(false)} primaryColor={primaryColor} />
    </>
  );
}