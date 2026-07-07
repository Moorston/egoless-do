import { FONT_HERO, FONT_TITLE } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import React from 'react';
import { View, Text } from 'react-native';

import MeditationMusicBar from '../../meditation/MeditationMusicBar';


interface Props {
  countdown: number;
  label: string;
  musicTrack?: MusicTrack | null;
  musicIsPlaying?: boolean;
  musicLoop?: boolean;
  onMusicTogglePlay?: () => void;
  onMusicToggleLoop?: () => void;
  onMusicPress?: () => void;
}

export default function CountdownPage({ countdown, label, musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onMusicPress }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: FONT_HERO, fontWeight: '900', color: '#fff' }}>{countdown}</Text>
      <Text style={{ fontSize: FONT_TITLE, color: 'rgba(255,255,255,.5)', marginTop: 16 }}>{label}</Text>
      {musicTrack && (
        <View style={{ position: 'absolute', bottom: 48, left: 20, right: 20 }}>
          <MeditationMusicBar
            track={musicTrack}
            isActive
            isPlaying={musicIsPlaying ?? false}
            primaryColor="rgba(255,255,255,.6)"
            loop={musicLoop}
            onTogglePlay={onMusicTogglePlay}
            onToggleLoop={onMusicToggleLoop}
            onPress={onMusicPress}
          />
        </View>
      )}
    </View>
  );
}
