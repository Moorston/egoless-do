import { BUILTIN_TRACKS, createLogger } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { create } from 'zustand';

import { MusicPlaybackService } from './services/MusicPlaybackService';
import {
  loadUserTracks as loadUserTracksFromStorage,
  saveUserTracks,
  addUserTrack as addUserTrackToStorage,
  removeUserTrack as removeUserTrackFromStorage,
  loadFavorites as loadFavoritesFromStorage,
  toggleFavorite as toggleFavoriteInStorage,
  loadVolume as loadVolumeFromStorage,
  saveVolume as saveVolumeToStorage,
  savePlayMode as savePlayModeToStorage,
  type PlayMode,
} from './services/MusicStorageService';
import { MusicTimerService } from './services/MusicTimerService';

const log = createLogger('Music');

// 内置音乐文件映射（require 必须在模块顶层静态声明）
const BUILTIN_FILES: Record<string, number> = {
  // ── 专注类 ──────────────────────────────────────────────────
  'ocean':          require('../../assets/sounds/ocean.mp3') as number,
  'rain':           require('../../assets/sounds/rain.mp3') as number,
  'flowing-stream': require('../../assets/sounds/flowing-stream.mp3') as number,
  'white-noise':    require('../../assets/sounds/white-noise.mp3') as number,
  'cafe':           require('../../assets/sounds/cafe.mp3') as number,
  'keyboard':       require('../../assets/sounds/keyboard.mp3') as number,

  // ── 冥想类 ──────────────────────────────────────────────────
  'bowl':           require('../../assets/sounds/bowl.mp3') as number,
  'wind-chimes':    require('../../assets/sounds/wind-chimes.mp3') as number,
  'birds':          require('../../assets/sounds/birds.mp3') as number,
  'temple-bell':    require('../../assets/sounds/temple_bell.mp3') as number,
  'singing-bowl':   require('../../assets/sounds/singing-bowl.mp3') as number,
  'tibetan-bell':   require('../../assets/sounds/tibetan-bell.mp3') as number,
  'water-flow':     require('../../assets/sounds/water-flow.mp3') as number,

  // ── 运动类 ──────────────────────────────────────────────────
  'beat':           require('../../assets/sounds/beat.mp3') as number,
  'drums':          require('../../assets/sounds/drums.mp3') as number,
  'electronic':     require('../../assets/sounds/electronic.mp3') as number,

  // ── 睡眠类 ──────────────────────────────────────────────────
  'lullaby':        require('../../assets/sounds/lullaby.mp3') as number,
  'asmr':           require('../../assets/sounds/asmr.mp3') as number,
  'fireplace':      require('../../assets/sounds/fireplace.mp3') as number,

  // ── 自然类 ──────────────────────────────────────────────────
  'forest':         require('../../assets/sounds/forest.mp3') as number,
  'thunderstorm':   require('../../assets/sounds/thunderstorm.mp3') as number,
  'seagulls':       require('../../assets/sounds/seagulls.mp3') as number,
};

// 填充内置音乐的 file 字段
const LIBRARY: MusicTrack[] = BUILTIN_TRACKS.map(t => ({
  ...t,
  file: BUILTIN_FILES[t.id] ?? 0,
}));

// Re-export for backward compatibility
export { setMusicSyncCallback } from './services/MusicStorageService';
export type { PlayMode } from './services/MusicStorageService';

interface MusicState {
  library: MusicTrack[];
  userTracks: MusicTrack[];
  favorites: string[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  loop: boolean;

  // Playback status (synced from AudioEngineProvider)
  currentTime: number;
  duration: number;

  // Play queue
  queue: MusicTrack[];
  queueIndex: number;
  playMode: PlayMode;

  // Sleep timer
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number;

  // Error state
  error: string | null;

  play: (track: MusicTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  setIsPlaying: (v: boolean) => void;
  setPlaybackStatus: (currentTime: number, duration: number) => void;
  addUserTrack: (name: string, uri: string) => Promise<void>;
  removeUserTrack: (id: string) => Promise<void>;
  loadUserTracks: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  loadVolume: () => Promise<void>;
  getTracksByCategory: (cat: string) => MusicTrack[];
  getCategoryMeta: () => { key: string; name: string; icon: string; count: number; isFavorite?: boolean }[];

  // Queue & mode
  setQueue: (tracks: MusicTrack[], startIndex?: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setPlayMode: (mode: PlayMode) => void;

  // Sleep timer
  setSleepTimer: (minutes: number | null) => void;

  // Error
  setError: (e: string | null) => void;
}

// ── Pure selector functions (outside store for memoization) ──

export function computeTracksByCategory(library: MusicTrack[], userTracks: MusicTrack[], favorites: string[], cat: string): MusicTrack[] {
  if (cat === 'all') return [...library, ...userTracks];
  if (cat === 'my') return userTracks;
  if (cat === 'favorites') {
    const all = [...library, ...userTracks];
    return all.filter(t => favorites.includes(t.id));
  }
  return library.filter(t => t.category === cat);
}

export function computeCategoryMeta(library: MusicTrack[], userTracks: MusicTrack[], favorites: string[]) {
  const allTracks = [...library, ...userTracks];
  return [
    { key: 'focus', name: '专注', icon: 'Waves', count: library.filter(t => t.category === 'focus').length },
    { key: 'meditate', name: '冥想', icon: 'Bell', count: library.filter(t => t.category === 'meditate').length },
    { key: 'exercise', name: '运动', icon: 'Dumbbell', count: library.filter(t => t.category === 'exercise').length },
    { key: 'sleep', name: '睡眠', icon: 'Moon', count: library.filter(t => t.category === 'sleep').length },
    { key: 'nature', name: '自然', icon: 'TreePine', count: library.filter(t => t.category === 'nature').length },
    { key: 'my', name: '我的', icon: 'Music', count: userTracks.length },
    { key: 'favorites', name: '收藏', icon: 'Heart', count: allTracks.filter(t => favorites.includes(t.id)).length, isFavorite: true },
  ];
}

// 创建播放服务实例
const playbackService = new MusicPlaybackService(
  (partial) => {
    // 使用 store 的 set 方法更新状态
    useMusicStore.setState(partial);
  },
  () => {
    const s = useMusicStore.getState();
    return {
      currentTrack: s.currentTrack,
      isPlaying: s.isPlaying,
      currentTime: s.currentTime,
      duration: s.duration,
      queue: s.queue,
      queueIndex: s.queueIndex,
      playMode: s.playMode,
      loop: s.loop,
      error: s.error,
    };
  }
);

// 创建定时器服务实例
const timerService = new MusicTimerService(
  (partial) => {
    useMusicStore.setState(partial);
  }
);
timerService.onTimeUp = () => {
  useMusicStore.getState().pause();
};

export const useMusicStore = create<MusicState>((set, get) => {
  // 构建带 loop 的额外状态
  const stateWithLoop = {
    library: LIBRARY,
    userTracks: [],
    favorites: [],
    currentTrack: null,
    isPlaying: false,
    volume: 0.3,
    loop: false,

    // Playback status
    currentTime: 0,
    duration: 0,

    // Play queue
    queue: [],
    queueIndex: -1,
    playMode: 'sequential' as PlayMode,

    // Sleep timer
    sleepTimerMinutes: null,
    sleepTimerRemaining: 0,

    // Error
    error: null,
  };

  return {
    ...stateWithLoop,

    play: (track) => playbackService.play(track),
    pause: () => playbackService.pause(),
    resume: () => playbackService.resume(),
    stop: () => playbackService.stop(),
    setVolume: (v) => {
      set({ volume: v });
      void saveVolumeToStorage(v);
    },
    toggleLoop: () => playbackService.toggleLoop(),
    setIsPlaying: (v) => set({ isPlaying: v }),
    setPlaybackStatus: (currentTime, duration) => set({ currentTime, duration }),
    setError: (e) => set({ error: e }),

  addUserTrack: async (name, uri) => {
    try {
      const track = await addUserTrackToStorage(name, uri);
      const updated = [...get().userTracks, track];
      set({ userTracks: updated });
      await saveUserTracks(updated);
    } catch (e) {
      log.error(e, { message: '添加用户音乐失败' });
    }
  },

  removeUserTrack: async (id) => {
    try {
      const currentTracks = get().userTracks;
      const track = currentTracks.find(t => t.id === id);
      if (track) {
        await removeUserTrackFromStorage(track);
      }
      const updated = currentTracks.filter(t => t.id !== id);
      set({ userTracks: updated });
      await saveUserTracks(updated);
      // 如果删除的是当前播放曲目，停止播放
      if (get().currentTrack?.id === id) {
        set({ currentTrack: null, isPlaying: false });
      }
    } catch (e) {
      log.error(e, { message: '删除用户音乐失败' });
    }
  },

  loadUserTracks: async () => {
    try {
      const tracks = await loadUserTracksFromStorage();
      set({ userTracks: tracks });
    } catch (e) {
      log.error(e, { message: '加载用户音乐失败' });
    }
  },

  toggleFavorite: async (id) => {
    try {
      const { favorites } = get();
      const updated = await toggleFavoriteInStorage(favorites, id);
      set({ favorites: updated });
    } catch (e) {
      log.error(e, { message: '切换收藏失败' });
    }
  },

  loadFavorites: async () => {
    try {
      const favorites = await loadFavoritesFromStorage();
      set({ favorites });
    } catch (e) {
      log.error(e, { message: '加载收藏失败' });
    }
  },

  getTracksByCategory: (cat) => {
    const { library, userTracks, favorites } = get();
    return computeTracksByCategory(library, userTracks, favorites, cat);
  },

  getCategoryMeta: () => {
    const { library, userTracks, favorites } = get();
    return computeCategoryMeta(library, userTracks, favorites);
  },

  loadVolume: async () => {
    try {
      const volume = await loadVolumeFromStorage();
      set({ volume });
    } catch { /* ignore */ }
  },

  // ── Queue & mode ──

  setQueue: (tracks, startIndex = 0) => {
    playbackService.setQueue(tracks, startIndex);
  },

  playNext: () => {
    playbackService.playNext();
  },

  playPrevious: () => {
    playbackService.playPrevious();
  },

  setPlayMode: (mode) => {
    playbackService.setPlayMode(mode);
    void savePlayModeToStorage(mode);
  },

  // ── Sleep timer ──

  setSleepTimer: (minutes) => {
    timerService.setSleepTimer(minutes);
  },
}});
