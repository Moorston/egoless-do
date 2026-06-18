import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Repeat, SkipForward } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';
import { audioPlayerRef } from './audioPlayerRef';
import WaveformBar from './WaveformBar';
import AnimatedMusicIcon from './AnimatedMusicIcon';

interface Props {
  primaryColor: string;
  category?: string;
}

export default function PlayerBar({ primaryColor, category }: Props) {
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const loop = useMusicStore(s => s.loop);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const toggleLoop = useMusicStore(s => s.toggleLoop);
  const play = useMusicStore(s => s.play);

  // 使用轮询获取播放状态
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!currentTrack) return;
    const interval = setInterval(() => {
      const p = audioPlayerRef.current;
      if (p) {
        setCurrentTime(p.currentTime ?? 0);
        setDuration(p.duration ?? 0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [currentTrack]);

  // 播放下一首（循环当前分类）
  const handleNext = useCallback(() => {
    if (!currentTrack) return;
    try {
      const cat = category ?? currentTrack.category;
      const tracks = useMusicStore.getState().getTracksByCategory(cat);
      if (tracks.length === 0) return;
      const idx = tracks.findIndex(t => t.id === currentTrack.id);
      const nextIdx = (idx + 1) % tracks.length;
      play(tracks[nextIdx]);
    } catch (e) { console.error('播放下一首失败:', e); }
  }, [currentTrack, category, play]);

  if (!currentTrack) return null;

  const player = audioPlayerRef.current;
  const progress = duration > 0 ? currentTime / duration : 0;
  const currentTimeStr = formatTime(currentTime);
  const durationStr = formatTime(duration);

  const handleSeek = (ratio: number) => {
    try { if (player) player.seekTo(ratio * duration); } catch (e) { console.error('seek失败:', e); }
  };

  const handleTogglePlay = () => {
    try { isPlaying ? pause() : resume(); } catch (e) { console.error('播放/暂停失败:', e); }
  };

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 }}>
      {/* Track info + controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BODY, color: '#fff', fontWeight: '600' }} numberOfLines={1}>
            {currentTrack.name}
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
            {currentTimeStr} / {durationStr}
          </Text>
        </View>

        {/* Loop */}
        <TouchableOpacity onPress={toggleLoop} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 10 }}>
          <Repeat size={22} color={loop ? primaryColor : 'rgba(255,255,255,.5)'} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity onPress={handleTogglePlay} style={{ padding: 8 }}>
          <AnimatedMusicIcon isPlaying={isPlaying} color="#fff" size={28} />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity onPress={handleNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 10 }}>
          <SkipForward size={22} color="rgba(255,255,255,.7)" />
        </TouchableOpacity>
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
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
