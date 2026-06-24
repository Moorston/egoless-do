import React, { useMemo, useCallback } from 'react';
import { View, Pressable } from 'react-native';

// Predefined waveform profiles per category for more natural look
const WAVEFORM_PROFILES: Record<string, number[]> = {
  focus: [12, 14, 18, 16, 20, 14, 16, 22, 18, 14, 12, 16, 20, 18, 14, 16, 22, 18, 14, 12, 16, 20, 18, 14, 16, 22, 18, 14, 12, 16],
  meditate: [8, 10, 12, 14, 16, 14, 12, 10, 8, 10, 12, 14, 16, 14, 12, 10, 8, 10, 12, 14, 16, 14, 12, 10, 8, 10, 12, 14, 16, 14],
  exercise: [20, 18, 22, 16, 20, 24, 18, 22, 16, 20, 24, 18, 22, 16, 20, 24, 18, 22, 16, 20, 24, 18, 22, 16, 20, 24, 18, 22, 16, 20],
  user: [14, 16, 12, 18, 14, 20, 16, 12, 18, 14, 16, 20, 12, 18, 14, 16, 20, 12, 18, 14, 16, 20, 12, 18, 14, 16, 20, 12, 18, 14],
};

// Fallback: seed-random generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateWaveform(trackId: string, barCount: number): number[] {
  // Try to match a profile by category hint in trackId
  for (const [cat, profile] of Object.entries(WAVEFORM_PROFILES)) {
    if (trackId.startsWith(cat) || trackId.includes(cat)) {
      // Extend or truncate profile to match barCount
      if (profile.length >= barCount) return profile.slice(0, barCount);
      const result = [...profile];
      while (result.length < barCount) result.push(profile[result.length % profile.length]);
      return result;
    }
  }

  // Fallback: seed-random
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
        // Subtle height variation for played bars to create shimmer
        const playedOffset = filled ? Math.sin(ratio * Math.PI * 3) * 1.5 : 0;
        return (
          <View key={i} style={{
            width: barWidth,
            height: Math.max(4, h + playedOffset),
            borderRadius: 1.5,
            backgroundColor: filled ? primaryColor : 'rgba(255,255,255,.15)',
            marginRight: i < barCount - 1 ? gap : 0,
            opacity: filled ? 0.85 + Math.sin(ratio * Math.PI * 2) * 0.15 : 1,
          }} />
        );
      })}
    </Pressable>
  );
}
