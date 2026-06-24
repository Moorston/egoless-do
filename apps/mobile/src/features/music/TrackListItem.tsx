import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Waves, CloudRain, Droplets, Bell, Wind, Bird, Music, Dumbbell } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB, TRACK_VISUAL } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useTheme } from '../../components/UI';
import { useMusicStore } from './useMusicStore';
import FavoriteButton from './FavoriteButton';
import AnimatedMusicIcon from './AnimatedMusicIcon';
import WaveformBar from './WaveformBar';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Waves, CloudRain, Droplets, Bell, Wind, Bird, Music, Dumbbell,
};

interface Props {
  track: MusicTrack;
  isPlaying: boolean;
  isCurrent: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
  primaryColor: string;
  showFavorite?: boolean;
}

export default function TrackListItem({ track, isCurrent, isPlaying, isFavorite, onPlay, onToggleFavorite, primaryColor, showFavorite = true }: Props) {
  const TH = useTheme();
  const visual = TRACK_VISUAL[track.id];
  const IconComp = visual ? (ICON_MAP[visual.icon] ?? Music) : Music;
  const iconColor = visual ? visual.gradient[0] : 'rgba(255,255,255,.4)';

  // Read progress from store instead of polling
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);
  const progress = isCurrent && duration > 0 ? currentTime / duration : 0;

  return (
    <TouchableOpacity onPress={onPlay} activeOpacity={0.7} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      {/* Main row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Left: track info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BODY, color: isCurrent ? primaryColor : TH.text, fontWeight: isCurrent ? '600' : '400' }} numberOfLines={1}>
            {track.name}
          </Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
            {track.category === 'user' ? '我的' : track.category}
          </Text>
        </View>

        {/* Right: favorite + animated icon + category icon */}
        {showFavorite && <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} size={20} />}
        <AnimatedMusicIcon isPlaying={isCurrent && isPlaying} color={isCurrent ? primaryColor : TH.text} size={22} />
        <IconComp size={20} color={iconColor} />
      </View>

      {/* Waveform progress bar */}
      {isCurrent && (
        <View style={{ marginTop: 10 }}>
          <WaveformBar
            trackId={track.id}
            progress={progress}
            primaryColor={primaryColor}
            barCount={40}
            height={22}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}
