import { COLORS, FONT_HERO, FONT_SUB, FONT_TITLE, formatPace } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { Pause } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import MeditationMusicBar from '../../../components/MeditationMusicBar';


interface GpsActiveProps {
  MapView: React.ComponentType<Record<string, unknown>>;
  Polyline: React.ComponentType<Record<string, unknown>>;
  amapReady: boolean;
  mapRef: React.RefObject<unknown>;
  initialPos: { latitude: number; longitude: number };
  coords: { latitude: number; longitude: number }[];
  color: string;
  mode: 'free' | 'target';
  targetProgress: number;
  distKm: number;
  sec: number;
  calories: number;
  handlePause: () => void;
  T: (key: string) => string;
  musicTrack?: MusicTrack | null;
  musicIsPlaying?: boolean;
  musicLoop?: boolean;
  onMusicTogglePlay?: () => void;
  onMusicToggleLoop?: () => void;
  onMusicPress?: () => void;
}

export default function GpsActive({
  MapView, Polyline, amapReady, mapRef, initialPos, coords, color,
  mode, targetProgress, distKm, sec, calories, handlePause, T,
  musicTrack, musicIsPlaying, musicLoop, onMusicTogglePlay, onMusicToggleLoop, onMusicPress,
}: GpsActiveProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 4 }}>
        {amapReady && MapView ? (
          <MapView ref={mapRef} style={{ flex: 1 }} initialCameraPosition={{ target: initialPos, zoom: 16 }} myLocationEnabled>
            {coords.length > 1 && <Polyline points={coords} color={color} width={4} />}
          </MapView>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />
        )}
      </View>
      <View style={{ flex: 6, backgroundColor: '#1a1a2e', padding: 20 }}>
        {mode === 'target' && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${Math.min(targetProgress * 100, 100)}%`, backgroundColor: COLORS.GREEN, borderRadius: 3 }} />
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FONT_HERO(), fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{distKm.toFixed(2)}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 4 }}>km</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FONT_HERO(), fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{T('exerciseTime')}</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FONT_HERO(), fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{formatPace(distKm > 0 ? sec / distKm : 0)}</Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{T('exercisePace')}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: FONT_TITLE(), color: COLORS.ORANGE, fontWeight: '700' }}>{calories} kcal</Text>
        </View>
        <TouchableOpacity onPress={handlePause}
          style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
          <Pause size={36} color="#333" />
        </TouchableOpacity>
        {musicTrack && (
          <View style={{ marginTop: 16 }}>
            <MeditationMusicBar
              track={musicTrack}
              isActive
              isPlaying={musicIsPlaying ?? false}
              primaryColor={COLORS.GREEN}
              loop={musicLoop}
              onTogglePlay={onMusicTogglePlay}
              onToggleLoop={onMusicToggleLoop}
              onPress={onMusicPress}
            />
          </View>
        )}
      </View>
    </View>
  );
}
