import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, Clock } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { useTheme, useT } from '../../../components/UI';
import { useMusicStore } from '../useMusicStore';
import type { PlayMode } from '../useMusicStore';
import { audioPlayerRef } from '../services/audioPlayerRef';
import WaveformBar from './WaveformBar';
import AnimatedMusicIcon from './AnimatedMusicIcon';

const SLEEP_PRESETS = [15, 30, 45, 60, 90];

interface Props {
  primaryColor: string;
  category?: string;
}

export default function PlayerBar({ primaryColor, category }: Props) {
  const TH = useTheme();
  const T = useT();
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

  const PLAY_MODES: { mode: PlayMode; icon: typeof Repeat; labelKey: string }[] = [
    { mode: 'sequential', icon: Repeat, labelKey: 'musicPlayModeSequential' },
    { mode: 'repeat-all', icon: Repeat, labelKey: 'musicPlayModeRepeatAll' },
    { mode: 'repeat-one', icon: Repeat1, labelKey: 'musicPlayModeRepeatOne' },
    { mode: 'shuffle', icon: Shuffle, labelKey: 'musicPlayModeShuffle' },
  ];

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

  const modeDef = PLAY_MODES.find(m => m.mode === playMode) ?? PLAY_MODES[0];
  const ModeIcon = modeDef.icon;
  const modeLabel = T(modeDef.labelKey);

  return (
    <>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: TH.cardSolid, borderTopWidth: 1, borderTopColor: TH.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 }}>
        {/* Error banner */}
        {error && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239,68,68,.2)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#EF4444', fontSize: FONT_SUB, flex: 1 }}>{T('musicPlayFailed')}</Text>
            <TouchableOpacity onPress={() => { setError(null); play(currentTrack); }}>
              <Text style={{ color: primaryColor, fontSize: FONT_SUB, fontWeight: '600' }}>{T('musicRetry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Track info + controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600' }} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
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
            <Clock size={18} color={sleepTimerMinutes ? primaryColor : TH.sub} />
          </TouchableOpacity>

          {/* Volume */}
          <TouchableOpacity onPress={handleToggleVolume} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            {volume > 0 ? <Volume2 size={18} color={TH.sub} /> : <VolumeX size={18} color={TH.sub} />}
          </TouchableOpacity>

          {/* Play mode */}
          <TouchableOpacity onPress={handleCycleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <ModeIcon size={18} color={playMode !== 'sequential' ? primaryColor : TH.sub} />
          </TouchableOpacity>
        </View>

        {/* Playback controls row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <TouchableOpacity onPress={playPrevious} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <SkipBack size={22} color={TH.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTogglePlay} style={{ padding: 8 }}>
            <AnimatedMusicIcon isPlaying={isPlaying} color={TH.text} size={28} />
          </TouchableOpacity>

          <TouchableOpacity onPress={playNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <SkipForward size={22} color={TH.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <Text style={{ color: TH.sub, fontSize: FONT_SUB }}>{modeLabel}</Text>
        </View>

        {/* Waveform progress bar */}
        <WaveformBar
          trackId={currentTrack.id}
          progress={progress}
          primaryColor={primaryColor}
          inactiveColor={TH.border}
          barCount={50}
          height={26}
          onPress={handleSeek}
        />
      </View>

      {/* Sleep Timer Modal */}
      <Modal visible={showSleepModal} transparent animationType="fade" onRequestClose={() => setShowSleepModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 16, textAlign: 'center' }}>{T('musicSleepTimer')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {SLEEP_PRESETS.map(min => (
                <TouchableOpacity key={min} onPress={() => handleSleepSelect(min)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: sleepTimerMinutes === min ? primaryColor : TH.card }}>
                  <Text style={{ color: sleepTimerMinutes === min ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('musicMinutes').replace('{n}', String(min))}</Text>
                </TouchableOpacity>
              ))}
              {sleepTimerMinutes && (
                <TouchableOpacity onPress={() => handleSleepSelect(null)}
                  style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,.15)', width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: FONT_BODY }}>{T('musicSleepTimerOff')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowSleepModal(false)} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('cancel')}</Text>
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
