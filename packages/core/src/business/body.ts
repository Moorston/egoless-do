// ─── Body regulation business logic (pure functions) ──────────
import type { BodyStrategy, BodyTrainingPlan, DayOverview, DayStatus, ExerciseEntry, ExerciseDef } from '../types';
import { uid } from '../utils';

export function calcBMI(weight: number, heightCm: number): number {
  if (heightCm <= 0 || weight <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function calcBMR(weight: number, heightCm: number, age: number, gender: 'male' | 'female'): number {
  if (weight <= 0 || heightCm <= 0 || age <= 0) return 0;
  // Mifflin-St Jeor equation
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return Math.round(base + (gender === 'male' ? 5 : -161));
}

export function calcGoalProgress(
  current: number | undefined,
  target: number | undefined,
  initial: number | undefined,
): number {
  if (current == null || target == null || initial == null) return 0;
  const totalChange = Math.abs(initial - target);
  if (totalChange === 0) return 100;
  const achieved = Math.abs(initial - current);
  return Math.min(Math.round((achieved / totalChange) * 100), 100);
}

export function recommendStrategy(bodyTags: string[]): BodyStrategy | null {
  const tagSet = new Set(bodyTags);
  if (tagSet.has('偏瘦') || tagSet.has('上肢弱') || tagSet.has('下肢弱') || tagSet.has('核心弱')) return 'gain_muscle';
  if (tagSet.has('偏胖')) return 'lose_fat';
  if (tagSet.has('颈椎') || tagSet.has('腰酸')) return 'posture';
  if (tagSet.has('体虚') || tagSet.has('乏力') || tagSet.has('气短')) return 'recovery';
  return null;
}

export function createBodyGoal(partial: {
  targetWeight?: number;
  targetBodyFat?: number;
  initialWeight?: number;
  initialBodyFat?: number;
  targetDate?: string;
  strategy?: BodyStrategy;
  note?: string;
}) {
  return {
    id: uid(),
    targetWeight: partial.targetWeight,
    targetBodyFat: partial.targetBodyFat,
    initialWeight: partial.initialWeight,
    initialBodyFat: partial.initialBodyFat,
    targetDate: partial.targetDate ?? '',
    strategy: partial.strategy,
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createBodyPlan(partial: {
  goalId?: string;
  weekday: number;
  part: string;
  sportKey?: string;
  note?: string;
}) {
  return {
    id: uid(),
    goalId: partial.goalId ?? '',
    weekday: partial.weekday,
    part: partial.part,
    sportKey: partial.sportKey ?? '',
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createWeightRecord(partial: {
  date: string;
  weight: number;
  bodyFat?: number;
}) {
  return {
    id: uid(),
    date: partial.date,
    weight: partial.weight,
    bodyFat: partial.bodyFat,
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createBodyCheckin(partial: {
  date: string;
  energy: number;
  pain: number;
  comfort: number;
  sleep: number;
  tags: string[];
  note?: string;
}) {
  return {
    id: uid(),
    date: partial.date,
    energy: partial.energy,
    pain: partial.pain,
    comfort: partial.comfort,
    sleep: partial.sleep,
    tags: partial.tags,
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}

// ─── PR Records (Personal Records) ───────────────────────────

export interface PRRecord {
  sportKey: string;
  bestDuration?: { value: number; date: string };
  bestDistance?: { value: number; date: string };
  bestReps?: { value: number; date: string };
  bestPace?: { value: number; date: string };
  bestCalories?: { value: number; date: string };
}

/**
 * 计算每个运动类型的个人最佳记录
 * 纯函数，基于 exerciseLog 计算
 */
export function computePRs(exerciseLog: ExerciseEntry[]): PRRecord[] {
  const map = new Map<string, PRRecord>();
  for (const e of exerciseLog) {
    if (e.deleted) continue;
    const date = new Date(e.timestamp).toISOString().slice(0, 10);
    const existing = map.get(e.sportKey) ?? { sportKey: e.sportKey };

    if (e.durationSec > (existing.bestDuration?.value ?? 0))
      existing.bestDuration = { value: e.durationSec, date };
    if ((e.distanceKm ?? 0) > (existing.bestDistance?.value ?? 0))
      existing.bestDistance = { value: e.distanceKm!, date };
    if ((e.reps ?? 0) > (existing.bestReps?.value ?? 0))
      existing.bestReps = { value: e.reps!, date };
    if (e.avgPace && e.avgPace > 0 && e.avgPace < (existing.bestPace?.value ?? Infinity))
      existing.bestPace = { value: e.avgPace, date };
    if ((e.calories ?? 0) > (existing.bestCalories?.value ?? 0))
      existing.bestCalories = { value: e.calories!, date };

    map.set(e.sportKey, existing);
  }
  return Array.from(map.values());
}

// ─── Muscle Group Stats ──────────────────────────────────────

export interface MuscleGroupStat {
  muscle: string;
  count: number;
  lastTrained: string; // YYYY-MM-DD
}

/**
 * 计算每个肌群的训练次数和最近训练日期
 * @param exerciseLog 运动记录
 * @param exerciseLibrary 动作库（包含 muscleGroups）
 */
export function computeMuscleGroupStats(
  exerciseLog: ExerciseEntry[],
  exerciseLibrary: ExerciseDef[],
): MuscleGroupStat[] {
  const stats = new Map<string, { count: number; lastTrained: string }>();

  for (const entry of exerciseLog) {
    if (entry.deleted) continue;
    const date = new Date(entry.timestamp).toISOString().slice(0, 10);
    const def = exerciseLibrary.find(
      d => d.nameZh === entry.sportKey || d.id === entry.sportKey
    );
    if (!def) continue;

    for (const muscle of def.muscleGroups) {
      const existing = stats.get(muscle) ?? { count: 0, lastTrained: date };
      existing.count++;
      if (date > existing.lastTrained) existing.lastTrained = date;
      stats.set(muscle, existing);
    }
  }

  return Array.from(stats.entries())
    .map(([muscle, data]) => ({ muscle, ...data }))
    .sort((a, b) => b.count - a.count);
}

// ─── Exercise Frequency Heatmap ──────────────────────────────

export interface DayFrequency {
  date: string;      // YYYY-MM-DD
  count: number;     // 运动次数
  totalMin: number;  // 总时长(分钟)
  level: 0 | 1 | 2 | 3; // 0=无, 1=轻度(<20min), 2=正常(20-60min), 3=高强度(>60min)
}

/**
 * 计算指定月份每天的运动频率
 * @param exerciseLog 运动记录
 * @param yearMonth "YYYY-MM" 格式的月份
 */
export function computeMonthFrequency(
  exerciseLog: ExerciseEntry[],
  yearMonth: string,
): DayFrequency[] {
  // Get days in month
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Aggregate by date
  const byDate = new Map<string, { count: number; totalMin: number }>();
  for (const entry of exerciseLog) {
    if (entry.deleted) continue;
    const date = new Date(entry.timestamp).toISOString().slice(0, 10);
    if (!date.startsWith(yearMonth)) continue;
    const existing = byDate.get(date) ?? { count: 0, totalMin: 0 };
    existing.count++;
    existing.totalMin += Math.round(entry.durationSec / 60);
    byDate.set(date, existing);
  }

  // Build result for each day
  const result: DayFrequency[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const data = byDate.get(dateStr);
    const totalMin = data?.totalMin ?? 0;
    const level: DayFrequency['level'] = totalMin === 0 ? 0 : totalMin < 20 ? 1 : totalMin <= 60 ? 2 : 3;
    result.push({ date: dateStr, count: data?.count ?? 0, totalMin, level });
  }
  return result;
}

// ─── Training Suggestions (Rule Engine) ──────────────────────

export interface TrainingSuggestion {
  type: 'rest' | 'switch' | 'increase' | 'decrease' | 'streak' | 'pr';
  icon: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 基于规则引擎生成训练建议
 * 纯函数，基于运动记录 + 身体觉知 + 训练计划
 */
export function generateSuggestions(
  exerciseLog: ExerciseEntry[],
  bodyCheckins: { date: string; energy: number; pain: number; deleted?: boolean }[],
  activePlan?: { endDate: string; tasks: { weekday: number; sportKey: string }[] } | null,
): TrainingSuggestion[] {
  const suggestions: TrainingSuggestion[] = [];
  const now = Date.now();
  const DAY = 86400000;
  const today = new Date(now).toISOString().slice(0, 10);

  // 规则 1: 连续训练天数
  const recentLogs = exerciseLog
    .filter(e => !e.deleted && (now - e.timestamp) < 30 * DAY)
    .sort((a, b) => b.timestamp - a.timestamp);

  let consecutiveDays = 0;
  let checkDate = new Date(now);
  for (let i = 0; i < 30; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const hasExercise = recentLogs.some(e => new Date(e.timestamp).toISOString().slice(0, 10) === dateStr);
    if (hasExercise) {
      consecutiveDays++;
    } else if (i > 0) { // Allow today to be rest day
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (consecutiveDays >= 5) {
    suggestions.push({
      type: 'rest', icon: '😴',
      message: `已连续训练 ${consecutiveDays} 天，建议安排休息日`,
      priority: 'high',
    });
  } else if (consecutiveDays >= 3) {
    suggestions.push({
      type: 'rest', icon: '💪',
      message: `连续 ${consecutiveDays} 天训练，注意恢复`,
      priority: 'medium',
    });
  }

  // 规则 2: 能量评分趋势
  const recentCheckins = bodyCheckins
    .filter(c => !c.deleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  if (recentCheckins.length >= 2) {
    const avgEnergy = recentCheckins.reduce((s, c) => s + c.energy, 0) / recentCheckins.length;
    if (avgEnergy <= 2) {
      suggestions.push({
        type: 'decrease', icon: '⚡',
        message: '近期能量偏低，建议轻度运动或瑜伽',
        priority: 'medium',
      });
    }
  }

  // 规则 3: 疼痛警告
  const highPain = recentCheckins.some(c => c.pain >= 4);
  if (highPain) {
    suggestions.push({
      type: 'decrease', icon: '⚠️',
      message: '检测到较高疼痛评分，建议休息或咨询医生',
      priority: 'high',
    });
  }

  // 规则 4: 计划进度提醒
  if (activePlan) {
    const daysLeft = Math.ceil((new Date(activePlan.endDate).getTime() - now) / DAY);
    if (daysLeft <= 3 && daysLeft > 0) {
      suggestions.push({
        type: 'streak', icon: '🎯',
        message: `计划还剩 ${daysLeft} 天，加油完成！`,
        priority: 'medium',
      });
    } else if (daysLeft < 0) {
      suggestions.push({
        type: 'streak', icon: '📋',
        message: '当前计划已到期，可以创建新计划',
        priority: 'low',
      });
    }
  }

  // 规则 5: 本周运动频率
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekLogs = recentLogs.filter(e => e.timestamp >= weekStart.getTime());
  if (weekLogs.length === 0 && new Date().getDay() >= 3) { // Wednesday or later
    suggestions.push({
      type: 'increase', icon: '🏃',
      message: '本周还没有运动记录，开始动起来吧！',
      priority: 'medium',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ─── DayOverview (周历每日摘要) ──────────────────────────────────────
// 用于顶部迷你周历显示每天的状态色块

export { type DayOverview, type DayStatus } from '../types';

/**
 * Generate week-overview data for the mini week calendar.
 * Pure function — derives DayOverview[] from a BodyTrainingPlan.
 */
export function getDayOverview(plan: BodyTrainingPlan | undefined, referenceDate: Date): DayOverview[] {
  if (!plan) return [];
  const tasks = plan.tasks ?? [];
  const start = new Date(plan.startDate + 'T00:00:00');
  const end = new Date(plan.endDate + 'T00:00:00');
  const refDay = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (refDay - 1));
  const days: DayOverview[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const weekday = d.getDay() === 0 ? 7 : d.getDay();
    const dateStr = formatDate(d);
    const inRange = d >= start && d <= end;
    const task = tasks.find(t => t.weekday === weekday);
    let status: DayStatus = 'empty';
    let exerciseCount = 0;
    let durationMin = 0;
    if (inRange) {
      if (task?.sportKey === 'rest') {
        status = 'rest';
      } else if (task && (task.exercises?.length ?? 0) > 0) {
        status = 'planned';
        exerciseCount = task.exercises?.length ?? 0;
        durationMin = estimateDuration(task.exercises ?? []);
      }
    }
    const intensity = status === 'rest' || status === 'empty' ? 0 : Math.min(1, exerciseCount / 6);
    days.push({
      weekday,
      date: dateStr,
      status,
      intensity,
      partIcon: task && task.sportKey !== 'rest' ? getPartIcon(task.sportKey) : undefined,
      exerciseCount,
      durationMin,
    });
  }
  return days;
}

function estimateDuration(exercises: Partial<ExerciseDef>[]): number {
  if (exercises.length === 0) return 0;
  const totalSec = exercises.reduce((s, ex) => s + (ex.defaultDurationSec ?? ((ex.defaultSets ?? 3) * 45)), 0);
  return Math.round(totalSec / 60);
}

function getPartIcon(sportKey: string): string {
  const PART_ICONS: Record<string, string> = {
    chest_triceps: '💪', back_biceps: '🔙', legs_core: '🦵', cardio: '❤️',
    shoulders_arms: '🤲', full_body: '🏃', hiit: '⚡', baduanjin: '🧘',
    wuqinxi: '🦌', taiji: '☯️', zhanzhuang: '🧍', jingluo: '👋',
    yoga: '🧘‍♀️', walking: '🚶',
  };
  return PART_ICONS[sportKey] ?? '🏋️';
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
