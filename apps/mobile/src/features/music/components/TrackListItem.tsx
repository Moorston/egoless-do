import { FONT_BODY, FONT_SUB, MUSIC_CATEGORY_META } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { Trash2 } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useMusicStore } from '../useMusicStore';

import AnimatedMusicIcon from './AnimatedMusicIcon';
import FavoriteButton from './FavoriteButton';
import WaveformBar from './WaveformBar';

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

function TrackListItem({ track, isCurrent, isPlaying, isFavorite, onPlay, onToggleFavorite, primaryColor, showFavorite = true }: Props) {
  const TH = useTheme();
  const T = useT();

  const removeUserTrack = useMusicStore(s => s.removeUserTrack);
  const isUserTrack = track.category === 'user';

  // Read progress from store instead of polling
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);
  const progress = isCurrent && duration > 0 ? currentTime / duration : 0;

  // Category display name
  const categoryMeta = MUSIC_CATEGORY_META.find(m => m.key === track.category);
  const categoryLabel = categoryMeta ? T(categoryMeta.nameKey) : (track.category === 'user' ? T('musicMy') : track.category);

  const handleDelete = useCallback(() => {
    Alert.alert(
      T('musicDelete'),
      T('musicDeleteConfirm'),
      [
        { text: T('cancel'), style: 'cancel' },
        { text: T('musicDelete'), style: 'destructive', onPress: () => removeUserTrack(track.id) },
      ],
    );
  }, [track.id, removeUserTrack, T]);

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
            {categoryLabel}
          </Text>
        </View>

        {/* Right: favorite + animated icon + delete */}
        {showFavorite && <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} size={20} />}
        <AnimatedMusicIcon isPlaying={isCurrent && isPlaying} color={isCurrent ? primaryColor : TH.text} size={22} />
        {isUserTrack && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
            <Trash2 size={16} color={TH.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* Waveform progress bar */}
      {isCurrent && (
        <View style={{ marginTop: 10 }}>
          <WaveformBar
            trackId={track.id}
            progress={progress}
            primaryColor={primaryColor}
            inactiveColor={TH.border}
            barCount={40}
            height={22}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(TrackListItem);
