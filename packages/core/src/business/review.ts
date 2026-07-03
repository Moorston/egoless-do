// ─── Review business logic (pure functions) ─────────────────────
import type { 
  CheckinReview, IncompleteReasonStat, IncompleteItemStat, 
  HabitProgressStat, PlanProgressStat, ReviewMetrics, ReviewComparison 
} from '../types';
import type { CheckinEntry, Habit, Plan, PlanItem, FoodEntry, ExerciseEntry, FastingSession, MedHistoryEntry, GraceHistoryEntry } from '../types';
import { INCOMPLETE_REASONS, parseCheckinNote } from './checkin';
import { uid, dateStr } from '../utils';

/** 格式化日期为YYYY-MM-DD */
function formatDate(date: Date): string {
  return dateStr(date);
}

/** Parse YYYY-MM-DD into a local Date (avoids UTC midnight shift). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 计算周起止日期（周一到周日） */
export function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  };
}

/** 计算月起止日期 */
export function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
  };
}

/** 获取日期范围内的天数 */
function getDaysInRange(start: string, end: string): number {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/** 获取日期范围内的所有日期 */
function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  
  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/** 计算连续天数 */
function calculateStreakForRange(dates: string[], doneDates: Set<string>): number {
  let streak = 0;
  for (const date of dates) {
    if (doneDates.has(date)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** 计算最长连续天数 */
function calculateLongestStreak(dates: string[], doneDates: Set<string>): number {
  let maxStreak = 0;
  let currentStreak = 0;
  
  for (const date of dates) {
    if (doneDates.has(date)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return maxStreak;
}

/**
 * 计算复盘数据（纯函数）
 */
export function calculateReviewData(
  period: 'week' | 'month',
  targetDate: string,
  checkinHistory: CheckinEntry[],
  habits: Habit[],
  plans: Plan[],
  planItems: PlanItem[],
  foodLog: FoodEntry[],
  exerciseLog: ExerciseEntry[],
  fastingHistory: FastingSession[],
  medHistory: MedHistoryEntry[],
  graceHistory: GraceHistoryEntry[],
  previousReview?: CheckinReview,
): Omit<CheckinReview, 'id' | 'updatedAt' | 'deleted' | 'aiSummary' | 'highlights' | 'improvements'> {
  // 计算日期范围
  const target = parseLocalDate(targetDate);
  const range = period === 'week' ? getWeekRange(target) : getMonthRange(target);
  const datesInRange = getDatesInRange(range.start, range.end);
  
  // 筛选日期范围内的打卡记录
  const checkinsInRange = checkinHistory.filter(c => 
    c.date >= range.start && c.date <= range.end && !c.deleted
  );
  
  // 计算完成天数
  const doneDates = new Set(checkinsInRange.filter(c => c.done).map(c => c.date));
  const doneDays = doneDates.size;
  
  // 总天数 = 有打卡记录的天数（非周期总天数）
  const totalDays = checkinsInRange.length;
  
  // 计算完成率
  const completionRate = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
  
  // 计算连续天数（从最后完成日向前）
  const doneDatesInRange = datesInRange.filter(d => doneDates.has(d));
  let streakDays = 0;
  if (doneDatesInRange.length > 0) {
    const lastDoneIndex = datesInRange.lastIndexOf(doneDatesInRange[doneDatesInRange.length - 1]);
    const datesToCheck = datesInRange.slice(0, lastDoneIndex + 1);
    streakDays = calculateStreakForRange([...datesToCheck].reverse(), doneDates);
  }
  
  // 计算最长连续天数
  const longestStreak = calculateLongestStreak(datesInRange, doneDates);
  
  // 未完成原因分析
  const incompleteReasons = calculateIncompleteReasons(checkinsInRange);
  
  // 未完成项分析
  const incompleteItems = calculateIncompleteItems(checkinsInRange, habits, planItems);
  
  // 习惯养成进度
  const habitProgress = calculateHabitProgress(habits, datesInRange, range.start, range.end);
  
  // 计划任务进度
  const planProgress = calculatePlanProgress(plans, planItems);
  
  // 各项指标
  const metrics = calculateMetrics(checkinsInRange, foodLog, exerciseLog, fastingHistory, medHistory, graceHistory, range.start, range.end);
  
  // 对比上期
  const comparison = calculateComparison(previousReview, completionRate, streakDays, metrics);
  
  return {
    period,
    startDate: range.start,
    endDate: range.end,
    completionRate,
    doneDays,
    totalDays,
    streakDays,
    longestStreak,
    incompleteReasons,
    incompleteItems,
    habitProgress,
    planProgress,
    metrics,
    comparison,
    generatedAt: Date.now(),
    lastAutoUpdateAt: targetDate,
  };
}

/** 计算未完成原因统计 */
function calculateIncompleteReasons(checkins: CheckinEntry[]): IncompleteReasonStat[] {
  const reasonCounts: Record<string, number> = {};
  let totalReasons = 0;
  
  for (const checkin of checkins) {
    if (!checkin.done && checkin.note) {
      const parsed = parseCheckinNote(checkin.note);
      if (parsed.incompleteReason) {
        reasonCounts[parsed.incompleteReason] = (reasonCounts[parsed.incompleteReason] || 0) + 1;
        totalReasons++;
      }
    }
  }
  
  return INCOMPLETE_REASONS
    .map(r => ({
      code: r.code,
      icon: r.icon,
      count: reasonCounts[r.code] || 0,
      percentage: totalReasons > 0 ? Math.round(((reasonCounts[r.code] || 0) / totalReasons) * 100) : 0,
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** 计算未完成项统计 */
function calculateIncompleteItems(
  checkins: CheckinEntry[], 
  habits: Habit[], 
  planItems: PlanItem[]
): IncompleteItemStat[] {
  const items: IncompleteItemStat[] = [];
  const itemCounts: Record<string, { type: 'practice' | 'habit' | 'planItem'; name: string; count: number }> = {};
  
  for (const checkin of checkins) {
    if (!checkin.done && checkin.note) {
      const parsed = parseCheckinNote(checkin.note);
      
      // 统计未完成的practices
      const allPractices = ['sit', 'stand', 'chant'];
      const incompletePractices = allPractices.filter(p => !parsed.practices.includes(p));
      for (const practice of incompletePractices) {
        const practiceNames: Record<string, string> = { sit: '早睡', stand: '早起', chant: '冥想' };
        const key = `practice:${practice}`;
        if (!itemCounts[key]) {
          itemCounts[key] = { type: 'practice', name: practiceNames[practice] || practice, count: 0 };
        }
        itemCounts[key].count++;
      }
      
      // 统计未完成的habits
      const activeHabits = habits.filter(h => !h.deleted && h.status === 'inProgress');
      for (const habit of activeHabits) {
        if (!parsed.habits.includes(habit.name)) {
          const key = `habit:${habit.id}`;
          if (!itemCounts[key]) {
            itemCounts[key] = { type: 'habit', name: habit.name, count: 0 };
          }
          itemCounts[key].count++;
        }
      }

      // 统计未完成的planItems
      const activePlanItems = planItems.filter(p => !p.deleted && p.status !== 'completed');
      for (const item of activePlanItems) {
        const completedIds = parsed.planItems.map((p) => typeof p === 'string' ? p : p.id);
        if (!completedIds.includes(item.id)) {
          const key = `planItem:${item.id}`;
          if (!itemCounts[key]) {
            itemCounts[key] = { type: 'planItem', name: item.name, count: 0 };
          }
          itemCounts[key].count++;
        }
      }
    }
  }
  
  return Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // 最多显示10项
}

/** 计算习惯养成进度 */
function calculateHabitProgress(
  habits: Habit[], 
  datesInRange: string[], 
  startDate: string, 
  endDate: string
): HabitProgressStat[] {
  return habits
    .filter(h => h.status === 'inProgress' && !h.deleted)
    .map(habit => {
      // 计算日期范围内完成的天数
      const doneDays = (habit.checkedDates ?? []).filter(d =>
        d >= startDate && d <= endDate
      ).length;
      
      // 计算目标天数（根据习惯的目标和日期范围）
      const habitStart = parseLocalDate(habit.startDate);
      const rangeStart = parseLocalDate(startDate);
      const rangeEnd = parseLocalDate(endDate);
      
      // 如果习惯在日期范围内开始，使用习惯的目标天数
      // 否则使用日期范围内的天数
      const targetDays = habitStart >= rangeStart && habitStart <= rangeEnd
        ? Math.min(habit.targetDays, datesInRange.length)
        : datesInRange.length;
      
      const progress = targetDays > 0 ? Math.min(Math.round((doneDays / targetDays) * 100), 100) : 0;
      
      // 计算连续天数
      let streak = 0;
      const todayStr = formatDate(new Date());
      const todayIndex = datesInRange.indexOf(todayStr);
      if (todayIndex >= 0) {
        for (let i = todayIndex; i >= 0; i--) {
          if ((habit.checkedDates ?? []).includes(datesInRange[i])) {
            streak++;
          } else {
            break;
          }
        }
      }
      
      return {
        id: habit.id,
        name: habit.name,
        doneDays,
        targetDays,
        progress,
        streak,
        status: habit.status,
      };
    });
}

/** 计算计划任务进度 */
function calculatePlanProgress(plans: Plan[], planItems: PlanItem[]): PlanProgressStat[] {
  return plans
    .filter(p => p.status === 'in_progress' && !p.deleted)
    .map(plan => {
      const items = planItems.filter(i => i.planId === plan.id && !i.deleted);
      const completedItems = items.filter(i => i.status === 'completed').length;
      const totalItems = items.length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      return {
        planId: plan.id,
        planName: plan.name,
        totalItems,
        completedItems,
        progress,
      };
    });
}

/** 计算各项指标 */
function calculateMetrics(
  checkins: CheckinEntry[],
  foodLog: FoodEntry[],
  exerciseLog: ExerciseEntry[],
  fastingHistory: FastingSession[],
  medHistory: MedHistoryEntry[],
  graceHistory: GraceHistoryEntry[],
  startDate: string,
  endDate: string
): ReviewMetrics {
  // 体重 — sort by date ascending to ensure oldest-first for weightChange
  const sortedForWeight = checkins.filter(c => !c.deleted && c.weight != null).sort((a, b) => a.date.localeCompare(b.date));
  const weights = sortedForWeight.map(c => c.weight!);
  const avgWeight = weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : undefined;
  const weightChange = weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : undefined;
  
  // 饮水
  const waterValues = checkins
    .filter(c => !c.deleted && c.note)
    .map(c => {
      const parsed = parseCheckinNote(c.note!);
      return parsed.waterMl;
    })
    .filter(w => w > 0);
  const avgWater = waterValues.length > 0 ? Math.round(waterValues.reduce((a, b) => a + b, 0) / waterValues.length) : undefined;
  
  // 热量
  const foodInRange = foodLog.filter(f => {
    const date = dateStr(new Date(f.timestamp));
    return date >= startDate && date <= endDate && !f.deleted;
  });
  const caloriesByDay = new Map<string, number>();
  for (const f of foodInRange) {
    const d = dateStr(new Date(f.timestamp));
    caloriesByDay.set(d, (caloriesByDay.get(d) ?? 0) + f.calories);
  }
  const dailyCalories = [...caloriesByDay.values()];
  const avgCalories = dailyCalories.length > 0 ? Math.round(dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length) : undefined;
  
  // 运动
  const exerciseInRange = exerciseLog.filter(e => {
    const date = dateStr(new Date(e.timestamp));
    return date >= startDate && date <= endDate && !e.deleted;
  });
  const totalExerciseMin = exerciseInRange.length > 0 ? Math.round(exerciseInRange.reduce((a, b) => a + b.durationSec, 0) / 60) : undefined;
  const totalExerciseKm = exerciseInRange.length > 0 ? Math.round(exerciseInRange.reduce((a, b) => a + (b.distanceKm || 0), 0) * 10) / 10 : undefined;
  
  // 冥想
  const medInRange = medHistory.filter(m => {
    const date = m.date || '1970-01-01';
    return date >= startDate && date <= endDate && !m.deleted;
  });
  const totalMeditationMin = medInRange.length > 0 ? medInRange.reduce((a, b) => {
    const min = b.durMin || 0;
    return a + min;
  }, 0) : undefined;
  
  // 禁食
  const fastingInRange = fastingHistory.filter(f => {
    if (!f.startedAt || !f.endedAt) return false;
    const date = dateStr(new Date(f.startedAt));
    return date >= startDate && date <= endDate && !f.deleted;
  });
  const fastingCount = fastingInRange.length > 0 ? fastingInRange.length : undefined;
  const fastingHours = fastingInRange.length > 0 ? Math.round(fastingInRange.reduce((a, b) => {
    const hours = ((b.endedAt || 0) - (b.startedAt || 0)) / (1000 * 60 * 60);
    return a + hours;
  }, 0)) : undefined;
  
  // 宽限
  const graceInRange = graceHistory.filter(g => {
    return g.date >= startDate && g.date <= endDate && !g.deleted;
  });
  const graceCount = graceInRange.length > 0 ? graceInRange.length : undefined;
  
  return {
    avgWeight,
    weightChange,
    avgWater,
    avgCalories,
    totalExerciseMin,
    totalExerciseKm,
    totalMeditationMin,
    fastingCount,
    fastingHours,
    graceCount,
  };
}

/** 计算对比上期 */
function calculateComparison(
  previousReview: CheckinReview | undefined,
  currentCompletionRate: number,
  currentStreakDays: number,
  currentMetrics: ReviewMetrics
): ReviewComparison {
  if (!previousReview) {
    return {
      completionRateDiff: 0,
      streakDiff: 0,
    };
  }
  
  return {
    completionRateDiff: currentCompletionRate - previousReview.completionRate,
    streakDiff: currentStreakDays - previousReview.streakDays,
    weightDiff: currentMetrics.avgWeight && previousReview.metrics.avgWeight
      ? Math.round((currentMetrics.avgWeight - previousReview.metrics.avgWeight) * 10) / 10
      : undefined,
    waterDiff: currentMetrics.avgWater && previousReview.metrics.avgWater
      ? currentMetrics.avgWater - previousReview.metrics.avgWater
      : undefined,
    caloriesDiff: currentMetrics.avgCalories && previousReview.metrics.avgCalories
      ? currentMetrics.avgCalories - previousReview.metrics.avgCalories
      : undefined,
    exerciseMinDiff: currentMetrics.totalExerciseMin && previousReview.metrics.totalExerciseMin
      ? currentMetrics.totalExerciseMin - previousReview.metrics.totalExerciseMin
      : undefined,
  };
}

/**
 * 构建AI提示词
 */
export function buildReviewPrompt(
  reviewData: Omit<CheckinReview, 'id' | 'updatedAt' | 'deleted' | 'aiSummary' | 'highlights' | 'improvements'>
): string {
  const periodLabel = reviewData.period === 'week' ? '周' : '月';
  
  let prompt = `请基于以下${periodLabel}复盘数据，生成一份专业的分析总结：

## 时间范围
${reviewData.startDate} - ${reviewData.endDate}

## 核心指标
- 打卡完成率: ${reviewData.completionRate}% (${reviewData.doneDays}/${reviewData.totalDays}天)
- 连续天数: ${reviewData.streakDays}天 (本期最长: ${reviewData.longestStreak}天)
- 对比上期: 完成率${reviewData.comparison.completionRateDiff >= 0 ? '+' : ''}${reviewData.comparison.completionRateDiff}%, 连续天数${reviewData.comparison.streakDiff >= 0 ? '+' : ''}${reviewData.comparison.streakDiff}天`;

  // 未完成分析
  if (reviewData.incompleteReasons.length > 0 || reviewData.incompleteItems.length > 0) {
    prompt += `\n\n## 未完成分析`;
    if (reviewData.incompleteReasons.length > 0) {
      prompt += `\n- 主要原因: ${reviewData.incompleteReasons.map(r => `${r.code}(${r.count}次)`).join(', ')}`;
    }
    if (reviewData.incompleteItems.length > 0) {
      prompt += `\n- 未完成项: ${reviewData.incompleteItems.map(i => `${i.name}(${i.count}次)`).join(', ')}`;
    }
  }
  
  // 习惯养成
  if (reviewData.habitProgress.length > 0) {
    prompt += `\n\n## 习惯养成`;
    for (const habit of reviewData.habitProgress) {
      prompt += `\n${habit.name}: 完成${habit.doneDays}/${habit.targetDays}天, 连续${habit.streak}天`;
    }
  }
  
  // 计划任务
  if (reviewData.planProgress.length > 0) {
    prompt += `\n\n## 计划任务`;
    for (const plan of reviewData.planProgress) {
      prompt += `\n${plan.planName}: 完成${plan.completedItems}/${plan.totalItems}项, 进度${plan.progress}%`;
    }
  }
  
  // 健康指标
  prompt += `\n\n## 健康指标`;
  if (reviewData.metrics.avgWeight) {
    prompt += `\n- 体重: ${reviewData.metrics.avgWeight}kg (变化${reviewData.metrics.weightChange || 0}kg)`;
  }
  if (reviewData.metrics.avgWater) {
    prompt += `\n- 平均饮水: ${reviewData.metrics.avgWater}ml/天`;
  }
  if (reviewData.metrics.avgCalories) {
    prompt += `\n- 平均热量: ${reviewData.metrics.avgCalories}kcal/天`;
  }
  if (reviewData.metrics.totalExerciseMin) {
    prompt += `\n- 运动: ${reviewData.metrics.totalExerciseMin}分钟, ${reviewData.metrics.totalExerciseKm || 0}km`;
  }
  if (reviewData.metrics.totalMeditationMin) {
    prompt += `\n- 冥想: ${reviewData.metrics.totalMeditationMin}分钟`;
  }
  if (reviewData.metrics.fastingCount) {
    prompt += `\n- 禁食: ${reviewData.metrics.fastingCount}次, ${reviewData.metrics.fastingHours || 0}小时`;
  }
  
  prompt += `

请生成：
1. SUMMARY: 一段200-250字的专业分析总结，包含整体表现评估、关键发现、趋势分析、建设性建议
2. HIGHLIGHTS: 2-3个亮点，每个1-2句话
3. IMPROVEMENTS: 2-3个改进建议，每个1-2句话

输出格式（严格遵循）：
SUMMARY:
[总结内容]

HIGHLIGHTS:
- [亮点1]
- [亮点2]

IMPROVEMENTS:
- [建议1]
- [建议2]`;
  
  return prompt;
}

/**
 * 解析AI响应
 */
export function parseReviewAIResponse(
  aiResponse: string
): { summary: string; highlights: string[]; improvements: string[] } {
  const defaultResult = {
    summary: '本周整体表现良好，继续保持。',
    highlights: ['坚持打卡'],
    improvements: ['继续保持'],
  };
  
  try {
    const lines = aiResponse.split('\n').map(l => l.trim()).filter(l => l);
    
    let summary = '';
    const highlights: string[] = [];
    const improvements: string[] = [];
    
    let currentSection: 'summary' | 'highlights' | 'improvements' | null = null;
    
    for (const line of lines) {
      if (line.startsWith('SUMMARY:')) {
        currentSection = 'summary';
        summary = line.replace('SUMMARY:', '').trim();
      } else if (line.startsWith('HIGHLIGHTS:')) {
        currentSection = 'highlights';
      } else if (line.startsWith('IMPROVEMENTS:')) {
        currentSection = 'improvements';
      } else if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.replace(/^[-•]\s*/, '');
        if (currentSection === 'highlights') {
          highlights.push(content);
        } else if (currentSection === 'improvements') {
          improvements.push(content);
        }
      } else if (currentSection === 'summary' && !summary) {
        summary = line;
      }
    }
    
    return {
      summary: summary || defaultResult.summary,
      highlights: highlights.length > 0 ? highlights : defaultResult.highlights,
      improvements: improvements.length > 0 ? improvements : defaultResult.improvements,
    };
  } catch {
    return defaultResult;
  }
}
