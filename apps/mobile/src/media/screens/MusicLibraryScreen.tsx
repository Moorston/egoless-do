// ─── 音乐库页面 ──────────────────────────────────────────────────
// 浏览、搜索、预览、下载音乐

import { FONT_TITLE, FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { ArrowLeft, Search, Download, Play, Pause, Heart, Square, Check } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useMusicStore } from '../useMusicStore';
import {
  searchByCategory,
  searchMusic,
  MUSIC_CATEGORIES,
  type MusicCategory,
  type CatalogTrack,
} from '../services/MusicCatalogService';
import { audioPreviewService, type PreviewStatus } from '../services/AudioPreviewService';
import { musicDownloadService, type DownloadStatus } from '../services/MusicDownloadService';

export default function MusicLibraryScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const P = TH.primary;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogTrack[]>([]);
  const [categoryTracks, setCategoryTracks] = useState<Record<MusicCategory, CatalogTrack[]>>({
    focus: [],
    meditate: [],
    exercise: [],
    sleep: [],
    nature: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MusicCategory | null>(null);
  const [previewTrack, setPreviewTrack] = useState<CatalogTrack | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [downloadStatuses, setDownloadStatuses] = useState<Record<string, DownloadStatus>>({});
  const [downloadingTracks, setDownloadingTracks] = useState<Set<string>>(new Set());

  // 初始化服务
  useEffect(() => {
    void audioPreviewService.initialize();
    void musicDownloadService.initialize();

    return () => {
      void audioPreviewService.stop();
    };
  }, []);

  // 加载分类音乐
  const loadCategoryTracks = useCallback(async (category: MusicCategory) => {
    setLoading(true);
    try {
      const tracks = await searchByCategory(category, { pageSize: 10 });
      setCategoryTracks(prev => ({ ...prev, [category]: tracks }));
    } catch (error) {
      console.error('加载分类音乐失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 搜索音乐
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchMusic(searchQuery, { pageSize: 20 });
      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // 预览音乐
  const handlePreview = useCallback(async (track: CatalogTrack) => {
    try {
      // 如果点击的是当前播放的曲目，则暂停/恢复
      if (audioPreviewService.isPlayingTrack(track.id)) {
        await audioPreviewService.pause();
        setIsPreviewPlaying(false);
        return;
      }

      // 如果点击的是已暂停的曲目，则恢复播放
      if (audioPreviewService.getCurrentTrackId() === track.id) {
        await audioPreviewService.resume();
        setIsPreviewPlaying(true);
        return;
      }

      // 播放新曲目
      setPreviewTrack(track);
      setIsPreviewPlaying(true);
      setPreviewProgress(0);
      setPreviewPosition(0);
      setPreviewDuration(30); // 预览时长限制

      await audioPreviewService.play(track.id, track.previewUrl, (status: PreviewStatus) => {
        setPreviewProgress(status.progress);
        setPreviewPosition(status.position);
        setPreviewDuration(status.duration);
        setIsPreviewPlaying(status.isPlaying);

        // 播放结束
        if (status.position >= status.duration) {
          setIsPreviewPlaying(false);
        }
      });
    } catch (error) {
      console.error('预览失败:', error);
      setIsPreviewPlaying(false);
    }
  }, []);

  // 停止预览
  const handleStopPreview = useCallback(async () => {
    await audioPreviewService.stop();
    setIsPreviewPlaying(false);
    setPreviewTrack(null);
    setPreviewProgress(0);
    setPreviewPosition(0);
  }, []);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // 下载音乐
  const handleDownload = useCallback(async (track: CatalogTrack) => {
    const trackId = track.id;

    // 检查是否已下载
    if (musicDownloadService.isDownloaded(trackId)) {
      Alert.alert(T('common.notice'), T('music_library.already_downloaded'));
      return;
    }

    // 检查是否正在下载
    if (downloadingTracks.has(trackId)) {
      Alert.alert(T('common.notice'), T('music_library.downloading'));
      return;
    }

    // 开始下载
    setDownloadingTracks(prev => new Set(prev).add(trackId));

    try {
      await musicDownloadService.download(track, (status) => {
        setDownloadStatuses(prev => ({ ...prev, [trackId]: status }));
      });

      Alert.alert(T('common.success'), T('music_library.download_complete', { title: track.title }));
    } catch (error) {
      Alert.alert(T('common.error'), T('music_library.download_failed', { title: track.title, error: error instanceof Error ? error.message : T('common.unknown_error') }));
    } finally {
      setDownloadingTracks(prev => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  }, [downloadingTracks]);

  // 检查是否已下载
  const isTrackDownloaded = useCallback((trackId: string) => {
    return musicDownloadService.isDownloaded(trackId);
  }, []);

  // 渲染分类卡片
  const renderCategoryCard = (category: MusicCategory) => {
    const config = MUSIC_CATEGORIES[category];
    const tracks = categoryTracks[category];

    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryCard, { backgroundColor: TH.card, borderColor: TH.border }]}
        onPress={() => {
          setActiveCategory(category);
          if (tracks.length === 0) {
            loadCategoryTracks(category);
          }
        }}
      >
        <View style={[styles.categoryIcon, { backgroundColor: `${config.gradient[0]}20` }]}>
          <Text style={{ fontSize: 24 }}>{config.icon === 'Waves' ? '🌊' : config.icon === 'Bell' ? '🔔' : config.icon === 'Dumbbell' ? '💪' : config.icon === 'Moon' ? '🌙' : '🌲'}</Text>
        </View>
        <Text style={[styles.categoryName, { color: TH.text }]}>{T(config.nameKey)}</Text>
        <Text style={[styles.categoryCount, { color: TH.sub }]}>
          {tracks.length > 0 ? `${tracks.length} ${T('music_library.tracks')}` : T('common.loading')}
        </Text>
      </TouchableOpacity>
    );
  };

  // 渲染音乐列表项
  const renderTrackItem = (track: CatalogTrack) => {
    const isDownloaded = isTrackDownloaded(track.id);
    const isDownloading = downloadingTracks.has(track.id);
    const downloadStatus = downloadStatuses[track.id];

    return (
      <View key={track.id} style={[styles.trackItem, { borderBottomColor: TH.border }]}>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: TH.text }]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={[styles.trackArtist, { color: TH.sub }]}>
            {track.artist} · {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
          </Text>
          {isDownloading && downloadStatus && (
            <View style={styles.downloadProgress}>
              <View style={[styles.downloadProgressBar, { backgroundColor: `${P}30` }]}>
                <View style={[styles.downloadProgressFill, { backgroundColor: P, width: `${downloadStatus.progress}%` }]} />
              </View>
              <Text style={[styles.downloadProgressText, { color: TH.sub }]}>
                {downloadStatus.progress}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.trackActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${P}20` }]}
            onPress={() => handlePreview(track)}
          >
            <Play size={16} color={P} />
          </TouchableOpacity>

          {isDownloaded ? (
            <View style={[styles.actionButton, { backgroundColor: '#10b98120' }]}>
              <Check size={16} color="#10b981" />
            </View>
          ) : isDownloading ? (
            <View style={[styles.actionButton, { backgroundColor: `${P}20` }]}>
              <ActivityIndicator size="small" color={P} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${P}20` }]}
              onPress={() => handleDownload(track)}
            >
              <Download size={16} color={P} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ArrowLeft size={22} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T('music_library.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <Search size={18} color={TH.sub} />
        <TextInput
          style={[styles.searchInput, { color: TH.text }]}
          placeholder={T('music_library.search_placeholder')}
          placeholderTextColor={TH.sub}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={previewTrack ? { paddingBottom: 100 } : undefined}>
        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('music_library.search_results')}</Text>
            {searchResults.map(renderTrackItem)}
          </View>
        )}

        {/* 分类卡片 */}
        {!activeCategory && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('music_library.categories')}</Text>
            <View style={styles.categoryGrid}>
              {Object.keys(MUSIC_CATEGORIES).map(cat => renderCategoryCard(cat as MusicCategory))}
            </View>
          </View>
        )}

        {/* 分类详情 */}
        {activeCategory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={() => setActiveCategory(null)}>
                <Text style={[styles.backButton, { color: P }]}>← {T('common.back')}</Text>
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                {MUSIC_CATEGORIES[activeCategory].name}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={P} style={styles.loader} />
            ) : (
              categoryTracks[activeCategory].map(renderTrackItem)
            )}
          </View>
        )}

        {/* 预览播放器 */}
        {previewTrack && (
          <View style={[styles.previewPlayer, { backgroundColor: TH.card, borderColor: TH.border }]}>
            {/* 进度条 */}
            <View style={[styles.progressBar, { backgroundColor: `${P}30` }]}>
              <View style={[styles.progressFill, { backgroundColor: P, width: `${previewProgress * 100}%` }]} />
            </View>

            <View style={styles.previewContent}>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewTitle, { color: TH.text }]} numberOfLines={1}>
                  {previewTrack.title}
                </Text>
                <Text style={[styles.previewArtist, { color: TH.sub }]}>
                  {previewTrack.artist} · {formatTime(previewPosition)} / {formatTime(previewDuration)}
                </Text>
              </View>

              <View style={styles.previewControls}>
                <TouchableOpacity
                  style={[styles.previewButton, { backgroundColor: P }]}
                  onPress={() => handlePreview(previewTrack)}
                >
                  {isPreviewPlaying ? (
                    <Pause size={20} color="#fff" />
                  ) : (
                    <Play size={20} color="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stopButton, { backgroundColor: `${TH.sub}30` }]}
                  onPress={handleStopPreview}
                >
                  <Square size={16} color={TH.sub} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_BODY(),
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '600',
  },
  backButton: {
    fontSize: FONT_BODY(),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: FONT_SUB(),
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '500',
  },
  trackArtist: {
    fontSize: FONT_SUB(),
    marginTop: 2,
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  downloadProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  downloadProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  downloadProgressText: {
    fontSize: 12,
    minWidth: 30,
  },
  trackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 40,
  },
  previewPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  progressBar: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewInfo: {
    flex: 1,
    marginRight: 12,
  },
  previewTitle: {
    fontSize: FONT_BODY(),
    fontWeight: '500',
  },
  previewArtist: {
    fontSize: FONT_SUB(),
    marginTop: 2,
  },
  previewControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
