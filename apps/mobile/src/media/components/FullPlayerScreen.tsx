// ─── 全屏播放器 ──────────────────────────────────────────────────
// 点击底部 PlayerBar 触发，显示大尺寸可视化 + 完整播放控制

import { FONT_TITLE, FONT_BODY, FONT_SUB, TRACK_VISUAL } from '@egoless-do/core';
import { SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Clock, ChevronDown } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, PanResponder, Animated } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import AnimatedMusicIcon from '../../components/AnimatedMusicIcon';
import { useTheme, useT } from '../../components/UI';
import { audioPlayerRef } from '../services/audioPlayerRef';
import { useMusicStore } from '../useMusicStore';
import type { PlayMode } from '../useMusicStore';

import WaveformBar from './WaveformBar';

const SLEEP_PRESETS = [15, 30, 45, 60, 90];

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
}

export default function FullPlayerScreen({ visible, onClose, primaryColor }: Props) {
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
  } = useMusicStore(useShallow(s => ({
    currentTrack: s.currentTrack,
    isPlaying: s.isPlaying,
    playMode: s.playMode,
    currentTime: s.currentTime,
    duration: s.duration,
    volume: s.volume,
    sleepTimerMinutes: s.sleepTimerMinutes,
    sleepTimerRemaining: s.sleepTimerRemaining,
  })));

  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const playNext = useMusicStore(s => s.playNext);
  const playPrevious = useMusicStore(s => s.playPrevious);
  const setPlayMode = useMusicStore(s => s.setPlayMode);
  const setVolume = useMusicStore(s => s.setVolume);
  const setSleepTimer = useMusicStore(s => s.setSleepTimer);
  const toggleFavorite = useMusicStore(s => s.toggleFavorite);
  const favorites = useMusicStore(s => s.favorites);

  const [showSleepModal, setShowSleepModal] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayProgress = dragProgress ?? progress;
  const currentTimeStr = formatTime(dragProgress != null ? dragProgress * duration : currentTime);
  const durationStr = formatTime(duration);

  const visual = currentTrack ? TRACK_VISUAL[currentTrack.id] : null;
  const gradient = visual?.gradient ?? [primaryColor, primaryColor];

  // 手势下滑关闭
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 20,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) slideAnim.setValue(Math.min(gs.dy / 300, 1));
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        onClose();
      }
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [onClose, slideAnim]);

  const PLAY_MODES: { mode: PlayMode; icon: typeof Repeat; labelKey: string }[] = [
    { mode: 'sequential', icon: Repeat, labelKey: 'musicPlayModeSequential' },
    { mode: 'repeat-all', icon: Repeat, labelKey: 'musicPlayModeRepeatAll' },
    { mode: 'repeat-one', icon: Repeat1, labelKey: 'musicPlayModeRepeatOne' },
    { mode: 'shuffle', icon: Shuffle, labelKey: 'musicPlayModeShuffle' },
  ];

  const handleSeek = useCallback((ratio: number) => {
    try { void audioPlayerRef.current?.seekTo(ratio * duration); } catch {}
    setDragProgress(null);
  }, [duration]);

  const handleSeekDrag = useCallback((ratio: number) => {
    setDragProgress(ratio);
  }, []);

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

  const isFavorite = currentTrack ? favorites.includes(currentTrack.id) : false;

  if (!currentTrack) return null;

  const modeDef = PLAY_MODES.find(m => m.mode === playMode) ?? PLAY_MODES[0];
  const ModeIcon = modeDef.icon;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: TH.bg }} {...panResponder.panHandlers}>
        {/* 顶部栏 */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
            <ChevronDown size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('musicPlaying')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 中央大图标 */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 200, height: 200, borderRadius: 32,
            backgroundColor: `${gradient[0]}20`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <AnimatedMusicIcon isPlaying={isPlaying} color={gradient[0]} size={96} />
          </View>

          {/* 曲目信息 */}
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, textAlign: 'center' }} numberOfLines={1}>
            {currentTrack.name}
          </Text>

          {/* 进度条 */}
          <View style={{ width: '100%', marginTop: 32 }}>
            <WaveformBar
              trackId={currentTrack.id}
              progress={displayProgress}
              primaryColor={primaryColor}
              inactiveColor={TH.border}
              barCount={50}
              height={28}
              onPress={handleSeek}
              onSeek={handleSeekDrag}
              onSeekEnd={handleSeek}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{currentTimeStr}</Text>
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{durationStr}</Text>
            </View>
          </View>
        </View>

        {/* 底部控制区域 */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 48, gap: 24 }}>
          {/* 主控制行 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
            <TouchableOpacity onPress={playPrevious} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 8 }}>
              <SkipBack size={28} color={TH.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => isPlaying ? pause() : resume()}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center' }}
            >
              {isPlaying ? (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 4, height: 20, backgroundColor: '#fff', borderRadius: 2 }} />
                  <View style={{ width: 4, height: 20, backgroundColor: '#fff', borderRadius: 2 }} />
                </View>
              ) : (
                <View style={{ marginLeft: 4 }}>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 18, borderLeftColor: '#fff', borderTopWidth: 10, borderTopColor: 'transparent', borderBottomWidth: 10, borderBottomColor: 'transparent' }} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 8 }}>
              <SkipForward size={28} color={TH.text} />
            </TouchableOpacity>
          </View>

          {/* 辅助控制行 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {/* 音量 */}
            <TouchableOpacity onPress={handleToggleVolume} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
              {volume > 0 ? <Volume2 size={20} color={TH.sub} /> : <VolumeX size={20} color={TH.sub} />}
            </TouchableOpacity>

            {/* 播放模式 */}
            <TouchableOpacity onPress={handleCycleMode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
              <ModeIcon size={20} color={playMode !== 'sequential' ? primaryColor : TH.sub} />
            </TouchableOpacity>

            {/* 睡眠定时器 */}
            <TouchableOpacity onPress={() => setShowSleepModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 8 }}>
              <Clock size={20} color={sleepTimerMinutes ? primaryColor : TH.sub} />
            </TouchableOpacity>
            {sleepTimerMinutes && (
              <Text style={{ color: primaryColor, fontSize: FONT_SUB() }}>
                {formatTime(sleepTimerRemaining)}
              </Text>
            )}
          </View>
        </View>

        {/* Sleep Timer Modal */}
        <Modal visible={showSleepModal} transparent animationType="fade" onRequestClose={() => setShowSleepModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_BODY(), color: TH.text, marginBottom: 16, textAlign: 'center' }}>{T('musicSleepTimer')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {SLEEP_PRESETS.map(min => (
                  <TouchableOpacity key={min} onPress={() => handleSleepSelect(min)}
                    style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: sleepTimerMinutes === min ? primaryColor : TH.card }}>
                    <Text style={{ color: sleepTimerMinutes === min ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{min}分钟</Text>
                  </TouchableOpacity>
                ))}
                {sleepTimerMinutes && (
                  <TouchableOpacity onPress={() => handleSleepSelect(null)}
                    style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,.15)', width: '100%', alignItems: 'center' }}>
                    <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: FONT_BODY() }}>{T('musicSleepTimerOff')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowSleepModal(false)} style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}