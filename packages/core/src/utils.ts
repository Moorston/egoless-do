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

export function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export const formatAgoT = (ts: number, T: (key: string) => string) => {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return T('timeAgoJustNow');
  if (d < 60) return T('timeAgoMinutes').replace('{n}', String(d));
  if (d < 1440) return T('timeAgoHours').replace('{n}', String(Math.floor(d / 60)));
  return T('timeAgoDays').replace('{n}', String(Math.floor(d / 1440)));
};

let _uidCounter = 0;
export const uid = () => Date.now().toString(36) + (_uidCounter++).toString(36) + Math.random().toString(36).slice(2, 6);

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
  history: Array<{ date: string; done: boolean; grace?: boolean }>,
  weeks: number = 4,
): { date: string; done: boolean; grace: boolean; isToday: boolean }[][] => {
  const doneSet = new Set(history.filter(e => e.done).map(e => e.date));
  const graceSet = new Set(history.filter(e => e.grace).map(e => e.date));
  const today = dateStr();
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since last Monday

  const grid: { date: string; done: boolean; grace: boolean; isToday: boolean }[][] = [];
  // Build from oldest week to newest
  const totalDays = weeks * 7;
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - mondayOffset - (weeks - 1) * 7);

  for (let w = 0; w < weeks; w++) {
    const row: { date: string; done: boolean; grace: boolean; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const ds = dateStr(cellDate);
      row.push({ date: ds, done: doneSet.has(ds), grace: graceSet.has(ds), isToday: ds === today });
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

    if (diff === 0) {
      continue; // Skip same-day duplicates without breaking streak
    } else if (diff === 1) {
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

/** Compute the longest consecutive-day streak from a sorted/unsorted list of date strings. */
export function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let max = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; max = Math.max(max, current); }
    else if (diff > 1) current = 1;
  }
  return max;
}

// ── Streak break insights & recovery ────────────────────────────

export interface BreakInsight {
  weekdayDist: number[];    // [7] 索引0=周一, 6=周日
  monthDist: number[];      // [12] 索引0=1月, 11=12月
  avgStreak: number;
  avgRecoveryDays: number;
  totalBreaks: number;
  monthlyTrend: { month: string; count: number }[];
}

export interface HypotheticalResult {
  available: boolean;
  hypotheticalStreak: number;
}

export type RecoveryState = 'active' | 'just_broke' | 'at_risk' | 'long_absence';

export interface RecoveryData {
  state: RecoveryState;
  currentStreak?: number;
  previousStreak?: number;
  daysSinceLastBreak?: number;
  daysSinceLastCheckin?: number;
}

/** Compute current streak (consecutive done days ending at today or yesterday). */
export function computeCurrentStreak(history: Array<{ date: string; done: boolean }>): number {
  const doneSet = new Set(history.filter(e => e.done).map(e => e.date));
  let streak = 0;
  const d = new Date();
  // If today is not done, start checking from yesterday
  if (!doneSet.has(dateStr(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (doneSet.has(dateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Compute break pattern insights. */
export function computeBreakInsights(
  breaks: StreakBreakEntry[],
  history: Array<{ date: string; done: boolean }>,
): BreakInsight {
  const weekdayDist = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  const monthDist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (const b of breaks) {
    const d = new Date(b.breakDate);
    const day = d.getDay(); // 0=Sun
    weekdayDist[day === 0 ? 6 : day - 1]++; // Map to Mon=0, Sun=6
    monthDist[d.getMonth()]++;
  }

  const avgStreak = breaks.length > 0
    ? Math.round(breaks.reduce((s, b) => s + b.lostStreak, 0) / breaks.length * 10) / 10
    : 0;

  // Recovery: days from breakDate to next done date
  const doneDates = history.filter(e => e.done).map(e => e.date).sort();
  let totalRecovery = 0, recoveryCount = 0;
  for (const b of breaks) {
    const nextDone = doneDates.find(d => d > b.breakDate);
    if (nextDone) {
      const diff = (new Date(nextDone).getTime() - new Date(b.breakDate).getTime()) / 86400000;
      totalRecovery += diff;
      recoveryCount++;
    }
  }
  const avgRecoveryDays = recoveryCount > 0
    ? Math.round(totalRecovery / recoveryCount * 10) / 10
    : 0;

  // Monthly trend: last 6 months
  const monthlyTrend: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend.push({ month: ym, count: breaks.filter(b => b.breakDate.startsWith(ym)).length });
  }

  return { weekdayDist, monthDist, avgStreak, avgRecoveryDays, totalBreaks: breaks.length, monthlyTrend };
}

/** Compute hypothetical streak if grace was used on a break date. */
export function computeHypotheticalStreak(
  breakEntry: StreakBreakEntry,
  history: Array<{ date: string; done: boolean }>,
  graceHistory: Array<{ date: string; deleted?: boolean }>,
  quota: number,
): HypotheticalResult {
  const breakMonth = breakEntry.breakDate.slice(0, 7);
  const usedCount = (graceHistory ?? []).filter(
    g => !g.deleted && g.date.startsWith(breakMonth),
  ).length;
  const hasExisting = (graceHistory ?? []).some(
    g => g.date === breakEntry.breakDate && !g.deleted,
  );
  const available = quota > 0 && usedCount < quota && !hasExisting;

  if (!available) return { available: false, hypotheticalStreak: 0 };

  // Count consecutive done days after breakDate
  const doneDates = new Set(history.filter(e => e.done).map(e => e.date));
  let consecutive = 0;
  const d = new Date(breakEntry.breakDate);
  while (doneDates.has(dateStr(d))) {
    consecutive++;
    d.setDate(d.getDate() + 1);
  }

  return { available: true, hypotheticalStreak: breakEntry.lostStreak + consecutive };
}

/** Generate data-driven encouragement messages. */
export function generateEncouragement(
  breaks: StreakBreakEntry[],
  longestStreak: number,
  totalCheckinDays: number,
  currentStreak: number,
  insight: BreakInsight,
): string[] {
  const msgs: string[] = [];
  const breakDays = breaks.reduce((s, b) => s + b.lostStreak, 0);
  const total = totalCheckinDays + breakDays;
  if (total > 0) {
    const rate = Math.round((totalCheckinDays / total) * 100);
    msgs.push(`连续打卡 ${totalCheckinDays} 天，坚持率 ${rate}%`);
  }
  if (longestStreak >= 3) {
    msgs.push(`你的最长连胜 ${longestStreak} 天，证明你做得到`);
  }
  const trend = insight.monthlyTrend;
  if (trend.length >= 2) {
    const last = trend[trend.length - 1].count;
    const prev = trend[trend.length - 2].count;
    if (last < prev) msgs.push('本月中断比上月减少，你在进步');
  }
  if (currentStreak > insight.avgStreak && currentStreak >= 3) {
    msgs.push(`当前连胜 ${currentStreak} 天，已超过你的平均 ${insight.avgStreak} 天`);
  }
  const weekendBreaks = insight.weekdayDist[5] + insight.weekdayDist[6];
  if (breaks.length > 0 && weekendBreaks > breaks.length * 0.4) {
    msgs.push('周末是你的薄弱时段，注意保持');
  }
  if (msgs.length < 2) {
    msgs.push('每一次中断都是重新出发的机会');
    msgs.push('修行的路上，重要的不是从不跌倒，而是每次跌倒后都站起来');
  }
  return msgs.slice(0, 3);
}

/** Get recovery state data for the streak break page. */
export function getRecoveryData(
  checkinHistory: Array<{ date: string; done: boolean }>,
  breaks: StreakBreakEntry[],
): RecoveryData {
  const currentStreak = computeCurrentStreak(checkinHistory);
  const today = dateStr();
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = dateStr(yesterdayDate);
  const todayDone = checkinHistory.some(c => c.date === today && c.done);
  const yesterdayDone = checkinHistory.some(c => c.date === yesterday && c.done);

  if (currentStreak > 0) {
    // Compute days since last break
    const doneDates = checkinHistory.filter(c => c.done).map(c => c.date).sort();
    let daysSinceLastBreak = 0;
    if (breaks.length > 0 && doneDates.length > 0) {
      const lastBreakDate = new Date(breaks[0].breakDate);
      const lastDoneDate = new Date(doneDates[doneDates.length - 1]);
      daysSinceLastBreak = Math.floor((lastDoneDate.getTime() - lastBreakDate.getTime()) / 86400000);
      if (daysSinceLastBreak < 0) daysSinceLastBreak = 0;
    }
    return { state: 'active', currentStreak, daysSinceLastBreak };
  }

  if (!todayDone && !yesterdayDone) {
    return {
      state: 'just_broke',
      previousStreak: breaks.length > 0 ? breaks[0].lostStreak : 0,
    };
  }

  if (!todayDone && yesterdayDone) {
    return { state: 'at_risk', currentStreak: 1 }; // yesterday counts
  }

  // Long absence: find last done date
  const doneDates = checkinHistory.filter(c => c.done).map(c => c.date).sort();
  if (doneDates.length > 0) {
    const lastDone = doneDates[doneDates.length - 1];
    const daysSince = Math.floor((Date.now() - new Date(lastDone).getTime()) / 86400000);
    if (daysSince > 7) {
      return { state: 'long_absence', daysSinceLastCheckin: daysSince };
    }
  }

  return { state: 'active', currentStreak: 0 };
}

/** Format timestamp or date string to readable date-time format */
export const formatTime = (ts?: number, date?: string): string => {
  if (ts) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date ?? '';
};
