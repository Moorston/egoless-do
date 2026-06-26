import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Music, ChevronRight, Waves, CloudRain, Droplets, Bell, Wind, Bird, Dumbbell } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB, TRACK_VISUAL } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useTheme, useT } from '../../components/UI';
import AnimatedMusicIcon from '../music/components/AnimatedMusicIcon';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Waves, CloudRain, Droplets, Bell, Wind, Bird, Music, Dumbbell,
};

const CATEGORY_SUBTITLE: Record<string, string> = {
  focus: 'medMusicFocus',
  meditate: 'medMusicMeditate',
  exercise: 'medMusicExercise',
  user: 'medMusicUser',
};

interface Props {
  track: MusicTrack | null;
  isActive: boolean;
  isPlaying: boolean;
  primaryColor: string;
  onPress?: () => void;
}

function CoverIcon({ track, size = 44 }: { track: MusicTrack | null; size?: number }) {
  const visual = track ? TRACK_VISUAL[track.id] : null;
  const IconComp = visual ? (ICON_MAP[visual.icon] ?? Music) : Music;

  if (visual) {
    return (
      <LinearGradient
        colors={[visual.gradient[0], visual.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cover, { width: size, height: size, borderRadius: size * 0.27 }]}
      >
        <IconComp size={size * 0.5} color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.cover, styles.coverEmpty, { width: size, height: size, borderRadius: size * 0.27 }]}>
      <Music size={size * 0.5} color="rgba(255,255,255,.5)" />
    </View>
  );
}

export default function MeditationMusicBar({ track, isActive, isPlaying, primaryColor, onPress }: Props) {
  const TH = useTheme();
  const T = useT();

  if (isActive) {
    return (
      <View style={[styles.bar, { backgroundColor: `${primaryColor}10` }]}>
        <AnimatedMusicIcon isPlaying={isPlaying} color={primaryColor} size={18} />
        <Text style={[styles.barName, { color: TH.text }]} numberOfLines={1}>
          {track?.name ?? ''}
        </Text>
      </View>
    );
  }

  const subtitleKey = track ? CATEGORY_SUBTITLE[track.category] : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.card, { backgroundColor: `${primaryColor}08` }]}>
      <CoverIcon track={track} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: track ? TH.text : TH.sub }]} numberOfLines={1}>
          {track ? track.name : T('medSelectMusic')}
        </Text>
        <Text style={[styles.sub, { color: TH.sub }]} numberOfLines={1}>
          {subtitleKey ? T(subtitleKey) : T('medTapToSelect')}
        </Text>
      </View>
      <ChevronRight size={16} color={TH.sub} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmpty: {
    backgroundColor: '#e2d9f3',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_BODY,
    fontWeight: '500',
  },
  sub: {
    fontSize: FONT_SUB,
    marginTop: 2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  barName: {
    fontSize: FONT_SUB,
    flex: 1,
  },
});
