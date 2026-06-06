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
}

export default function MusicMiniBar({ currentTrack, isPlaying, loop, onTogglePlay, onToggleLoop, onPressTrackName, primaryColor }: Props) {
  if (!currentTrack) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 10 }}>
      <Music size={14} color={primaryColor} />
      <TouchableOpacity onPress={onPressTrackName} style={{ flex: 1 }}>
        <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)' }} numberOfLines={1}>
          {currentTrack.name}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onTogglePlay} style={{ padding: 4 }}>
        {isPlaying ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleLoop} style={{ padding: 4 }}>
        <Repeat size={14} color={loop ? primaryColor : 'rgba(255,255,255,.3)'} />
      </TouchableOpacity>
    </View>
  );
}
