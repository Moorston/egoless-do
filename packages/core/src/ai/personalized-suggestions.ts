// ─── Personalized Suggestion Engine ─────────────────────────────
import type { MindReflection, Habit, Plan, CheckinEntry } from '../types';
import { dateStr } from '../utils';

import type { RiskWarning } from './risk-warning';
import type { ThoughtPattern } from './thought-patterns';


export interface PersonalizedSuggestion {
  id: string;
  type: 'action' | 'reflection' | 'habit' | 'plan' | 'mindset';
  title: string;
  description: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  relatedIds: string[];
  createdAt: number;
}

// 基于情绪模式生成建议
export function generateMoodSuggestions(
  reflections: MindReflection[],
  patterns: ThoughtPattern[]
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = [];

  // 检查是否有焦虑循环
  const anxietyPattern = patterns.find(p => p.name.includes('焦虑'));
  if (anxietyPattern) {
    suggestions.push({
      id: 'mood_anxiety_action',
      type: 'action',
      title: '打破焦虑循环',
      description: '当你感到焦虑时，尝试深呼吸5次，或者出去走10分钟',
      reason: '检测到你最近经常陷入焦虑',
      priority: 'high',
      relatedIds: anxietyPattern.reflections.slice(0, 3),
      createdAt: Date.now(),
    });

    suggestions.push({
      id: 'mood_anxiety_reflection',
      type: 'reflection',
      title: '探索焦虑的根源',
      description: '记录一次完整的焦虑过程：什么时候开始？什么触发的？怎么结束的？',
      reason: '理解模式是改变的第一步',
      priority: 'medium',
      relatedIds: anxietyPattern.reflections.slice(0, 1),
      createdAt: Date.now(),
    });
  }

  // 检查是否有成长趋势
  const growthPattern = patterns.find(p => p.type === 'growth');
  if (growthPattern) {
    suggestions.push({
      id: 'mood_growth_continue',
      type: 'mindset',
      title: '保持当前节奏',
      description: '你最近的状态在持续改善，继续保持！',
      reason: '检测到积极的成长趋势',
      priority: 'low',
      relatedIds: [],
      createdAt: Date.now(),
    });
  }

  return suggestions;
}

// 基于习惯生成建议
export function generateHabitSuggestions(
  habits: Habit[],
  reflections: MindReflection[]
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = [];

  // 检查进行中的习惯
  const activeHabits = habits.filter(h => !h.deleted && h.status === 'inProgress');
  
  activeHabits.forEach(habit => {
    const progress = habit.targetDays > 0 ? habit.doneDays / habit.targetDays : 0;
    
    // 即将完成的习惯
    if (progress >= 0.8 && progress < 1) {
      suggestions.push({
        id: `habit_complete_${habit.id}`,
        type: 'habit',
        title: `冲刺！${habit.name} 即将完成`,
        description: `还差 ${habit.targetDays - habit.doneDays} 天，坚持就是胜利`,
        reason: '你已经走了80%的路',
        priority: 'medium',
        relatedIds: [habit.id],
        createdAt: Date.now(),
      });
    }

    // 习惯与感念的关联
    const relatedReflections = reflections.filter(r =>
      !r.deleted && (r.tags ?? []).some(t => t.includes(habit.name))
    );
    
    if (relatedReflections.length >= 3) {
      const positiveCount = relatedReflections.filter(r => 
        ['开心', '平静', '感恩'].includes(r.mood)
      ).length;
      
      if (positiveCount > relatedReflections.length * 0.6) {
        suggestions.push({
          id: `habit_positive_${habit.id}`,
          type: 'mindset',
          title: `${habit.name} 带来了积极影响`,
          description: '与这个习惯相关的感念多为正面情绪',
          reason: '这个习惯正在产生好的效果',
          priority: 'low',
          relatedIds: relatedReflections.slice(0, 3).map(r => r.id),
          createdAt: Date.now(),
        });
      }
    }
  });

  return suggestions;
}

// 基于风险生成建议
export function generateRiskBasedSuggestions(
  risks: RiskWarning[]
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = [];

  risks.forEach(risk => {
    switch (risk.type) {
      case 'habit_abandon':
        suggestions.push({
          id: `risk_habit_${risk.relatedId}`,
          type: 'habit',
          title: risk.title,
          description: risk.suggestion,
          reason: risk.description,
          priority: risk.severity === 'critical' ? 'high' : 'medium',
          relatedIds: risk.relatedId ? [risk.relatedId] : [],
          createdAt: Date.now(),
        });
        break;

      case 'plan_delay':
        suggestions.push({
          id: `risk_plan_${risk.relatedId}`,
          type: 'plan',
          title: risk.title,
          description: risk.suggestion,
          reason: risk.description,
          priority: risk.severity === 'critical' ? 'high' : 'medium',
          relatedIds: risk.relatedId ? [risk.relatedId] : [],
          createdAt: Date.now(),
        });
        break;

      case 'mood_decline':
        suggestions.push({
          id: 'risk_mood',
          type: 'reflection',
          title: '关注心理健康',
          description: '最近情绪持续低落，建议找信任的人聊聊',
          reason: risk.description,
          priority: 'high',
          relatedIds: [],
          createdAt: Date.now(),
        });
        break;
    }
  });

  return suggestions;
}

// 基于时间生成建议
export function generateTimeBasedSuggestions(
  reflections: MindReflection[],
  checkinHistory: CheckinEntry[]
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const hour = today.getHours();

  // 周末建议
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const weekendReflections = reflections.filter(r => {
      const d = new Date(r.timestamp).getDay();
      return (d === 0 || d === 6) && !r.deleted;
    });

    if (weekendReflections.length >= 3) {
      const weekendMoods = weekendReflections.map(r => r.mood);
      const positiveCount = weekendMoods.filter(m => ['开心', '平静'].includes(m)).length;
      
      if (positiveCount > weekendReflections.length * 0.5) {
        suggestions.push({
          id: 'time_weekend',
          type: 'mindset',
          title: '享受周末时光',
          description: '你周末的状态通常比较好，继续保持',
          reason: '周末是你充电的时间',
          priority: 'low',
          relatedIds: [],
          createdAt: Date.now(),
        });
      }
    }
  }

  // 晚间建议
  if (hour >= 21 && hour <= 23) {
    const todayCheckin = checkinHistory.find(c =>
      c.date === dateStr(today) && !c.deleted
    );

    if (!todayCheckin) {
      suggestions.push({
        id: 'time_evening_checkin',
        type: 'action',
        title: '完成今天的打卡',
        description: '睡前回顾一下今天的收获',
        reason: '坚持记录是成长的基础',
        priority: 'medium',
        relatedIds: [],
        createdAt: Date.now(),
      });
    }
  }

  return suggestions;
}

// 获取所有个性化建议
export function getAllPersonalizedSuggestions(
  reflections: MindReflection[],
  habits: Habit[],
  plans: Plan[],
  checkinHistory: CheckinEntry[],
  patterns: ThoughtPattern[],
  risks: RiskWarning[]
): PersonalizedSuggestion[] {
  const suggestions: PersonalizedSuggestion[] = [
    ...generateMoodSuggestions(reflections, patterns),
    ...generateHabitSuggestions(habits, reflections),
    ...generateRiskBasedSuggestions(risks),
    ...generateTimeBasedSuggestions(reflections, checkinHistory),
  ];

  // 去重
  const uniqueSuggestions = suggestions.filter((s, i, arr) =>
    arr.findIndex(s2 => s2.id === s.id) === i
  );

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return uniqueSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
