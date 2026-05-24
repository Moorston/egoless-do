// ─── Shared pure utilities ────────────────────────────────────────

export const fmt = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
};

export const fmtMS = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
};

export const dateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
};

export const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateStr(d);
};

export const tmr = tomorrow;

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export const formatAgoT = (ts: number, T: (key: string) => string) => {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return T('timeAgoJustNow');
  if (d < 60) return T('timeAgoMinutes').replace('{n}', String(d));
  if (d < 1440) return T('timeAgoHours').replace('{n}', String(Math.floor(d / 60)));
  return T('timeAgoDays').replace('{n}', String(Math.floor(d / 1440)));
};

export const formatAgo = (ts: number) => formatAgoT(ts, (k) => {
  const zh: Record<string, string> = { timeAgoJustNow: '刚刚', timeAgoMinutes: '{n}分钟前', timeAgoHours: '{n}小时前', timeAgoDays: '{n}天前' };
  return zh[k] ?? k;
});

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Blur GPS coordinate by ±500m random offset */
export const blurCoord = (coord: number) => coord + (Math.random() - 0.5) * 0.009;

/** Compute habit streak from checked dates (validates most recent is today/yesterday) */
export const computeStreak = (checkedDates: string[]): number => {
  if (!checkedDates.length) return 0;
  const unique = [...new Set(checkedDates)].sort().reverse();
  const today = dateStr();
  const yest = yesterday();
  // Most recent date must be today or yesterday
  if (unique[0] !== today && unique[0] !== yest) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

/** Calculate habit streak (alias for computeStreak) */
export const calculateStreak = computeStreak;

/** Estimated kcal burned in a fast (35 kcal/hour baseline) */
export const estimateFastKcal = (seconds: number) =>
  Math.round((seconds / 3600) * 35);

/** Calculate streak from checkin history (allows 1-day gap for today) */
export const calculateCheckinStreak = (history: Array<{ date: string; done: boolean }>): number => {
  if (!history.length) return 0;
  const sorted = [...history]
    .filter(e => e.done)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) return 0;

  let streak = 0;
  const today = dateStr();
  const yest = yesterday();
  let expectedDate: string | null = null;

  // Start from most recent: must be today or yesterday
  if (sorted[0].date === today) {
    streak = 1;
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    expectedDate = dateStr(d);
  } else if (sorted[0].date === yest) {
    streak = 1;
    const d = new Date(yest);
    d.setDate(d.getDate() - 1);
    expectedDate = dateStr(d);
  } else {
    return 0; // Most recent is too old
  }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].date === expectedDate) {
      streak++;
      const d = new Date(expectedDate);
      d.setDate(d.getDate() - 1);
      expectedDate = dateStr(d);
    } else {
      break;
    }
  }
  return streak;
};

/** Estimate fasting calories with BMR-based formula */
export const estimateFastingKcal = (
  durationHours: number, weight: number = 70,
  gender: 'male' | 'female' = 'male', age: number = 30,
  height: number = 170
): number => {
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  return Math.round((bmr / 24) * durationHours);
};

// ── Mobile legacy field normalization ────────────────────────────

const FIELD_MAPPING: Record<string, string> = {
  target_hours: 'targetHours',
  started_at: 'startedAt',
  ended_at: 'endedAt',
  estimated_kcal: 'estimatedKcal',
  created_at: 'timestamp',
  is_pinned: 'isPinned',
  is_published: 'isPublished',
};

/** Normalize mobile legacy snake_case fields to camelCase. */
export function normalizeEntity<T>(raw: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[FIELD_MAPPING[key] ?? key] = value;
  }
  return result as T;
}
