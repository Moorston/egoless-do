// ─── 音乐定时器服务 ──────────────────────────────────────────────────
// 负责睡眠定时器管理


// 定时器状态接口
export interface TimerState {
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number;
}

// 定时器状态更新回调
type StateUpdater = (partial: Partial<TimerState>) => void;

/**
 * 睡眠定时器服务
 * 管理定时停止播放的计时器
 */
export class MusicTimerService {
  private updateState: StateUpdater;
  private timerRef: ReturnType<typeof setInterval> | null = null;

  constructor(updateState: StateUpdater) {
    this.updateState = updateState;
  }

  // 设置睡眠定时器
  setSleepTimer(minutes: number | null): void {
    // 清除现有定时器
    this.clearTimer();

    if (minutes === null) {
      this.updateState({
        sleepTimerMinutes: null,
        sleepTimerRemaining: 0,
      });
      return;
    }

    const endTime = Date.now() + minutes * 60 * 1000;

    this.updateState({
      sleepTimerMinutes: minutes,
      sleepTimerRemaining: minutes * 60,
    });

    // 启动定时器
    this.timerRef = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        // 时间到，停止播放
        this.clearTimer();
        this.updateState({
          sleepTimerMinutes: null,
          sleepTimerRemaining: 0,
        });

        // 触发停止播放（通过回调）
        this.onTimeUp?.();
      } else {
        this.updateState({
          sleepTimerRemaining: remaining,
        });
      }
    }, 1000);
  }

  // 时间到回调
  onTimeUp: (() => void) | null = null;

  // 获取剩余时间
  getRemaining(): number {
    return this.timerRef ? 0 : 0; // 实际值通过 store 同步
  }

  // 清理定时器
  clearTimer(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }

  // 销毁服务
  destroy(): void {
    this.clearTimer();
    this.onTimeUp = null;
  }
}