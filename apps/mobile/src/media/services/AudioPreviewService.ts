// ─── 音频预览服务 ──────────────────────────────────────────────────
// 使用 expo-audio 实现音乐预览播放

import { createLogger } from '@egoless-do/core';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const log = createLogger('AudioPreview');

// 预览时长限制（秒）
const PREVIEW_DURATION_LIMIT = 30;

// 音频预览播放器
class AudioPreviewService {
  private player: AudioPlayer | null = null;
  private currentTrackId: string | null = null;
  private _isPlaying = false;
  private _position = 0;
  private _duration = 0;
  private onStatusUpdate: ((status: PreviewStatus) => void) | null = null;
  private initialized = false;

  // 初始化音频会话
  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
      this.initialized = true;
    } catch (error) {
      log.warn('初始化音频会话失败:', error);
    }
  }

  // 播放预览
  async play(
    trackId: string,
    url: string,
    onStatusUpdate?: (status: PreviewStatus) => void
  ): Promise<void> {
    try {
      // 停止当前播放
      await this.stop();

      log.info('开始播放预览:', trackId);

      this.onStatusUpdate = onStatusUpdate || null;

      // 创建新的 AudioPlayer
      const player = createAudioPlayer(
        { uri: url },
        { updateInterval: 500 }
      );

      // 监听播放状态变化
      this.player = player;
      this.currentTrackId = trackId;
      this._isPlaying = true;
      this._position = 0;
      this._duration = 0;

      // 启动状态轮询（expo-audio 没有直接的 setOnPlaybackStatusUpdate）
      this.startStatusPolling(player);

      player.play();

    } catch (error) {
      log.error(error, { message: '播放预览失败' });
      throw error;
    }
  }

  // 状态轮询
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  private startStatusPolling(player: AudioPlayer): void {
    this.stopPolling();

    this.pollingTimer = setInterval(() => {
      if (!player.playing && !player.paused) {
        // Player 已停止
        this.stopPolling();
        return;
      }

      this._position = player.currentTime;
      this._duration = player.duration;

      // 检查是否超过预览时长限制
      if (this._position >= PREVIEW_DURATION_LIMIT) {
        void this.stop();
        return;
      }

      // 通知状态更新
      if (this.onStatusUpdate) {
        this.onStatusUpdate({
          trackId: this.currentTrackId || '',
          isPlaying: player.playing,
          position: this._position,
          duration: Math.min(this._duration, PREVIEW_DURATION_LIMIT),
          progress: this._duration > 0
            ? this._position / Math.min(this._duration, PREVIEW_DURATION_LIMIT)
            : 0,
        });
      }
    }, 500);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // 暂停
  async pause(): Promise<void> {
    if (this.player && this.player.playing) {
      this.player.pause();
      this._isPlaying = false;
    }
  }

  // 恢复播放
  async resume(): Promise<void> {
    if (this.player && !this.player.playing) {
      this.player.play();
      this._isPlaying = true;
    }
  }

  // 停止播放
  async stop(): Promise<void> {
    this.stopPolling();
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch (error) {
        log.warn('停止播放失败:', error);
      }
      this.player = null;
      this.currentTrackId = null;
      this._isPlaying = false;
      this._position = 0;
      this._duration = 0;
    }
  }

  // 跳转到指定位置
  async seekTo(positionSeconds: number): Promise<void> {
    if (this.player) {
      void this.player.seekTo(positionSeconds);
    }
  }

  // 获取当前状态
  getStatus(): PreviewStatus {
    return {
      trackId: this.currentTrackId || '',
      isPlaying: this._isPlaying,
      position: this._position,
      duration: Math.min(this._duration, PREVIEW_DURATION_LIMIT),
      progress: this._duration > 0
        ? this._position / Math.min(this._duration, PREVIEW_DURATION_LIMIT)
        : 0,
    };
  }

  // 是否正在播放指定曲目
  isPlayingTrack(trackId: string): boolean {
    return this.currentTrackId === trackId && this._isPlaying;
  }

  // 获取当前播放的曲目 ID
  getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }
}

// 预览状态接口
export interface PreviewStatus {
  trackId: string;
  isPlaying: boolean;
  position: number;
  duration: number;
  progress: number;
}

// 单例实例
export const audioPreviewService = new AudioPreviewService();