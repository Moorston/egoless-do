// ─── 音乐播放服务 ──────────────────────────────────────────────────
// 负责播放控制逻辑，包括播放、暂停、队列管理、播放模式

import type { MusicTrack } from '@egoless-do/core';

import type { PlayMode } from './MusicStorageService';

// 播放状态接口
export interface PlaybackState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: MusicTrack[];
  queueIndex: number;
  playMode: PlayMode;
  loop: boolean;
  error: string | null;
}

// 播放状态更新回调
type StateUpdater = (partial: Partial<PlaybackState>) => void;

/**
 * 播放队列服务
 * 管理播放队列、下一首/上一首、播放模式等逻辑
 */
export class MusicPlaybackService {
  private updateState: StateUpdater;
  private getState: () => PlaybackState;

  constructor(
    updateState: StateUpdater,
    getState: () => PlaybackState
  ) {
    this.updateState = updateState;
    this.getState = getState;
  }

  // 播放曲目
  play(track: MusicTrack): void {
    this.updateState({
      currentTrack: track,
      isPlaying: true,
      error: null,
    });
  }

  // 暂停
  pause(): void {
    this.updateState({ isPlaying: false });
  }

  // 恢复播放
  resume(): void {
    this.updateState({ isPlaying: true });
  }

  // 停止播放
  stop(): void {
    this.updateState({
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  }

  // 设置播放队列
  setQueue(tracks: MusicTrack[], startIndex: number = 0): void {
    this.updateState({
      queue: tracks,
      queueIndex: startIndex,
    });
  }

  // 下一首
  playNext(): void {
    const state = this.getState();
    const { queue, queueIndex, playMode, currentTrack } = state;

    if (queue.length === 0) return;

    let nextIndex: number;

    if (playMode === 'repeat-one') {
      // 重复当前曲目
      if (currentTrack) {
        this.updateState({ isPlaying: true });
      }
      return;
    }

    if (playMode === 'shuffle') {
      // 随机选择
      if (queue.length === 1) {
        nextIndex = 0;
      } else {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === queueIndex);
      }
    } else {
      // sequential / repeat-all
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (playMode === 'repeat-all') {
          nextIndex = 0;
        } else {
          // sequential: 播放到末尾停止
          this.updateState({ isPlaying: false });
          return;
        }
      }
    }

    this.updateState({
      queueIndex: nextIndex,
      currentTrack: queue[nextIndex],
      isPlaying: true,
      error: null,
    });
  }

  // 上一首
  playPrevious(): void {
    const state = this.getState();
    const { queue, queueIndex, currentTime } = state;

    if (queue.length === 0) return;

    // 如果已播放超过 3 秒，重新开始当前曲目
    if (currentTime > 3) {
      this.updateState({ currentTime: 0 });
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    this.updateState({
      queueIndex: prevIndex,
      currentTrack: queue[prevIndex],
      isPlaying: true,
      error: null,
    });
  }

  // 设置播放模式
  setPlayMode(mode: PlayMode): void {
    this.updateState({
      playMode: mode,
      loop: mode === 'repeat-one',
    });
  }

  // 切换循环模式
  toggleLoop(): void {
    const state = this.getState();
    const newLoop = !state.loop;
    this.updateState({
      loop: newLoop,
      playMode: newLoop ? 'repeat-one' : 'sequential' as PlayMode,
    });
  }
}