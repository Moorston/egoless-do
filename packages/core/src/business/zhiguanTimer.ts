// ─── 计时器纯函数部分（便于单测） ────────────────────────────────
export function calcElapsed(startTs: number, pausedElapsed: number, now: number): number {
  return Math.max(0, Math.floor((now - startTs - pausedElapsed) / 1000));
}

/** 累加一次暂停时长 */
export function accumulatePause(pausedElapsed: number, pauseStart: number, now: number): number {
  return pausedElapsed + (now - pauseStart);
}

/** 格式化 mm:ss */
export function formatSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 检测出定倒计时状态 */
export function isInClosingCountdown(elapsedSecs: number, totalTargetSecs = 600): 'active-5min' | 'active-30min' | 'active-60min' | null {
  if (elapsedSecs === 300) return 'active-5min';
  if (elapsedSecs === 1800) return 'active-30min';
  if (elapsedSecs === 3600) return 'active-60min';
  return null;
}
