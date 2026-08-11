// ─── Review types ──────────────────────────────────────────────
import type { Syncable, HabitStatus } from './shared';

/** 未完成原因统计 */
export interface IncompleteReasonStat {
  code: string;           // 原因代码 (time/health/external/mood/forgot/other)
  icon: string;           // 图标
  count: number;          // 次数
  percentage: number;     // 占比 0-100
}

/** 未完成项统计 */
export interface IncompleteItemStat {
  id?: string;            // 唯一标识（用于 key）
  type: 'practice' | 'habit' | 'planItem';  // 类型
  name: string;           // 名称
  count: number;          // 未完成次数
}

/** 习惯进度统计 */
export interface HabitProgressStat {
  id: string;             // 习惯ID
  name: string;           // 习惯名称
  doneDays: number;       // 完成天数
  targetDays: number;     // 目标天数
  progress: number;       // 进度 0-100
  streak: number;         // 连续天数
  status: HabitStatus;    // 状态
}

/** 计划进度统计 */
export interface PlanProgressStat {
  planId: string;         // 计划ID
  planName: string;       // 计划名称
  totalItems: number;     // 总任务数
  completedItems: number; // 已完成任务数
  progress: number;       // 进度 0-100
}

/** 复盘指标 */
export interface ReviewMetrics {
  avgWeight?: number;         // 平均体重 (kg)
  weightChange?: number;      // 体重变化 (kg)
  avgWater?: number;          // 平均饮水 (ml)
  avgCalories?: number;       // 平均热量 (kcal)
  totalExerciseMin?: number;  // 总运动时长 (分钟)
  totalExerciseKm?: number;   // 总运动距离 (km)
  totalMeditationMin?: number;// 总冥想时长 (分钟)
  fastingCount?: number;      // 禁食次数
  fastingHours?: number;      // 禁食时长 (小时)
  graceCount?: number;        // 宽限次数
}

/** 复盘对比 */
export interface ReviewComparison {
  completionRateDiff: number; // 完成率变化 (%)
  streakDiff: number;         // 连续天数变化
  weightDiff?: number;        // 体重变化 (kg)
  waterDiff?: number;         // 饮水变化 (ml)
  caloriesDiff?: number;      // 热量变化 (kcal)
  exerciseMinDiff?: number;   // 运动时长变化 (分钟)
}

/** 打卡复盘记录 */
export interface CheckinReview extends Syncable {
  id: string;
  period: 'week' | 'month';   // 复盘周期
  startDate: string;           // 开始日期 YYYY-MM-DD
  endDate: string;             // 结束日期 YYYY-MM-DD
  
  // 核心指标
  completionRate: number;      // 完成率 0-100
  doneDays: number;            // 完成天数
  totalDays: number;           // 总天数
  streakDays: number;          // 当前连续天数
  longestStreak: number;       // 本期最长连续天数
  
  // 未完成分析
  incompleteReasons: IncompleteReasonStat[];
  incompleteItems: IncompleteItemStat[];
  
  // 习惯养成
  habitProgress: HabitProgressStat[];
  
  // 计划任务
  planProgress: PlanProgressStat[];
  
  // 各项指标
  metrics: ReviewMetrics;
  
  // 对比上期
  comparison: ReviewComparison;
  
  // AI生成
  aiSummary: string;           // AI生成的总结文案
  highlights: string[];        // 亮点
  improvements: string[];      // 改进建议
  
  // 元数据
  userId?: string;              // 用户 ID（同步时填充）
  generatedAt: number;         // 生成时间戳
  aiModel?: string;            // 使用的AI模型
  lastAutoUpdateAt?: string;   // 上次自动更新时间 YYYY-MM-DD
}
