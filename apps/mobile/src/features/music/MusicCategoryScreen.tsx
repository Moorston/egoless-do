import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, MUSIC_CATEGORY_META } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';
import { useAudioEngine } from './useAudioEngine';
import { useRootNavigation } from '../../navigation/hooks';
import type { RootStackParamList } from '../../navigation/hooks';
import TrackListItem from './TrackListItem';
import PlayerBar from './PlayerBar';

type Route = RouteProp<RootStackParamList, 'MusicCategory'>;

export default function MusicCategoryScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const route = useRoute<Route>();
  const { category } = route.params;
  const P = TH.primary;

  // 挂载音频引擎
  useAudioEngine();

  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const play = useMusicStore(s => s.play);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const favorites = useMusicStore(s => s.favorites);
  const toggleFavorite = useMusicStore(s => s.toggleFavorite);
  const getTracksByCategory = useMusicStore(s => s.getTracksByCategory);
  const loadFavorites = useMusicStore(s => s.loadFavorites);
  const loadUserTracks = useMusicStore(s => s.loadUserTracks);

  useEffect(() => {
    loadFavorites();
    loadUserTracks();
  }, [loadFavorites, loadUserTracks]);

  const meta = MUSIC_CATEGORY_META.find(m => m.key === category);
  const tracks = getTracksByCategory(category);

  const handlePlay = useCallback((track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      play(track);
    }
  }, [currentTrack, isPlaying, play, pause, resume]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ArrowLeft size={22} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
          {meta ? T(meta.nameKey) : category}
        </Text>
      </View>

      {/* Track List */}
      {tracks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>
            {category === 'favorites' ? T('musicEmptyFavorites') : T('musicNoTracks')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TrackListItem
              track={item}
              isCurrent={currentTrack?.id === item.id}
              isPlaying={currentTrack?.id === item.id && isPlaying}
              isFavorite={favorites.includes(item.id)}
              onPlay={() => handlePlay(item)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              primaryColor={P}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: TH.border, marginHorizontal: 16 }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Bottom Player Bar */}
      <PlayerBar primaryColor={P} category={category} />
    </SafeAreaView>
  );
}
