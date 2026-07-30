/**
 * 从习惯的 checkedDates 计算连续打卡天数。
 * 用于替代已移除的 habit.streak 字段（数据库不再存储）。
 */
export function getHabitStreak(habit: { checkedDates?: string[] }): number {
  const checked = habit.checkedDates ?? [];
  if (!checked.length) return 0;

  const unique = [...new Set(checked)].sort().reverse();
  const today = dateStr();
  const yest = yesterday();

  // 最近打卡日期必须是今天或昨天
  if (unique[0] !== today && unique[0] !== yest) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = (parseLocalDate(unique[i - 1]).getTime() - parseLocalDate(unique[i]).getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}
