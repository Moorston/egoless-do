// ─── 音频预览服务 ──────────────────────────────────────────────────
// 使用 expo-av 实现音乐预览播放

import { Audio, type AVPlaybackStatus } from 'expo-av';
import { createLogger } from '@egoless-do/core';

const log = createLogger('AudioPreview');

// 预览时长限制（秒）
const PREVIEW_DURATION_LIMIT = 30;

// 音频预览播放器
class AudioPreviewService {
  private sound: Audio.Sound | null = null;
  private currentTrackId: string | null = null;
  private isPlaying = false;
  private position = 0;
  private duration = 0;
  private onStatusUpdate: ((status: PreviewStatus) => void) | null = null;

  // 初始化音频会话
  async initialize(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
      });
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

      // 创建新的 Sound 对象
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        this.handlePlaybackStatus.bind(this)
      );

      this.sound = sound;
      this.currentTrackId = trackId;
      this.isPlaying = true;
      this.onStatusUpdate = onStatusUpdate || null;

      // 设置状态回调
      sound.setOnPlaybackStatusUpdate(this.handlePlaybackStatus.bind(this));

    } catch (error) {
      log.error('播放预览失败:', error);
      throw error;
    }
  }

  // 处理播放状态更新
  private handlePlaybackStatus(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      return;
    }

    this.position = status.positionMillis / 1000;
    this.duration = status.durationMillis ? status.durationMillis / 1000 : 0;
    this.isPlaying = status.isPlaying;

    // 检查是否超过预览时长限制
    if (this.position >= PREVIEW_DURATION_LIMIT) {
      void this.stop(); // Explicitly mark as fire-and-forget
      return;
    }

    // 通知状态更新
    if (this.onStatusUpdate) {
      this.onStatusUpdate({
        trackId: this.currentTrackId || '',
        isPlaying: this.isPlaying,
        position: this.position,
        duration: Math.min(this.duration, PREVIEW_DURATION_LIMIT),
        progress: this.duration > 0 ? this.position / Math.min(this.duration, PREVIEW_DURATION_LIMIT) : 0,
      });
    }
  }

  // 暂停
  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  // 恢复播放
  async resume(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  // 停止播放
  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        log.warn('停止播放失败:', error);
      }
      this.sound = null;
      this.currentTrackId = null;
      this.isPlaying = false;
      this.position = 0;
      this.duration = 0;
    }
  }

  // 跳转到指定位置
  async seekTo(positionSeconds: number): Promise<void> {
    if (this.sound) {
      const positionMillis = positionSeconds * 1000;
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  // 获取当前状态
  getStatus(): PreviewStatus {
    return {
      trackId: this.currentTrackId || '',
      isPlaying: this.isPlaying,
      position: this.position,
      duration: Math.min(this.duration, PREVIEW_DURATION_LIMIT),
      progress: this.duration > 0 ? this.position / Math.min(this.duration, PREVIEW_DURATION_LIMIT) : 0,
    };
  }

  // 是否正在播放指定曲目
  isPlayingTrack(trackId: string): boolean {
    return this.currentTrackId === trackId && this.isPlaying;
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
