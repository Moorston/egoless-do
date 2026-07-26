import { BUILTIN_TRACKS, createLogger } from '@egoless-do/core';
import type { MusicTrack } from '@egoless-do/core';
import { File, Directory, Paths } from 'expo-file-system';
import { create } from 'zustand';

const log = createLogger('Music');

// ── File-based JSON storage (replaces AsyncStorage) ─────────────────
const musicDataDir = new Directory(Paths.document, 'music-data');
async function ensureMusicDataDir() {
  if (!musicDataDir.exists) musicDataDir.create({ intermediates: true });
}
async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  try {
    ensureMusicDataDir();
    const file = new File(musicDataDir, filename);
    file.write(JSON.stringify(data), { encoding: 'utf8' });
  } catch (e) { log.warn(`Failed to write ${filename}:`, (e as Error)?.message); }
}
async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    ensureMusicDataDir();
    const file = new File(musicDataDir, filename);
    if (!file.exists) return null;
    const raw = await file.text();
    return JSON.parse(raw) as T;
  } catch { return null; }
}

// 内置音乐文件映射（require 必须在模块顶层静态声明）
const BUILTIN_FILES: Record<string, number> = {
  'ocean':          require('../../../assets/sounds/ocean.mp3'),
  'rain':           require('../../../assets/sounds/rain.mp3'),
  'flowing-stream': require('../../../assets/sounds/flowing-stream.mp3'),
  'bowl':           require('../../../assets/sounds/bowl.mp3'),
  'wind-chimes':    require('../../../assets/sounds/wind-chimes.mp3'),
  'birds':          require('../../../assets/sounds/birds.mp3'),
  'temple-bell':    require('../../../assets/sounds/temple_bell.mp3'),
};

// 填充内置音乐的 file 字段
const LIBRARY: MusicTrack[] = BUILTIN_TRACKS.map(t => ({
  ...t,
  file: BUILTIN_FILES[t.id] ?? 0,
}));

const userMusicDir = new Directory(Paths.document, 'user-music');

// Module-level timer ref (non-serializable, not in store)
let sleepTimerRef: ReturnType<typeof setInterval> | null = null;

// Sync callback — set by useAppStore to trigger profile persistence
let _onMusicChange: (() => void) | null = null;
export function setMusicSyncCallback(fn: () => void) { _onMusicChange = fn; }

export type PlayMode = 'sequential' | 'shuffle' | 'repeat-one' | 'repeat-all';

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
    { key: 'my', name: '我的', icon: 'Music', count: userTracks.length },
    { key: 'favorites', name: '收藏', icon: 'Heart', count: allTracks.filter(t => favorites.includes(t.id)).length, isFavorite: true },
  ];
}

export const useMusicStore = create<MusicState>((set, get) => ({
  library: LIBRARY,
  userTracks: [],
  favorites: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.3,
  loop: true,

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

  play: (track) => set({ currentTrack: track, isPlaying: true, error: null }),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ currentTrack: null, isPlaying: false, currentTime: 0, duration: 0 }),
  setVolume: (v) => {
    set({ volume: v });
    writeJsonFile('volume.json', v);
    _onMusicChange?.();
  },
  toggleLoop: () => set(s => {
    const newLoop = !s.loop;
    return { loop: newLoop, playMode: newLoop ? 'repeat-one' : 'sequential' };
  }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlaybackStatus: (currentTime, duration) => set({ currentTime, duration }),
  setError: (e) => set({ error: e }),

  addUserTrack: async (name, uri) => {
    try {
      // 确保目录存在
      if (!userMusicDir.exists) userMusicDir.create({ intermediates: true });
      // 生成唯一文件名
      const parts = name.split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1] : 'mp3';
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const destFile = new File(userMusicDir, `${id}.${ext}`);
      new File(uri).copy(destFile);

      const track: MusicTrack = {
        id,
        name: name.replace(/\.[^.]+$/, ''),
        nameEn: name.replace(/\.[^.]+$/, ''),
        category: 'user',
        uri: destFile.uri,
      };

      const updated = [...get().userTracks, track];
      set({ userTracks: updated });
      await writeJsonFile('user_tracks.json', updated);
      _onMusicChange?.();
    } catch (e) {
      log.error(e, { message: '添加用户音乐失败' });
    }
  },

  removeUserTrack: async (id) => {
    try {
      const currentTracks = get().userTracks;
      const track = currentTracks.find(t => t.id === id);
      if (track?.uri) {
        const file = new File(track.uri);
        if (file.exists) file.delete();
      }
      const updated = currentTracks.filter(t => t.id !== id);
      set({ userTracks: updated });
      await writeJsonFile('user_tracks.json', updated);
      _onMusicChange?.();
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
      const raw = await readJsonFile<MusicTrack[]>('user_tracks.json');
      if (raw) {
        const tracks = raw;
        // 验证文件仍存在
        const valid: MusicTrack[] = [];
        for (const t of tracks) {
          try {
            if (t.uri) {
              if (new File(t.uri).exists) valid.push(t);
            } else {
              valid.push(t);
            }
          } catch {
            // Skip tracks that fail validation
          }
        }
        set({ userTracks: valid });
        if (valid.length !== tracks.length) {
          await writeJsonFile('user_tracks.json', valid);
        }
      }
    } catch (e) { log.error(e, { message: '加载用户音乐失败' }); }
  },

  toggleFavorite: async (id) => {
    try {
      const { favorites } = get();
      const updated = favorites.includes(id)
        ? favorites.filter(fid => fid !== id)
        : [...favorites, id];
      set({ favorites: updated });
      await writeJsonFile('favorites.json', updated);
      _onMusicChange?.();
    } catch (e) {
      log.error(e, { message: '切换收藏失败' });
    }
  },

  loadFavorites: async () => {
    try {
      const raw = await readJsonFile<string[]>('favorites.json');
      if (raw) {
        set({ favorites: raw });
      }
    } catch (e) { log.error(e, { message: '加载收藏失败' }); }
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
      const raw = await readJsonFile<number>('volume.json');
      if (raw !== null && typeof raw === 'number' && raw >= 0 && raw <= 1) set({ volume: raw });
    } catch { /* ignore */ }
  },

  // ── Queue & mode ──

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, queueIndex: startIndex });
  },

  playNext: () => {
    const { queue, queueIndex, playMode, currentTrack } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (playMode === 'repeat-one') {
      // Replay current track
      if (currentTrack) set({ isPlaying: true });
      return;
    }

    if (playMode === 'shuffle') {
      // Pick random index different from current
      if (queue.length === 1) {
        nextIndex = 0;
      } else {
        do { nextIndex = Math.floor(Math.random() * queue.length); }
        while (nextIndex === queueIndex);
      }
    } else {
      // sequential / repeat-all
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (playMode === 'repeat-all') {
          nextIndex = 0;
        } else {
          // sequential: stop at end
          set({ isPlaying: false });
          return;
        }
      }
    }

    set({ queueIndex: nextIndex, currentTrack: queue[nextIndex], isPlaying: true, error: null });
  },

  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds into the track, restart it
    if (currentTime > 3) {
      set({ currentTime: 0 });
      // seekTo will be handled by AudioEngineProvider
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    set({ queueIndex: prevIndex, currentTrack: queue[prevIndex], isPlaying: true, error: null });
  },

  setPlayMode: (mode) => {
    set({ playMode: mode, loop: mode === 'repeat-one' });
    writeJsonFile('play_mode.json', mode);
    _onMusicChange?.();
  },

  // ── Sleep timer ──

  setSleepTimer: (minutes) => {
    if (sleepTimerRef) {
      clearInterval(sleepTimerRef);
      sleepTimerRef = null;
    }

    if (minutes === null) {
      set({ sleepTimerMinutes: null, sleepTimerRemaining: 0 });
      return;
    }

    const endTime = Date.now() + minutes * 60 * 1000;
    sleepTimerRef = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      if (remaining <= 0) {
        if (sleepTimerRef) { clearInterval(sleepTimerRef); sleepTimerRef = null; }
        get().pause();
        set({ sleepTimerMinutes: null, sleepTimerRemaining: 0 });
      } else {
        set({ sleepTimerRemaining: remaining });
      }
    }, 1000);

    set({ sleepTimerMinutes: minutes, sleepTimerRemaining: minutes * 60 });
  },
}));
