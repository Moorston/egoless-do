export const fmt = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export const fmtMS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export const dateStr = (d = new Date()) => d.toISOString().slice(0, 10);

export const tmr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateStr(d);
};

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export const formatAgo = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return '刚刚';
  if (d < 60) return `${d}分钟前`;
  if (d < 1440) return `${Math.floor(d / 60)}小时前`;
  return `${Math.floor(d / 1440)}天前`;
};