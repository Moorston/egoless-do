import { useMusicStore } from '../useMusicStore';

/**
 * 音频源类型
 */
export type AudioSourceType = 'music' | 'ambient' | 'bell';

/**
 * 音频会话管理器 — 单例
 * 管理音乐播放与运动环境音的优先级和切换。
 *
 * 优先级规则：
 * 1. 钟声（bell）— 最高优先级，立即播放，不中断其他
 * 2. 运动环境音（ambient）— 中优先级，与音乐互斥
 * 3. 音乐（music）— 低优先级，被环境音抢占时暂停
 */
class AudioSessionManager {
  private activeSource: AudioSourceType | null = null;
  private musicWasPlayingBeforeAmbient = false;

  /**
   * 请求播放指定类型的音频源
   * @returns true 如果允许播放，false 如果被更高优先级源阻止
   */
  requestPlay(source: AudioSourceType): boolean {
    // 钟声始终允许播放
    if (source === 'bell') return true;

    // 环境音请求播放
    if (source === 'ambient') {
      const musicStore = useMusicStore.getState();
      if (musicStore.isPlaying) {
        this.musicWasPlayingBeforeAmbient = true;
        musicStore.pause();
      } else {
        this.musicWasPlayingBeforeAmbient = false;
      }
      this.activeSource = 'ambient';
      return true;
    }

    // 音乐请求播放
    if (source === 'music') {
      // 如果环境音正在播放，不允许音乐播放
      if (this.activeSource === 'ambient') return false;
      this.activeSource = 'music';
      return true;
    }

    return true;
  }

  /**
   * 通知指定类型的音频源已停止
   */
  notifyStopped(source: AudioSourceType): void {
    if (this.activeSource === source) {
      this.activeSource = null;
    }

    // 音乐显式停止时，清除自动恢复标志
    if (source === 'music') {
      this.musicWasPlayingBeforeAmbient = false;
    }

    // 环境音停止后，如果之前音乐在播放，自动恢复
    if (source === 'ambient' && this.musicWasPlayingBeforeAmbient) {
      this.musicWasPlayingBeforeAmbient = false;
      const musicStore = useMusicStore.getState();
      if (musicStore.currentTrack) {
        musicStore.resume();
      }
    }
  }

  /**
   * 获取当前活跃的音频源
   */
  getActiveSource(): AudioSourceType | null {
    return this.activeSource;
  }

  /**
   * 检查是否可以播放指定类型的音频源
   */
  canPlay(source: AudioSourceType): boolean {
    if (source === 'bell') return true;
    if (source === 'ambient') return true;
    if (source === 'music') return this.activeSource !== 'ambient';
    return true;
  }
}

export const audioSessionManager = new AudioSessionManager();
