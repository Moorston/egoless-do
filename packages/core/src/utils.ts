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

let _uidCounter = 0;
export const uid = () => Date.now().toString(36) + (_uidCounter++).toString(36) + Math.random().toString(36).slice(2, 6);

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

/** Calculate streak from checkin history (allows 1-day gap for reference date) */
export const calculateCheckinStreak = (history: Array<{ date: string; done: boolean }>, refDate?: string): number => {
  if (!history.length) return 0;
  const ref = refDate ?? dateStr();
  const sorted = [...history]
    .filter(e => e.done && e.date <= ref)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) return 0;

  let streak = 0;
  const d0 = new Date(ref);
  d0.setDate(d0.getDate() - 1);
  const prev = dateStr(d0);
  let expectedDate: string | null = null;

  // Start from most recent: must be refDate or the day before
  if (sorted[0].date === ref) {
    streak = 1;
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    expectedDate = dateStr(d);
  } else if (sorted[0].date === prev) {
    streak = 1;
    const d = new Date(prev);
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

// ── Chart data aggregation helpers ──────────────────────────────

/** Aggregate weight data from check-in history (last N days). */
export const aggregateWeightData = (
  history: Array<{ date: string; weight?: number }>,
  days: number = 30,
): { date: string; value: number }[] => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = dateStr(cutoff);
  return history
    .filter(e => e.weight != null && e.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ date: e.date.slice(5), value: e.weight! }));
};

/** Aggregate daily calories from food log (last N days). */
export const aggregateDailyCalories = (
  foodLog: Array<{ timestamp: number; calories?: number }>,
  days: number = 7,
): { label: string; value: number }[] => {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(dateStr(d), 0);
  }
  for (const f of foodLog) {
    const key = dateStr(new Date(f.timestamp));
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + (f.calories ?? 0));
  }
  return Array.from(map.entries()).map(([k, v]) => ({
    label: k.slice(5),
    value: Math.round(v),
  }));
};

/** Aggregate weekly km from exercise log (last N weeks). */
export const aggregateWeeklyKm = (
  exerciseLog: Array<{ timestamp: number; distanceKm?: number }>,
  weeks: number = 8,
): { label: string; value: number }[] => {
  const now = new Date();
  const result: { label: string; value: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    const sum = exerciseLog
      .filter(e => e.timestamp >= weekStart.getTime() && e.timestamp < weekEnd.getTime())
      .reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    result.push({ label, value: Math.round(sum * 10) / 10 });
  }
  return result;
};

/** Build a heatmap grid for check-in history (last N weeks, Mon-Sun rows). */
export const buildHeatmapGrid = (
  history: Array<{ date: string; done: boolean }>,
  weeks: number = 4,
): { date: string; done: boolean; isToday: boolean }[][] => {
  const doneSet = new Set(history.filter(e => e.done).map(e => e.date));
  const today = dateStr();
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since last Monday

  const grid: { date: string; done: boolean; isToday: boolean }[][] = [];
  // Build from oldest week to newest
  const totalDays = weeks * 7;
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - mondayOffset - (weeks - 1) * 7);

  for (let w = 0; w < weeks; w++) {
    const row: { date: string; done: boolean; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const ds = dateStr(cellDate);
      row.push({ date: ds, done: doneSet.has(ds), isToday: ds === today });
    }
    grid.push(row);
  }
  return grid;
};

// ── Streak break detection ──────────────────────────────────────

export interface StreakBreakEntry {
  breakDate: string;
  lostStreak: number;
  startDate: string;
}

/** Detect streak breaks from checkin history (gaps of ≥2 consecutive missed days). */
export const detectStreakBreaks = (
  history: Array<{ date: string; done: boolean }>,
): StreakBreakEntry[] => {
  const doneDates = history.filter(e => e.done).map(e => e.date).sort();
  if (doneDates.length < 2) return [];

  const breaks: StreakBreakEntry[] = [];
  let streakStart = doneDates[0];
  let streakLen = 1;

  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1]);
    const curr = new Date(doneDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;

    if (diff === 1) {
      streakLen++;
    } else if (diff >= 2) {
      // Gap found — this is a streak break
      const breakDate = new Date(prev);
      breakDate.setDate(breakDate.getDate() + 1);
      breaks.push({
        breakDate: dateStr(breakDate),
        lostStreak: streakLen,
        startDate: streakStart,
      });
      streakStart = doneDates[i];
      streakLen = 1;
    } else {
      streakStart = doneDates[i];
      streakLen = 1;
    }
  }

  return breaks.reverse(); // newest first
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
