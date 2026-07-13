import { FONT_TITLE, FONT_BODY, FONT_SUB, MUSIC_CATEGORY_META, TRACK_VISUAL } from '@egoless-do/core';
import { ArrowLeft, Music } from 'lucide-react-native';
import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import AnimatedMusicIcon from '../../../components/AnimatedMusicIcon';
import CategoryCard from '../components/CategoryCard';
import ImportMusicButton from '../components/ImportMusicButton';
import PlayerBar from '../components/PlayerBar';
import WaveformBar from '../components/WaveformBar';
import { useMusicStore, computeCategoryMeta } from '../useMusicStore';

export default function MusicScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const P = TH.primary;

  const library = useMusicStore(s => s.library);
  const userTracks = useMusicStore(s => s.userTracks);
  const favorites = useMusicStore(s => s.favorites);
  const currentTrack = useMusicStore(s => s.currentTrack);
  const isPlaying = useMusicStore(s => s.isPlaying);
  const currentTime = useMusicStore(s => s.currentTime);
  const duration = useMusicStore(s => s.duration);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const loadFavorites = useMusicStore(s => s.loadFavorites);
  const loadUserTracks = useMusicStore(s => s.loadUserTracks);
  const loadVolume = useMusicStore(s => s.loadVolume);

  useEffect(() => {
    loadFavorites();
    loadUserTracks();
    loadVolume();
  }, [loadFavorites, loadUserTracks, loadVolume]);

  const categories = useMemo(() => computeCategoryMeta(library, userTracks, favorites), [library, userTracks, favorites]);

  const handleCategoryPress = useCallback((key: string) => {
    nav.navigate('MusicCategory', { category: key });
  }, [nav]);

  const nowPlayingProgress = duration > 0 ? currentTime / duration : 0;
  const visual = currentTrack ? TRACK_VISUAL[currentTrack.id] : null;
  const gradient = visual?.gradient ?? [P, P];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ArrowLeft size={22} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('musicTitle')}</Text>
        </View>
        <ImportMusicButton T={T} primaryColor={P} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {/* Now Playing Card */}
        {currentTrack && (
          <View
            style={{
              borderRadius: 16, padding: 16, marginBottom: 16,
              backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}
          >
            {/* Icon with gradient background */}
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: `${gradient[0]}20`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AnimatedMusicIcon isPlaying={isPlaying} color={gradient[0]} size={24} />
            </View>

            {/* Track info */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }} numberOfLines={1}>
                {currentTrack.name}
              </Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>
                {isPlaying ? T('musicPlaying') : T('musicPaused')}
              </Text>
              {/* Mini waveform */}
              <View style={{ marginTop: 6 }}>
                <WaveformBar
                  trackId={currentTrack.id}
                  progress={nowPlayingProgress}
                  primaryColor={gradient[0]}
                  inactiveColor={TH.border}
                  barCount={30}
                  height={16}
                />
              </View>
            </View>

            {/* Play/Pause button */}
            <TouchableOpacity
              onPress={() => isPlaying ? pause() : resume()}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: gradient[0],
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <View style={{ width: 3, height: 12, backgroundColor: '#fff', borderRadius: 1 }} />
                  <View style={{ width: 3, height: 12, backgroundColor: '#fff', borderRadius: 1 }} />
                </View>
              ) : (
                <View style={{ marginLeft: 2 }}>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderLeftColor: '#fff', borderTopWidth: 6, borderTopColor: 'transparent', borderBottomWidth: 6, borderBottomColor: 'transparent' }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Category Cards Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {categories.map(cat => {
            const meta = MUSIC_CATEGORY_META.find(m => m.key === cat.key);
            if (!meta) return null;
            return (
              <View key={cat.key} style={{ width: '47.5%' }}>
                <CategoryCard
                  icon={meta.icon}
                  name={T(meta.nameKey)}
                  count={cat.count}
                  gradient={meta.gradient}
                  onPress={() => handleCategoryPress(cat.key)}
                  T={T}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Player Bar */}
      <PlayerBar primaryColor={P} />
    </SafeAreaView>
  );
}
