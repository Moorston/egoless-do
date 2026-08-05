import { FONT_TITLE, FONT_BODY, FONT_SUB, MUSIC_CATEGORY_META } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { X, Music } from 'lucide-react-native';
import React, { useMemo, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import { audioSessionManager } from '../../services/AudioSessionManager';
import { useMusicStore } from '../useMusicStore';

import TrackListItem from './TrackListItem';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectTrack?: (track: MusicTrack | null) => void;
  onSelectNoMusic?: () => void;
  primaryColor: string;
  selectedTrackId?: string | null;
}

interface NoMusicItem { type: 'noMusic'; key: string }
interface SectionHeaderItem { type: 'section'; key: string; label: string }
interface TrackListItemData { type: 'track'; key: string; track: MusicTrack }

type FlatItem = NoMusicItem | SectionHeaderItem | TrackListItemData;

export default function MusicPickerModal({ visible, onClose, onSelectTrack, onSelectNoMusic, primaryColor, selectedTrackId }: Props) {
  const TH = useTheme();
  const T = useT();

  const library = useMusicStore(s => s.library);
  const userTracks = useMusicStore(s => s.userTracks);
  const favorites = useMusicStore(s => s.favorites);
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const play = useMusicStore(s => s.play);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const toggleFavorite = useMusicStore(s => s.toggleFavorite);

  // Group tracks by category with translated labels
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; tracks: typeof library }[] = [];
    const cats = ['focus', 'meditate', 'exercise', 'user'] as const;
    for (const cat of cats) {
      const tracks = cat === 'user' ? userTracks : library.filter(t => t.category === cat);
      if (tracks.length > 0) {
        const meta = MUSIC_CATEGORY_META.find(m => m.key === cat);
        const label = meta ? T(meta.nameKey) : (cat === 'user' ? T('musicMy') : cat);
        groups.push({ key: cat, label, tracks });
      }
    }
    return groups;
  }, [library, userTracks, T]);

  // Flatten grouped tracks into a single list for FlatList (includes no-music option and section headers)
  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [{ type: 'noMusic', key: 'no-music' }];
    for (const group of grouped) {
      items.push({ type: 'section', key: `header:${group.key}`, label: group.label });
      for (const track of group.tracks) {
        items.push({ type: 'track', key: track.id, track });
      }
    }
    return items;
  }, [grouped]);

  const handlePlay = useCallback((track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) pause();
      else {
        const allowed = audioSessionManager.requestPlay('music');
        if (allowed) resume();
      }
    } else {
      const allowed = audioSessionManager.requestPlay('music');
      if (allowed) {
        play(track);
        onSelectTrack?.(track);
      }
    }
  }, [currentTrack, isPlaying, pause, resume, play, onSelectTrack]);

  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    switch (item.type) {
      case 'noMusic':
        return (
          <TouchableOpacity
            onPress={() => { onSelectNoMusic?.(); onClose(); }}
            activeOpacity={0.7}
            style={[styles.noMusicItem, { backgroundColor: !selectedTrackId ? `${primaryColor}10` : 'transparent' }]}
          >
            <View style={[styles.noMusicIcon, { backgroundColor: !selectedTrackId ? `${primaryColor}18` : `${primaryColor}08` }]}>
              <Music size={18} color={!selectedTrackId ? primaryColor : TH.sub} />
            </View>
            <Text style={[styles.noMusicText, { color: !selectedTrackId ? primaryColor : TH.text }]}>{T('medNoMusic')}</Text>
            {!selectedTrackId && <View style={[styles.checkDot, { backgroundColor: primaryColor }]} />}
          </TouchableOpacity>
        );
      case 'section':
        return (
          <View style={styles.group}>
            <Text style={[styles.groupLabel, { color: TH.sub }]}>{item.label}</Text>
          </View>
        );
      case 'track':
        return (
          <TrackListItem
            track={item.track}
            isCurrent={selectedTrackId === item.track.id}
            isPlaying={currentTrack?.id === item.track.id && isPlaying}
            isFavorite={favorites.includes(item.track.id)}
            onPlay={() => handlePlay(item.track)}
            onToggleFavorite={() => toggleFavorite(item.track.id)}
            primaryColor={primaryColor}
            showFavorite={true}
          />
        );
    }
  }, [selectedTrackId, primaryColor, TH, T, onSelectNoMusic, onClose, currentTrack, isPlaying, favorites, handlePlay, toggleFavorite]);

  const keyExtractor = useCallback((item: FlatItem) => item.key, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>{T('bgMusic')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 20 }}
            data={flatItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  group: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: FONT_SUB(),
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noMusicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    gap: 12,
  },
  noMusicIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMusicText: {
    fontSize: FONT_BODY(),
    flex: 1,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});