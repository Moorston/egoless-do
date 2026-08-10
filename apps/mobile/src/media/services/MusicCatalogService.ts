// ─── 音乐目录服务 ──────────────────────────────────────────────────
// 整合 Freesound API，提供音乐搜索和下载功能

import { createLogger } from '@egoless-do/core';

const log = createLogger('MusicCatalog');

// API 配置 - 优先使用环境变量
const FREESOUND_API_BASE = 'https://freesound.org/apiv2';
const FREESOUND_TOKEN = process.env.EXPO_PUBLIC_FREESOUND_TOKEN || '';

if (!FREESOUND_TOKEN) {
  log.warn('FREESOUND_TOKEN not configured - music search will not work');
}

// 音乐分类配置
export const MUSIC_CATEGORIES = {
  focus: {
    name: '专注',
    nameKey: 'musicFocus',
    queries: ['white noise', 'ambient', 'focus', 'concentration'],
    icon: 'Waves',
    gradient: ['#0ea5e9', '#0369a1'] as const,
  },
  meditate: {
    name: '冥想',
    nameKey: 'musicMeditate',
    queries: ['meditation', 'relaxation', 'calm', 'singing bowl'],
    icon: 'Bell',
    gradient: ['#f59e0b', '#d97706'] as const,
  },
  exercise: {
    name: '运动',
    nameKey: 'musicExercise',
    queries: ['workout', 'fitness', 'energy', 'beat'],
    icon: 'Dumbbell',
    gradient: ['#10b981', '#059669'] as const,
  },
  sleep: {
    name: '睡眠',
    nameKey: 'musicSleep',
    queries: ['sleep', 'lullaby', 'asmr', 'night'],
    icon: 'Moon',
    gradient: ['#3b82f6', '#2563eb'] as const,
  },
  nature: {
    name: '自然',
    nameKey: 'musicNature',
    queries: ['rain', 'ocean', 'forest', 'birds', 'thunder'],
    icon: 'TreePine',
    gradient: ['#22c55e', '#16a34a'] as const,
  },
} as const;

export type MusicCategory = keyof typeof MUSIC_CATEGORIES;

// 音乐曲目接口
export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  previewUrl: string;
  license: string;
  duration: number;
  source: 'freesound';
  category: MusicCategory;
  isDownloaded?: boolean;
  isFavorite?: boolean;
}

// API 响应接口
interface FreesoundSearchResult {
  id: number;
  name: string;
  username: string;
  url: string;
  license: string;
  duration: number;
  previews: {
    'preview-hq-mp3'?: string;
    'preview-lq-mp3'?: string;
  };
  tags: string[];
}

interface FreesoundResponse {
  count: number;
  results: FreesoundSearchResult[];
}

// HTTP 请求封装
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EgolessDo/1.0 (Music App)',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// 搜索 Freesound
export async function searchFreesound(
  query: string,
  options: {
    page?: number;
    pageSize?: number;
    filter?: string;
  } = {}
): Promise<{ count: number; results: CatalogTrack[] }> {
  const { page = 1, pageSize = 20, filter } = options;

  let url = `${FREESOUND_API_BASE}/search/text/?query=${encodeURIComponent(query)}&token=${FREESOUND_TOKEN}&page=${page}&page_size=${pageSize}&sort=score`;

  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }

  try {
    const data = await fetchJson<FreesoundResponse>(url);

    const results: CatalogTrack[] = data.results.map(sound => ({
      id: `freesound-${sound.id}`,
      title: sound.name,
      artist: sound.username,
      url: sound.url,
      previewUrl: sound.previews['preview-hq-mp3'] || sound.previews['preview-lq-mp3'] || '',
      license: sound.license,
      duration: sound.duration || 0,
      source: 'freesound',
      category: 'focus', // 默认分类，后续根据查询词判断
    }));

    return {
      count: data.count,
      results,
    };
  } catch (error) {
    log.error('Freesound 搜索失败:', error);
    throw error;
  }
}

// 根据分类搜索音乐
export async function searchByCategory(
  category: MusicCategory,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<CatalogTrack[]> {
  const categoryConfig = MUSIC_CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`未知分类: ${category}`);
  }

  const { pageSize = 10 } = options;
  const allResults: CatalogTrack[] = [];

  // 搜索该分类的前2个关键词（并行执行）
  const queries = categoryConfig.queries.slice(0, 2);
  const searchPromises = queries.map(async (query) => {
    try {
      const { results } = await searchFreesound(query, {
        pageSize: Math.ceil(pageSize / 2),
      });

      // 设置正确的分类
      return results.map(track => ({
        ...track,
        category,
      }));
    } catch (error) {
      log.warn(`搜索 "${query}" 失败:`, error);
      return [];
    }
  });

  const searchResults = await Promise.all(searchPromises);
  searchResults.forEach(results => allResults.push(...results));

  // 去重（基于唯一ID）
  const idSet = new Set<string>();
  const uniqueResults = allResults.filter(track => {
    if (idSet.has(track.id)) {
      return false;
    }
    idSet.add(track.id);
    return true;
  });

  return uniqueResults.slice(0, pageSize);
}

// 搜索音乐（跨分类）
export async function searchMusic(
  query: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {}
): Promise<CatalogTrack[]> {
  try {
    const { results } = await searchFreesound(query, options);
    return results;
  } catch (error) {
    log.error('搜索音乐失败:', error);
    return [];
  }
}

// 获取音乐详情
export async function getTrackDetails(trackId: string): Promise<CatalogTrack | null> {
  // 从 ID 中提取 Freesound ID
  const freesoundId = trackId.replace('freesound-', '');

  const url = `${FREESOUND_API_BASE}/sounds/${freesoundId}/?token=${FREESOUND_TOKEN}`;

  try {
    const data = await fetchJson<FreesoundSearchResult>(url);

    return {
      id: `freesound-${data.id}`,
      title: data.name,
      artist: data.username,
      url: data.url,
      previewUrl: data.previews['preview-hq-mp3'] || data.previews['preview-lq-mp3'] || '',
      license: data.license,
      duration: data.duration || 0,
      source: 'freesound',
      category: 'focus',
    };
  } catch (error) {
    log.error('获取音乐详情失败:', error);
    return null;
  }
}
