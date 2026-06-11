import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Music, Play, Pause, Repeat } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';

interface Props {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onPressTrackName?: () => void;
  primaryColor: string;
  darkBackground?: boolean; // true (default) = white text for dark bg, false = dark text for light bg
}

export default function MusicMiniBar({ currentTrack, isPlaying, loop, onTogglePlay, onToggleLoop, onPressTrackName, primaryColor, darkBackground = true }: Props) {
  if (!currentTrack) return null;

  const textColor = darkBackground ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)';
  const iconColor = darkBackground ? '#fff' : '#333';
  const inactiveLoop = darkBackground ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.2)';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 10 }}>
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
        <Repeat size={14} color={loop ? primaryColor : inactiveLoop} />
      </TouchableOpacity>
    </View>
  );
}
