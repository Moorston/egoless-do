import { FONT_TITLE, FONT_BODY, FONT_SUB, MUSIC_CATEGORY_META, TRACK_VISUAL } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import {ArrowLeft} from 'lucide-react-native';
import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedMusicIcon from '../../components/AnimatedMusicIcon';
import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import CategoryCard from '../components/CategoryCard';
import ImportMusicButton from '../components/ImportMusicButton';
import PlayerBar from '../components/PlayerBar';
import WaveformBar from '../components/WaveformBar';
import {useMusicStore, computeCategoryMeta} from '../useMusicStore';

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
  const recentlyPlayed = useMusicStore(s => s.recentlyPlayed);
  const pause = useMusicStore(s => s.pause);
  const resume = useMusicStore(s => s.resume);
  const play = useMusicStore(s => s.play);
  const setQueue = useMusicStore(s => s.setQueue);
  const loadFavorites = useMusicStore(s => s.loadFavorites);
  const loadUserTracks = useMusicStore(s => s.loadUserTracks);
  const loadVolume = useMusicStore(s => s.loadVolume);
  const loadRecentlyPlayed = useMusicStore(s => s.loadRecentlyPlayed);

  useEffect(() => {
    void loadFavorites();
    void loadUserTracks();
    void loadVolume();
    void loadRecentlyPlayed();
  }, [loadFavorites, loadUserTracks, loadVolume, loadRecentlyPlayed]);

  const categories = useMemo(() => computeCategoryMeta(library, userTracks, favorites), [library, userTracks, favorites]);

  const handleCategoryPress = useCallback((key: string) => {
    nav.navigate('MusicCategory', { category: key });
  }, [nav]);

  const nowPlayingProgress = duration > 0 ? currentTime / duration : 0;
  const visual = currentTrack ? TRACK_VISUAL[currentTrack.id] : null;
  const gradient = visual?.gradient ?? [P, P];

  // 最近播放的完整曲目对象
  const recentTracks = useMemo<MusicTrack[]>(() => {
    const all = [...library, ...userTracks];
    return recentlyPlayed
      .map(id => all.find(t => t.id === id))
      .filter((t): t is MusicTrack => !!t)
      .slice(0, 10);
  }, [recentlyPlayed, library, userTracks]);

  const handlePlayRecent = useCallback((track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      setQueue(recentTracks, recentTracks.findIndex(t => t.id === track.id));
      play(track);
    }
  }, [currentTrack, isPlaying, pause, resume, play, setQueue, recentTracks]);

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
          <TouchableOpacity
            onPress={() => {}} // 由 PlayerBar 的全屏触发
            activeOpacity={0.9}
            style={{
              borderRadius: 16, padding: 18, marginBottom: 16,
              backgroundColor: `${gradient[0]}12`,
              borderWidth: 1, borderColor: `${gradient[0]}30`,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              // shadow
              shadowColor: gradient[0], shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
            }}
          >
            {/* Icon with gradient background */}
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: `${gradient[0]}25`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AnimatedMusicIcon isPlaying={isPlaying} color={gradient[0]} size={28} />
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
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: gradient[0],
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  <View style={{ width: 3, height: 14, backgroundColor: '#fff', borderRadius: 1.5 }} />
                  <View style={{ width: 3, height: 14, backgroundColor: '#fff', borderRadius: 1.5 }} />
                </View>
              ) : (
                <View style={{ marginLeft: 3 }}>
                  <View style={{ width: 0, height: 0, borderLeftWidth: 12, borderLeftColor: '#fff', borderTopWidth: 7, borderTopColor: 'transparent', borderBottomWidth: 7, borderBottomColor: 'transparent' }} />
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
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

        {/* Recently Played */}
        {recentTracks.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text, marginBottom: 12 }}>
              {T('musicRecentPlayed') || '最近播放'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {recentTracks.map(track => {
                const trackVisual = TRACK_VISUAL[track.id];
                const trackGradient = trackVisual?.gradient ?? [P, P];
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <TouchableOpacity
                    key={track.id}
                    onPress={() => handlePlayRecent(track)}
                    style={{ width: 96, alignItems: 'center', gap: 8 }}
                  >
                    <View style={{
                      width: 96, height: 96, borderRadius: 16,
                      backgroundColor: `${trackGradient[0]}20`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AnimatedMusicIcon isPlaying={isCurrent && isPlaying} color={trackGradient[0]} size={36} />
                    </View>
                    <Text style={{ fontSize: FONT_SUB(), color: TH.text, textAlign: 'center' }} numberOfLines={1}>
                      {track.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Bottom Player Bar */}
      <PlayerBar primaryColor={P} />
    </SafeAreaView>
  );
}
