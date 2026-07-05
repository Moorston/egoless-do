// ─── 止观履历业务层 ──────────────────────────────────────────────
import type { ZhiguanSession, ZhiguanStats, ZhiguanMethod } from '../types';
import { dateStr } from '../utils';

/** 按日期排序（新 → 旧） */
export function sortSessionsByDateDesc(sessions: ZhiguanSession[]): ZhiguanSession[] {
  return [...sessions].sort((a, b) => {
    const ta = a.endTs ?? a.startTs;
    const tb = b.endTs ?? b.startTs;
    return tb - ta;
  });
}

const EMPTY_STATS: ZhiguanStats = {
  totalSessions: 0,
  totalMinutes: 0,
  longestMinutes: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastSessionDate: undefined,
  methodDistribution: { anapanasati: 0, self_inquiry: 0, kasina: 0, metta: 0 },
};

/** 计算履历统计 */
export function computeZhiguanStats(sessions: ZhiguanSession[]): ZhiguanStats {
  const validSessions = sessions.filter(s => !s.deleted);
  if (validSessions.length === 0) return EMPTY_STATS;

  let totalMs = 0;
  let longestMs = 0;
  const dateSet = new Set<string>();
  const methodDist: Record<ZhiguanMethod, number> = {
    anapanasati: 0, self_inquiry: 0, kasina: 0, metta: 0,
  };

  for (const s of validSessions) {
    const start = s.startTs;
    const end = s.endTs ?? Date.now();
    const dur = Math.max(0, end - start);
    totalMs += dur;
    if (dur > longestMs) longestMs = dur;

    const ds = dateStr(new Date(start));
    dateSet.add(ds);

    const m = s.chosenMethod;
    methodDist[m] = (methodDist[m] ?? 0) + 1;
  }

  const sortedDates = Array.from(dateSet).sort().reverse();
  const lastSessionDate = sortedDates[0];
  const { current, longest } = computeStreakDays(dateSet);

  return {
    totalSessions: validSessions.length,
    totalMinutes: Math.floor(totalMs / 60000),
    longestMinutes: Math.floor(longestMs / 60000),
    currentStreakDays: current,
    longestStreakDays: longest,
    lastSessionDate,
    methodDistribution: methodDist,
  };
}

/**
 * 计算坐禅连续天数
 * - 今天有记录：current = 从今天往回数连续天数
 * - 今天无记录 current = 0
 */
export function computeStreakDays(dateSet: Set<string>): { current: number; longest: number } {
  if (dateSet.size === 0) return { current: 0, longest: 0 };

  const today = new Date();
  const todayStr = dateStr(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = dateStr(yesterday);

  let current = 0;
  if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
    const cursor = dateSet.has(todayStr) ? new Date(today) : new Date(yesterday);
    while (dateSet.has(dateStr(cursor))) {
      current += 1;
      cursor.setTime(cursor.getTime() - 86400000);
    }
  }

  // 最长连续：升序遍历
  const sortedAsc = Array.from(dateSet).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedAsc.length; i += 1) {
    const prev = new Date(sortedAsc[i - 1]);
    const cur = new Date(sortedAsc[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

/** 获得指定日期的坐禅时长（毫秒） */
export function getDailyTotalMs(sessions: ZhiguanSession[], targetDate: string): number {
  return sessions
    .filter(s => !s.deleted && dateStr(new Date(s.startTs)) === targetDate)
    .reduce((sum, s) => sum + Math.max(0, (s.endTs ?? Date.now()) - s.startTs), 0);
}

/** 计算月度热力图数据（本月每天的坐禅分钟数） */
export function computeHeatmap(sessions: ZhiguanSession[], year: number, month: number): Array<{ date: string; minutes: number }> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: Array<{ date: string; minutes: number }> = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ms = getDailyTotalMs(sessions, dateStr);
    result.push({ date: dateStr, minutes: Math.floor(ms / 60000) });
  }
  return result;
}
