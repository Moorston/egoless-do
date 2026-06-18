import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Music } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';
import { audioSessionManager } from './AudioSessionManager';
import TrackListItem from './TrackListItem';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectTrack?: (track: MusicTrack | null) => void;
  onSelectNoMusic?: () => void;
  primaryColor: string;
  selectedTrackId?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  focus: '专注',
  meditate: '冥想',
  exercise: '运动',
  user: '我的',
};

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

  // Group tracks by category
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; tracks: typeof library }[] = [];

    // Group by category
    const cats = ['focus', 'meditate', 'exercise', 'user'] as const;
    for (const cat of cats) {
      const tracks = cat === 'user' ? userTracks : library.filter(t => t.category === cat);
      if (tracks.length > 0) {
        groups.push({ key: cat, label: CATEGORY_LABELS[cat] ?? cat, tracks });
      }
    }
    return groups;
  }, [library, userTracks]);

  const handlePlay = (track: typeof library[0]) => {
    if (currentTrack?.id === track.id) {
      // Same track: toggle play/pause
      if (isPlaying) pause();
      else {
        const allowed = audioSessionManager.requestPlay('music');
        if (allowed) resume();
      }
    } else {
      // New track: check with session manager before playing
      const allowed = audioSessionManager.requestPlay('music');
      if (allowed) {
        play(track);
        onSelectTrack?.(track);
      }
    }
  };

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

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* No music option */}
            <TouchableOpacity
              onPress={() => { onSelectNoMusic?.(); }}
              activeOpacity={0.7}
              style={[styles.noMusicItem, { backgroundColor: !selectedTrackId ? `${primaryColor}10` : 'transparent' }]}
            >
              <View style={[styles.noMusicIcon, { backgroundColor: !selectedTrackId ? `${primaryColor}18` : `${primaryColor}08` }]}>
                <Music size={18} color={!selectedTrackId ? primaryColor : TH.sub} />
              </View>
              <Text style={[styles.noMusicText, { color: !selectedTrackId ? primaryColor : TH.text }]}>{T('medNoMusic')}</Text>
              {!selectedTrackId && <View style={[styles.checkDot, { backgroundColor: primaryColor }]} />}
            </TouchableOpacity>

            {grouped.map(group => (
              <View key={group.key} style={styles.group}>
                <Text style={[styles.groupLabel, { color: TH.sub }]}>{group.label}</Text>
                {group.tracks.map(track => (
                  <TrackListItem
                    key={track.id}
                    track={track}
                    isCurrent={selectedTrackId === track.id}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    isFavorite={favorites.includes(track.id)}
                    onPlay={() => handlePlay(track)}
                    onToggleFavorite={() => toggleFavorite(track.id)}
                    primaryColor={primaryColor}
                    showFavorite={false}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Confirm button */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.confirmBtn, { backgroundColor: primaryColor }]}
            >
              <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '600' }}>{T('confirm')}</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  group: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: FONT_SUB,
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
    fontSize: FONT_BODY,
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
