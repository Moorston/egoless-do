// ─── Risk Warning System ────────────────────────────────────────
import type { Habit, Plan, CheckinEntry, MindReflection } from '../types';
import { dateStr } from '../utils';

export interface RiskWarning {
  id: string;
  type: 'habit_abandon' | 'plan_delay' | 'streak_break' | 'mood_decline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  relatedId?: string;
  createdAt: number;
}

// 检测习惯放弃风险
export function detectHabitAbandonRisk(habits: Habit[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const today = dateStr();

  habits.filter(h => !h.deleted && h.status === 'inProgress').forEach(habit => {
    const checkedDates = [...(habit.checkedDates ?? [])].sort();
    const lastChecked = checkedDates[checkedDates.length - 1];
    
    if (!lastChecked) return;

    const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const lastDate = parseLocal(lastChecked);
    const todayDate = parseLocal(today);
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

    // 高风险：连续3天以上未打卡
    if (daysDiff >= 3) {
      warnings.push({
        id: `habit_abandon_${habit.id}`,
        type: 'habit_abandon',
        severity: daysDiff >= 5 ? 'critical' : 'high',
        title: `${habit.name} 放弃风险`,
        description: `已经 ${daysDiff} 天未打卡，习惯可能被放弃`,
        suggestion: '尝试降低难度或重新设定目标',
        relatedId: habit.id,
        createdAt: Date.now(),
      });
    }

    // 中风险：打卡率低于50%
    const recentDays = 7;
    const recentChecked = checkedDates.filter(d => {
      const diff = Math.floor((todayDate.getTime() - new Date(d).getTime()) / (24 * 60 * 60 * 1000));
      return diff < recentDays;
    }).length;
    
    if (recentChecked / recentDays < 0.5 && checkedDates.length >= 7) {
      warnings.push({
        id: `habit_low_rate_${habit.id}`,
        type: 'habit_abandon',
        severity: 'medium',
        title: `${habit.name} 打卡率低`,
        description: `最近一周打卡率仅 ${Math.round(recentChecked / recentDays * 100)}%`,
        suggestion: '分析阻碍因素，调整执行策略',
        relatedId: habit.id,
        createdAt: Date.now(),
      });
    }
  });

  return warnings;
}

// 检测计划延期风险
export function detectPlanDelayRisk(plans: Plan[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const today = dateStr();

  const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

  plans.filter(p => !p.deleted && p.status === 'in_progress').forEach(plan => {
    const endDate = parseLocal(plan.endDate);
    const todayDate = parseLocal(today);
    const startDate = parseLocal(plan.startDate);

    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const elapsedDays = Math.floor((todayDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const progress = plan.progress ?? 0;

    // 计算预期进度
    const expectedProgress = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 100;
    const delay = expectedProgress - progress;

    // 高风险：进度严重落后
    if (delay > 30) {
      warnings.push({
        id: `plan_delay_${plan.id}`,
        type: 'plan_delay',
        severity: delay > 50 ? 'critical' : 'high',
        title: `${plan.name} 进度落后`,
        description: `当前进度 ${progress}%，预期 ${Math.round(expectedProgress)}%`,
        suggestion: '检查任务优先级，考虑调整计划范围',
        relatedId: plan.id,
        createdAt: Date.now(),
      });
    }

    // 中风险：即将到期但进度不足
    const daysLeft = Math.floor((endDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft >= 0 && daysLeft <= 7 && progress < 80) {
      warnings.push({
        id: `plan_deadline_${plan.id}`,
        type: 'plan_delay',
        severity: daysLeft <= 3 ? 'high' : 'medium',
        title: `${plan.name} 即将到期`,
        description: `还剩 ${daysLeft} 天，进度 ${progress}%`,
        suggestion: '聚焦核心任务，放弃非必要内容',
        relatedId: plan.id,
        createdAt: Date.now(),
      });
    }
  });

  return warnings;
}

// 检测连续记录中断风险
export function detectStreakBreakRisk(checkinHistory: CheckinEntry[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const today = dateStr();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateStr(yesterdayDate);

  const todayCheckin = checkinHistory.find(c => c.date === today && !c.deleted);
  const yesterdayCheckin = checkinHistory.find(c => c.date === yesterday && !c.deleted);

  // 计算连续天数（只计已完成的打卡，从最近一次打卡往前数）
  let streak = 0;
  const sortedDates = [...new Set(checkinHistory
    .filter(c => c.done && !c.deleted)
    .map(c => c.date))]
    .sort()
    .reverse();

  if (sortedDates.length > 0) {
    streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.1) {
        streak++;
      } else {
        break;
      }
    }
  }

  // 连续记录即将中断：最近一次打卡不是今天，且连续天数 >= 3
  if (streak >= 3 && !todayCheckin) {
    const hour = new Date().getHours();
    if (hour >= 20) {
      warnings.push({
        id: 'streak_break',
        type: 'streak_break',
        severity: streak >= 7 ? 'high' : 'medium',
        title: `${streak} 天连续记录面临中断`,
        description: '今天还没有打卡',
        suggestion: '赶紧完成今天的打卡',
        createdAt: Date.now(),
      });
    }
  }

  return warnings;
}

// 检测情绪下降趋势
export function detectMoodDeclineRisk(reflections: MindReflection[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  
  const recentReflections = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recentReflections.length < 5) return warnings;

  // 情绪评分
  const moodScores: Record<string, number> = {
    '开心': 5, '兴奋': 5, '感恩': 4,
    '平静': 3,
    '焦虑': 2, '疲惫': 2,
    '难过': 1, '生气': 1,
  };

  const recentScores = recentReflections.slice(0, 5).map(r => moodScores[r.mood] ?? 3);
  const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  // 检测下降趋势
  const isDecreasing = recentScores.every((score, i) => i === 0 || score <= recentScores[i - 1]);
  
  if (isDecreasing && avgScore < 2.5) {
    warnings.push({
      id: 'mood_decline',
      type: 'mood_decline',
      severity: avgScore < 2 ? 'high' : 'medium',
      title: '情绪持续低落',
      description: '最近的情绪呈现下降趋势',
      suggestion: '关注自己的心理状态，必要时寻求支持',
      createdAt: Date.now(),
    });
  }

  return warnings;
}

// 获取所有风险预警
export function getAllRiskWarnings(
  habits: Habit[],
  plans: Plan[],
  checkinHistory: CheckinEntry[],
  reflections: MindReflection[]
): RiskWarning[] {
  const warnings: RiskWarning[] = [
    ...detectHabitAbandonRisk(habits),
    ...detectPlanDelayRisk(plans),
    ...detectStreakBreakRisk(checkinHistory),
    ...detectMoodDeclineRisk(reflections),
  ];

  // 按严重程度排序
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
