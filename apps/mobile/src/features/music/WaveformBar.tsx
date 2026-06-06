import React, { useMemo, useCallback } from 'react';
import { View, Pressable } from 'react-native';

// 固定种子伪随机数生成器
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 根据 track id 生成固定波形数据
function generateWaveform(trackId: string, barCount: number): number[] {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = ((hash << 5) - hash) + trackId.charCodeAt(i);
    hash |= 0;
  }
  const rand = seededRandom(Math.abs(hash) || 1);
  return Array.from({ length: barCount }, () => 8 + rand() * 16);
}

interface Props {
  trackId: string;
  progress: number; // 0~1
  primaryColor: string;
  barCount?: number;
  height?: number;
  onPress?: (progress: number) => void;
}

export default function WaveformBar({ trackId, progress, primaryColor, barCount = 40, height = 28, onPress }: Props) {
  const bars = useMemo(() => generateWaveform(trackId, barCount), [trackId, barCount]);
  const barWidth = 3;
  const gap = 2;

  const handlePress = useCallback((e: { nativeEvent: { locationX: number } }) => {
    if (!onPress) return;
    const totalWidth = barCount * (barWidth + gap);
    const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / totalWidth));
    onPress(ratio);
  }, [onPress, barCount]);

  return (
    <Pressable onPress={handlePress} style={{ flexDirection: 'row', alignItems: 'center', height }}>
      {bars.map((h, i) => {
        const ratio = i / barCount;
        const filled = ratio <= progress;
        return (
          <View key={i} style={{
            width: barWidth,
            height: h,
            borderRadius: 1.5,
            backgroundColor: filled ? primaryColor : 'rgba(255,255,255,.2)',
            marginRight: i < barCount - 1 ? gap : 0,
          }} />
        );
      })}
    </Pressable>
  );
}
