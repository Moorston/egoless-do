import {FONT_TITLE, FONT_BODY, MUSIC_CATEGORY_META} from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Music, Heart, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import type { RootStackParamList } from '../../navigation/hooks';
import PlayerBar from '../components/PlayerBar';
import SearchSortBar, { type SortType } from '../components/SearchSortBar';
import TrackListItem from '../components/TrackListItem';
import { useMusicStore, computeTracksByCategory } from '../useMusicStore';

type Route = RouteProp<RootStackParamList, 'MusicCategory'>;

export default function MusicCategoryScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const route = useRoute<Route>();
  const { category } = route.params;
  const P = TH.primary;

  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const play = useMusicStore(s => s.play);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const favorites = useMusicStore(s => s.favorites);
  const library = useMusicStore(s => s.library);
  const userTracks = useMusicStore(s => s.userTracks);
  const toggleFavorite = useMusicStore(s => s.toggleFavorite);
  const setQueue = useMusicStore(s => s.setQueue);
  const removeUserTrack = useMusicStore(s => s.removeUserTrack);
  const loadFavorites = useMusicStore(s => s.loadFavorites);
  const loadUserTracks = useMusicStore(s => s.loadUserTracks);

  // 批量操作状态
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadFavorites();
    void loadUserTracks();
  }, [loadFavorites, loadUserTracks]);

  const meta = MUSIC_CATEGORY_META.find(m => m.key === category);
  const baseTracks = useMemo(() => computeTracksByCategory(library, userTracks, favorites, category), [library, userTracks, favorites, category]);

  // 搜索 + 排序
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('default');

  const tracks = useMemo(() => {
    let result = baseTracks;
    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.nameEn?.toLowerCase().includes(q));
    }
    // 排序
    if (sortType === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [baseTracks, searchQuery, sortType]);

  const handlePlay = useCallback((track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      // Set queue for the category and play
      const idx = tracks.findIndex(t => t.id === track.id);
      setQueue(tracks, idx >= 0 ? idx : 0);
      play(track);
    }
  }, [currentTrack, isPlaying, play, pause, resume, tracks, setQueue]);

  // ── 批量操作 ──
  const handleLongPress = useCallback((track: MusicTrack) => {
    if (track.category !== 'user') return;
    setSelectionMode(true);
    setSelectedIds(prev => new Set(prev).add(track.id));
  }, []);

  const handleToggleSelect = useCallback((track: MusicTrack) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      T('musicDelete'),
      T('musicDeleteConfirm'),
      [
        { text: T('cancel'), style: 'cancel' },
        {
          text: T('musicDelete'), style: 'destructive',
          onPress: () => {
            selectedIds.forEach(id => { void removeUserTrack(id); });
            handleCancelSelection();
          },
        },
      ],
    );
  }, [selectedIds, removeUserTrack, handleCancelSelection, T]);

  const renderTrackItem = useCallback(({ item }: { item: MusicTrack }) => {
  if (selectionMode) {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => handleToggleSelect(item)}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: isSelected ? `${P}15` : undefined }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? P : TH.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {isSelected && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: P }} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.text }} numberOfLines={1}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <TrackListItem
      track={item}
      isCurrent={currentTrack?.id === item.id}
      isPlaying={currentTrack?.id === item.id && isPlaying}
      isFavorite={favorites.includes(item.id)}
      onPlay={() => handlePlay(item)}
      onToggleFavorite={() => toggleFavorite(item.id)}
      primaryColor={P}
      onLongPress={() => handleLongPress(item)}
    />
  );
  }, [currentTrack, isPlaying, favorites, handlePlay, toggleFavorite, P, selectionMode, selectedIds, handleToggleSelect, TH, handleLongPress]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={handleCancelSelection}>
              <X size={22} color={TH.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, flex: 1 }}>
              {T('musicSelected')} {String(selectedIds.size)}
            </Text>
            {selectedIds.size > 0 && (
              <TouchableOpacity onPress={handleBatchDelete} style={{ padding: 8, backgroundColor: 'rgba(239,68,68,.15)', borderRadius: 8 }}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => nav.goBack()}>
              <ArrowLeft size={22} color={TH.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>
              {meta ? T(meta.nameKey) : category}
            </Text>
          </>
        )}
      </View>

      {/* Search & Sort */}
      {(category === 'all' || category === 'my' || category === 'favorites' || !!meta) && (
        <SearchSortBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortType={sortType}
          onSortChange={setSortType}
        />
      )}

      {/* Track List */}
      {tracks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 }}>
          {category === 'favorites' ? (
            <Heart size={48} color={TH.border} />
          ) : (
            <Music size={48} color={TH.border} />
          )}
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>
            {category === 'favorites' ? T('musicEmptyFavorites') : T('musicNoTracks')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.id}
          renderItem={renderTrackItem}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: TH.border, marginHorizontal: 16 }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Bottom Player Bar */}
      <PlayerBar primaryColor={P} category={category} />
    </SafeAreaView>
  );
}
