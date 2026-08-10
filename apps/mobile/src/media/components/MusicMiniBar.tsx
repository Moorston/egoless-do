import {FONT_SUB} from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { Music, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../../components/UI';
import { useMusicStore } from '../useMusicStore';
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
}

export default function MusicMiniBar({ currentTrack, isPlaying, _loop, onTogglePlay, onToggleLoop, onPressTrackName, primaryColor }: Props) {
  const TH = useTheme();
  const playMode = useMusicStore(s => s.playMode);
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);

  if (!currentTrack) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const ModeIcon = MODE_ICONS[playMode] ?? Repeat;
  const isActive = playMode !== 'sequential';

  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Music size={14} color={primaryColor} />
        <TouchableOpacity onPress={onPressTrackName} style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }} numberOfLines={1}>
            {currentTrack.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onTogglePlay} style={{ padding: 4 }}>
          {isPlaying ? <Pause size={16} color={TH.text} /> : <Play size={16} color={TH.text} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleLoop} style={{ padding: 4 }}>
          <ModeIcon size={14} color={isActive ? primaryColor : TH.border} />
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      {duration > 0 && (
        <View style={{ height: 2, backgroundColor: TH.border, borderRadius: 1 }}>
          <View style={{ height: 2, width: `${progress * 100}%`, backgroundColor: primaryColor, borderRadius: 1 }} />
        </View>
      )}
    </View>
  );
}
