import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, MUSIC_CATEGORY_META } from '@egoless-do/core';
import { useMusicStore } from './useMusicStore';
import { useRootNavigation } from '../../navigation/hooks';
import CategoryCard from './CategoryCard';
import PlayerBar from './PlayerBar';
import ImportMusicButton from './ImportMusicButton';

export default function MusicScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const P = TH.primary;

  const getCategoryMeta = useMusicStore(s => s.getCategoryMeta);
  const loadFavorites = useMusicStore(s => s.loadFavorites);
  const loadUserTracks = useMusicStore(s => s.loadUserTracks);

  useEffect(() => {
    loadFavorites();
    loadUserTracks();
  }, [loadFavorites, loadUserTracks]);

  const categories = getCategoryMeta();

  const handleCategoryPress = useCallback((key: string) => {
    nav.navigate('MusicCategory', { category: key });
  }, [nav]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ArrowLeft size={22} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('musicTitle')}</Text>
        </View>
        <ImportMusicButton T={T} primaryColor={P} />
      </View>

      {/* Category Cards Grid */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
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
