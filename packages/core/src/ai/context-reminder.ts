// ─── Context-aware Reminder Service ────────────────────────────
import type { MindReflection, Habit, CheckinEntry } from '../types';
import { dateStr } from '../utils';

export interface ContextReminder {
  id: string;
  type: 'mood_pattern' | 'habit_risk' | 'streak_at_risk' | 'reflection_gap';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
  createdAt: number;
}

// 检测情绪模式
export function detectMoodPatterns(reflections: MindReflection[]): ContextReminder[] {
  const reminders: ContextReminder[] = [];
  const recentReflections = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recentReflections.length < 3) return reminders;

  // 检测连续负面情绪
  const recentMoods = recentReflections.slice(0, 5).map(r => r.mood);
  const negativeMoods = ['焦虑', '难过', '生气', '疲惫'];
  const consecutiveNegative = recentMoods.every(m => negativeMoods.includes(m));

  if (consecutiveNegative) {
    reminders.push({
      id: 'mood_negative_pattern',
      type: 'mood_pattern',
      title: '情绪关注',
      message: '最近几天的情绪都比较低落，要不要找朋友聊聊或做一些放松的活动？',
      priority: 'high',
      action: '记录感念',
      createdAt: Date.now(),
    });
  }

  // 检测情绪转变
  const moodChanges = recentReflections.slice(0, 5).filter((r, i) => 
    i > 0 && r.mood !== recentReflections[i - 1].mood
  ).length;

  if (moodChanges >= 3) {
    reminders.push({
      id: 'mood_fluctuation',
      type: 'mood_pattern',
      title: '情绪波动',
      message: '最近情绪变化较多，可以尝试记录一下是什么在影响你',
      priority: 'medium',
      action: '记录感念',
      createdAt: Date.now(),
    });
  }

  return reminders;
}

// 检测习惯风险
export function detectHabitRisks(habits: Habit[]): ContextReminder[] {
  const reminders: ContextReminder[] = [];
  const today = dateStr();

  habits.filter(h => h.status === 'inProgress').forEach(habit => {
    const checkedDates = habit.checkedDates ?? [];
    const lastChecked = checkedDates[checkedDates.length - 1];
    
    // 检测连续未打卡
    if (lastChecked && lastChecked !== today) {
      const lastDate = new Date(lastChecked);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff >= 2) {
        reminders.push({
          id: `habit_risk_${habit.id}`,
          type: 'habit_risk',
          title: `${habit.name} 即将中断`,
          message: `已经 ${daysDiff} 天没有打卡了，连续记录可能会中断`,
          priority: daysDiff >= 3 ? 'high' : 'medium',
          action: '去打卡',
          createdAt: Date.now(),
        });
      }
    }

    // 检测即将完成
    const progress = habit.doneDays / habit.targetDays;
    if (progress >= 0.8 && progress < 1) {
      reminders.push({
        id: `habit_almost_${habit.id}`,
        type: 'habit_risk',
        title: `${habit.name} 即将完成`,
        message: `还差 ${habit.targetDays - habit.doneDays} 天就达成目标了，加油！`,
        priority: 'low',
        action: '查看详情',
        createdAt: Date.now(),
      });
    }
  });

  return reminders;
}

// 检测打卡连续性风险
export function detectStreakRisks(checkinHistory: CheckinEntry[]): ContextReminder[] {
  const reminders: ContextReminder[] = [];
  const today = dateStr();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todayCheckin = checkinHistory.find(c => c.date === today);
  const yesterdayCheckin = checkinHistory.find(c => c.date === yesterday);

  // 今天还没打卡
  if (!todayCheckin) {
    const hour = new Date().getHours();
    if (hour >= 20) {
      reminders.push({
        id: 'checkin_today',
        type: 'streak_at_risk',
        title: '今天还没打卡',
        message: '记得完成今天的打卡，保持连续记录',
        priority: 'medium',
        action: '去打卡',
        createdAt: Date.now(),
      });
    }
  }

  // 昨天没打卡
  if (!yesterdayCheckin && todayCheckin) {
    reminders.push({
      id: 'checkin_yesterday',
      type: 'streak_at_risk',
      title: '昨天没有打卡',
      message: '昨天的记录缺失，可能会影响连续天数统计',
      priority: 'low',
      createdAt: Date.now(),
    });
  }

  return reminders;
}

// 检测感念间隔
export function detectReflectionGaps(reflections: MindReflection[]): ContextReminder[] {
  const reminders: ContextReminder[] = [];
  const sortedReflections = reflections
    .filter(r => !r.deleted)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (sortedReflections.length === 0) return reminders;

  const lastReflection = sortedReflections[0];
  const daysSinceLastReflection = Math.floor(
    (Date.now() - lastReflection.timestamp) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceLastReflection >= 3) {
    reminders.push({
      id: 'reflection_gap',
      type: 'reflection_gap',
      title: '好久没记录了',
      message: `已经 ${daysSinceLastReflection} 天没有记录感念了，有什么想法吗？`,
      priority: daysSinceLastReflection >= 7 ? 'high' : 'medium',
      action: '记录感念',
      createdAt: Date.now(),
    });
  }

  return reminders;
}

// 获取所有情境提醒
export function getAllContextReminders(
  reflections: MindReflection[],
  habits: Habit[],
  checkinHistory: CheckinEntry[]
): ContextReminder[] {
  const reminders: ContextReminder[] = [
    ...detectMoodPatterns(reflections),
    ...detectHabitRisks(habits),
    ...detectStreakRisks(checkinHistory),
    ...detectReflectionGaps(reflections),
  ];

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return reminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
