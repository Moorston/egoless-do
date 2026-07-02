// ── Date helpers for HomeScreen ──

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDateBar(dateStrVal: string, isToday: boolean, T: (k: string) => string): string {
  const d = new Date(dateStrVal + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  const base = `${m}月${day}日 · 周${w}`;
  return isToday ? `${base} · ${T('dateBarToday')}` : base;
}
