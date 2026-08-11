// ─── 音乐模块共享工具函数 ───────────────────────────────────────

/** 将秒数格式化为 mm:ss */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}