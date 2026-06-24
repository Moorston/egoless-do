import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Music, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import type { PlayMode } from './useMusicStore';
import WaveformBar from './WaveformBar';
import { useMusicStore } from './useMusicStore';

const MODE_ICONS: Record<string, typeof Repeat> = {
  sequential: Repeat,
  'repeat-all': Repeat,
  'repeat-one': Repeat1,
  shuffle: Shuffle,
};

interface Props {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onPressTrackName?: () => void;
  primaryColor: string;
  darkBackground?: boolean;
}

export default function MusicMiniBar({ currentTrack, isPlaying, loop, onTogglePlay, onToggleLoop, onPressTrackName, primaryColor, darkBackground = true }: Props) {
  const playMode = useMusicStore(s => s.playMode);
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);

  if (!currentTrack) return null;

  const textColor = darkBackground ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)';
  const iconColor = darkBackground ? '#fff' : '#333';
  const inactiveLoop = darkBackground ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.2)';
  const progress = duration > 0 ? currentTime / duration : 0;

  const ModeIcon = MODE_ICONS[playMode] ?? Repeat;
  const isActive = playMode !== 'sequential';

  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Music size={14} color={primaryColor} />
        <TouchableOpacity onPress={onPressTrackName} style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SUB, color: textColor }} numberOfLines={1}>
            {currentTrack.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onTogglePlay} style={{ padding: 4 }}>
          {isPlaying ? <Pause size={16} color={iconColor} /> : <Play size={16} color={iconColor} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleLoop} style={{ padding: 4 }}>
          <ModeIcon size={14} color={isActive ? primaryColor : inactiveLoop} />
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      {duration > 0 && (
        <View style={{ height: 2, backgroundColor: darkBackground ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)', borderRadius: 1 }}>
          <View style={{ height: 2, width: `${progress * 100}%`, backgroundColor: primaryColor, borderRadius: 1 }} />
        </View>
      )}
    </View>
  );
}
