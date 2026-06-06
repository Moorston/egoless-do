import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { BUILTIN_TRACKS, USER_MUSIC_STORAGE_KEY, MUSIC_FAVORITES_KEY } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';

// 内置音乐文件映射（require 必须在模块顶层静态声明）
const BUILTIN_FILES: Record<string, number> = {
  'ocean':          require('../../../assets/sounds/ocean.mp3'),
  'rain':           require('../../../assets/sounds/rain.mp3'),
  'flowing-stream': require('../../../assets/sounds/flowing-stream.mp3'),
  'bowl':           require('../../../assets/sounds/bowl.mp3'),
  'wind-chimes':    require('../../../assets/sounds/wind-chimes.mp3'),
  'birds':          require('../../../assets/sounds/birds.mp3'),
};

// 填充内置音乐的 file 字段
const LIBRARY: MusicTrack[] = BUILTIN_TRACKS.map(t => ({
  ...t,
  file: BUILTIN_FILES[t.id] ?? 0,
}));

const USER_MUSIC_DIR = `${FileSystem.documentDirectory}user-music/`;

interface MusicState {
  library: MusicTrack[];
  userTracks: MusicTrack[];
  favorites: string[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  loop: boolean;

  play: (track: MusicTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  setIsPlaying: (v: boolean) => void;
  addUserTrack: (name: string, uri: string) => Promise<void>;
  removeUserTrack: (id: string) => Promise<void>;
  loadUserTracks: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  getTracksByCategory: (cat: string) => MusicTrack[];
  getCategoryMeta: () => { key: string; name: string; icon: string; count: number; isFavorite?: boolean }[];
}

export const useMusicStore = create<MusicState>((set, get) => ({
  library: LIBRARY,
  userTracks: [],
  favorites: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.3,
  loop: true,

  play: (track) => set({ currentTrack: track, isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ currentTrack: null, isPlaying: false }),
  setVolume: (v) => set({ volume: v }),
  toggleLoop: () => set(s => ({ loop: !s.loop })),
  setIsPlaying: (v) => set({ isPlaying: v }),

  addUserTrack: async (name, uri) => {
    // 确保目录存在
    const dirInfo = await FileSystem.getInfoAsync(USER_MUSIC_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(USER_MUSIC_DIR, { intermediates: true });
    }
    // 生成唯一文件名
    const ext = name.split('.').pop() ?? 'mp3';
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const destUri = `${USER_MUSIC_DIR}${id}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: destUri });

    const track: MusicTrack = {
      id,
      name: name.replace(/\.[^.]+$/, ''),
      nameEn: name.replace(/\.[^.]+$/, ''),
      category: 'user',
      uri: destUri,
    };

    const updated = [...get().userTracks, track];
    set({ userTracks: updated });
    await AsyncStorage.setItem(USER_MUSIC_STORAGE_KEY, JSON.stringify(updated));
  },

  removeUserTrack: async (id) => {
    const track = get().userTracks.find(t => t.id === id);
    if (track?.uri) {
      const info = await FileSystem.getInfoAsync(track.uri);
      if (info.exists) await FileSystem.deleteAsync(track.uri);
    }
    const updated = get().userTracks.filter(t => t.id !== id);
    set({ userTracks: updated });
    await AsyncStorage.setItem(USER_MUSIC_STORAGE_KEY, JSON.stringify(updated));
    // 如果删除的是当前播放曲目，停止播放
    if (get().currentTrack?.id === id) {
      set({ currentTrack: null, isPlaying: false });
    }
  },

  loadUserTracks: async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_MUSIC_STORAGE_KEY);
      if (raw) {
        const tracks: MusicTrack[] = JSON.parse(raw);
        // 验证文件仍存在
        const valid: MusicTrack[] = [];
        for (const t of tracks) {
          if (t.uri) {
            const info = await FileSystem.getInfoAsync(t.uri);
            if (info.exists) valid.push(t);
          }
        }
        set({ userTracks: valid });
        if (valid.length !== tracks.length) {
          await AsyncStorage.setItem(USER_MUSIC_STORAGE_KEY, JSON.stringify(valid));
        }
      }
    } catch {}
  },

  toggleFavorite: async (id) => {
    const { favorites } = get();
    const updated = favorites.includes(id)
      ? favorites.filter(fid => fid !== id)
      : [...favorites, id];
    set({ favorites: updated });
    await AsyncStorage.setItem(MUSIC_FAVORITES_KEY, JSON.stringify(updated));
  },

  loadFavorites: async () => {
    try {
      const raw = await AsyncStorage.getItem(MUSIC_FAVORITES_KEY);
      if (raw) {
        set({ favorites: JSON.parse(raw) });
      }
    } catch {}
  },

  getTracksByCategory: (cat) => {
    const { library, userTracks, favorites } = get();
    if (cat === 'all') return [...library, ...userTracks];
    if (cat === 'my') return userTracks;
    if (cat === 'favorites') {
      const all = [...library, ...userTracks];
      return all.filter(t => favorites.includes(t.id));
    }
    return library.filter(t => t.category === cat);
  },

  getCategoryMeta: () => {
    const { library, userTracks, favorites } = get();
    const allTracks = [...library, ...userTracks];
    return [
      { key: 'focus', name: '专注', icon: 'Waves', count: library.filter(t => t.category === 'focus').length },
      { key: 'meditate', name: '冥想', icon: 'Bell', count: library.filter(t => t.category === 'meditate').length },
      { key: 'exercise', name: '运动', icon: 'Dumbbell', count: library.filter(t => t.category === 'exercise').length },
      { key: 'my', name: '我的', icon: 'Music', count: userTracks.length },
      { key: 'favorites', name: '收藏', icon: 'Heart', count: allTracks.filter(t => favorites.includes(t.id)).length, isFavorite: true },
    ];
  },
}));
