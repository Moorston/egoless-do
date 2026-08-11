// ─── 音乐存储服务 ──────────────────────────────────────────────────
// 负责音乐数据的持久化，包括用户音乐、收藏、音量等

import type { MusicTrack } from '@egoless-do/core';
import { createLogger } from '@egoless-do/core';
import { File, Directory, Paths } from 'expo-file-system';

const log = createLogger('MusicStorage');

// 存储目录
const musicDataDir = new Directory(Paths.document, 'music-data');
const userMusicDir = new Directory(Paths.document, 'user-music');

// 确保存储目录存在
async function ensureDir(dir: Directory): Promise<void> {
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

// 写入 JSON 文件
async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  try {
    await ensureDir(musicDataDir);
    const file = new File(musicDataDir, filename);
    file.write(JSON.stringify(data), { encoding: 'utf8' });
  } catch (e) {
    log.warn(`写入 ${filename} 失败:`, (e as Error)?.message);
  }
}

// 读取 JSON 文件
async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    await ensureDir(musicDataDir);
    const file = new File(musicDataDir, filename);
    if (!file.exists) return null;
    const raw = await file.text();
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// 同步回调（用于触发 profile 持久化）
let _onMusicChange: (() => void) | null = null;

export function setMusicSyncCallback(fn: () => void) {
  _onMusicChange = fn;
}

// ─── 用户音乐管理 ──────────────────────────────────────────────────

/**
 * 加载用户音乐列表
 */
export async function loadUserTracks(): Promise<MusicTrack[]> {
  try {
    const raw = await readJsonFile<MusicTrack[]>('user_tracks.json');
    if (!raw) return [];

    // 验证文件仍存在
    const valid: MusicTrack[] = [];
    /* eslint-disable max-depth -- 文件存在性校验循环，提取会增加间接层 */
    for (const track of raw) {
      try {
        if (track.uri) {
          if (new File(track.uri).exists) valid.push(track);
        } else {
          valid.push(track);
        }
      } catch {
        // Skip tracks that fail validation
      }
    }
    /* eslint-enable max-depth */

    // 如果有无效曲目，更新存储
    if (valid.length !== raw.length) {
      await writeJsonFile('user_tracks.json', valid);
    }

    return valid;
  } catch (e) {
    log.error(e, { message: '加载用户音乐失败' });
    return [];
  }
}

/**
 * 保存用户音乐列表
 */
export async function saveUserTracks(tracks: MusicTrack[]): Promise<void> {
  await writeJsonFile('user_tracks.json', tracks);
  _onMusicChange?.();
}

/**
 * 添加用户音乐
 */
export async function addUserTrack(name: string, uri: string): Promise<MusicTrack> {
  await ensureDir(userMusicDir);

  // 生成唯一文件名
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1] : 'mp3';
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const destFile = new File(userMusicDir, `${id}.${ext}`);

  // 复制文件
  new File(uri).copy(destFile);

  const track: MusicTrack = {
    id,
    name: name.replace(/\.[^.]+$/, ''),
    nameEn: name.replace(/\.[^.]+$/, ''),
    category: 'user',
    uri: destFile.uri,
  };

  return track;
}

/**
 * 删除用户音乐
 */
export async function removeUserTrack(track: MusicTrack): Promise<void> {
  if (track.uri) {
    try {
      const file = new File(track.uri);
      if (file.exists) file.delete();
    } catch (e) {
      log.warn('删除音乐文件失败:', e);
    }
  }
}

// ─── 收藏管理 ──────────────────────────────────────────────────

/**
 * 加载收藏列表
 */
export async function loadFavorites(): Promise<string[]> {
  try {
    const raw = await readJsonFile<string[]>('favorites.json');
    return raw || [];
  } catch (e) {
    log.error(e, { message: '加载收藏失败' });
    return [];
  }
}

/**
 * 保存收藏列表
 */
export async function saveFavorites(favorites: string[]): Promise<void> {
  await writeJsonFile('favorites.json', favorites);
  _onMusicChange?.();
}

/**
 * 切换收藏状态
 */
export async function toggleFavorite(
  favorites: string[],
  trackId: string
): Promise<string[]> {
  const updated = favorites.includes(trackId)
    ? favorites.filter(id => id !== trackId)
    : [...favorites, trackId];

  await saveFavorites(updated);
  return updated;
}

// ─── 音量管理 ──────────────────────────────────────────────────

/**
 * 加载音量设置
 */
export async function loadVolume(): Promise<number> {
  try {
    const raw = await readJsonFile<number>('volume.json');
    if (raw !== null && typeof raw === 'number' && raw >= 0 && raw <= 1) {
      return raw;
    }
    return 0.3; // 默认音量
  } catch {
    return 0.3;
  }
}

/**
 * 保存音量设置
 */
export async function saveVolume(volume: number): Promise<void> {
  await writeJsonFile('volume.json', volume);
  _onMusicChange?.();
}

// ─── 播放模式管理 ──────────────────────────────────────────────────

export type PlayMode = 'sequential' | 'shuffle' | 'repeat-one' | 'repeat-all';

/**
 * 加载播放模式
 */
export async function loadPlayMode(): Promise<PlayMode> {
  try {
    const raw = await readJsonFile<PlayMode>('play_mode.json');
    if (raw && ['sequential', 'shuffle', 'repeat-one', 'repeat-all'].includes(raw)) {
      return raw;
    }
    return 'sequential';
  } catch {
    return 'sequential';
  }
}

/**
 * 保存播放模式
 */
export async function savePlayMode(mode: PlayMode): Promise<void> {
  await writeJsonFile('play_mode.json', mode);
  _onMusicChange?.();
}

// ─── 最近播放管理 ──────────────────────────────────────────────────

/**
 * 加载最近播放的曲目 id 列表（最多 20 条）
 */
export async function loadRecentlyPlayed(): Promise<string[]> {
  try {
    const raw = await readJsonFile<string[]>('recently_played.json');
    if (Array.isArray(raw)) return raw.slice(0, 20);
    return [];
  } catch {
    return [];
  }
}

/**
 * 保存最近播放的曲目 id 列表
 */
export async function saveRecentlyPlayed(ids: string[]): Promise<void> {
  await writeJsonFile('recently_played.json', ids.slice(0, 20));
  _onMusicChange?.();
}
