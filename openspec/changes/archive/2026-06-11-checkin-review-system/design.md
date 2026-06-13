# 打卡复盘系统设计文档

## 概述

本文档描述打卡复盘系统的详细设计，包括数据模型、分析引擎、UI组件和同步机制。

## 1. 数据模型

### 1.1 CheckinReview 接口

```typescript
// packages/core/src/types/review.ts

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
  generatedAt: number;         // 生成时间戳
  aiModel?: string;            // 使用的AI模型
  lastAutoUpdateAt?: number;   // 上次自动更新时间
}
```

## 2. 分析引擎

### 2.1 核心函数

```typescript
// packages/core/src/business/review.ts

/**
 * 计算复盘数据（纯函数）
 * @param period 复盘周期
 * @param targetDate 目标日期（本周/本月的任意一天）
 * @param checkinHistory 打卡历史
 * @param habits 习惯列表
 * @param plans 计划列表
 * @param planItems 计划任务列表
 * @param foodLog 饮食记录
 * @param exerciseLog 运动记录
 * @param fastingHistory 禁食记录
 * @param medHistory 冥想记录
 * @param graceHistory 宽限记录
 * @param previousReview 上一期复盘（用于对比）
 * @returns 复盘数据（不含AI生成内容）
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
  // 实现细节...
}

/**
 * 计算周起止日期（周一到周日）
 * @param date 日期
 * @returns { start: string, end: string }
 */
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

/**
 * 计算月起止日期
 * @param date 日期
 * @returns { start: string, end: string }
 */
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

/**
 * 构建AI提示词
 * @param reviewData 复盘数据
 * @returns 提示词字符串
 */
export function buildReviewPrompt(
  reviewData: Omit<CheckinReview, 'id' | 'updatedAt' | 'deleted' | 'aiSummary' | 'highlights' | 'improvements'>
): string {
  // 构建提示词...
}

/**
 * 解析AI响应
 * @param aiResponse AI响应文本
 * @returns 解析后的结构化数据
 */
export function parseReviewAIResponse(
  aiResponse: string
): { summary: string; highlights: string[]; improvements: string[] } {
  // 解析逻辑...
}
```

## 3. Store层

### 3.1 ReviewSlice

```typescript
// packages/core/src/store/createReviewSlice.ts

import type { CheckinReview } from '../types';
import type { StorageAdapter, ReviewSlice } from './types';
import { calculateReviewData, getWeekRange, getMonthRange } from '../business/review';
import { getAIService } from '../ai/ai-service';

export function createReviewSlice(
  adapter: StorageAdapter,
  triggerAutoSync?: () => void,
): SliceCreator<ReviewSlice> {
  return (set, get) => ({
    checkinReviews: [],
    
    /**
     * 生成复盘
     * @param period 复盘周期
     * @returns 生成的复盘记录
     */
    async generateReview(period: 'week' | 'month'): Promise<CheckinReview> {
      const state = get();
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      
      // 计算日期范围
      const range = period === 'week' 
        ? getWeekRange(today)
        : getMonthRange(today);
      
      // 检查是否已有本周/本月复盘
      const existingReview = state.checkinReviews.find(
        r => r.period === period && r.startDate === range.start && r.deleted !== true
      );
      
      // 如果已有今天的复盘，直接返回
      if (existingReview && existingReview.lastAutoUpdateAt === todayStr) {
        return existingReview;
      }
      
      // 计算复盘数据
      const reviewData = calculateReviewData(
        period,
        todayStr,
        state.checkinHistory ?? [],
        state.habits ?? [],
        state.plans ?? [],
        state.planItems ?? [],
        state.foodLog ?? [],
        state.exerciseLog ?? [],
        state.fastingHistory ?? [],
        state.medHistory ?? [],
        state.graceHistory ?? [],
        existingReview, // 用于对比
      );
      
      // 生成AI文案
      const aiService = getAIService();
      const prompt = buildReviewPrompt(reviewData);
      const aiResponse = await aiService.generateCloud(prompt, {
        systemPrompt: '你是一位专业的个人成长分析师，同时具备温暖的鼓励能力。你的分析基于数据，既有专业深度，又能给予建设性的鼓励。',
      });
      
      let aiSummary = '';
      let highlights: string[] = [];
      let improvements: string[] = [];
      
      if (aiResponse.success && aiResponse.data) {
        const parsed = parseReviewAIResponse(aiResponse.data);
        aiSummary = parsed.summary;
        highlights = parsed.highlights;
        improvements = parsed.improvements;
      }
      
      // 构建完整复盘记录
      const review: CheckinReview = {
        id: existingReview?.id ?? `review-${period}-${range.start}`,
        ...reviewData,
        aiSummary,
        highlights,
        improvements,
        updatedAt: Date.now(),
        deleted: false,
        generatedAt: Date.now(),
        lastAutoUpdateAt: todayStr,
      };
      
      // 保存到Store
      set(state => ({
        checkinReviews: [
          review,
          ...state.checkinReviews.filter(r => r.id !== review.id),
        ],
      }));
      
      // 触发同步
      triggerAutoSync?.();
      
      return review;
    },
    
    /**
     * 获取复盘
     * @param period 复盘周期
     * @param startDate 开始日期
     * @returns 复盘记录或undefined
     */
    getReview(period: 'week' | 'month', startDate: string): CheckinReview | undefined {
      return get().checkinReviews.find(
        r => r.period === period && r.startDate === startDate && r.deleted !== true
      );
    },
    
    /**
     * 获取最新复盘
     * @param period 复盘周期
     * @returns 最新复盘记录或undefined
     */
    getLatestReview(period: 'week' | 'month'): CheckinReview | undefined {
      return get().checkinReviews
        .filter(r => r.period === period && r.deleted !== true)
        .sort((a, b) => b.generatedAt - a.generatedAt)[0];
    },
    
    /**
     * 删除复盘
     * @param id 复盘ID
     */
    deleteReview(id: string) {
      set(state => ({
        checkinReviews: state.checkinReviews.map(r =>
          r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r
        ),
      }));
      triggerAutoSync?.();
    },
  });
}
```

## 4. AI服务扩展

### 4.1 generateCheckinReview方法

```typescript
// packages/core/src/ai/ai-service.ts 中新增方法

/**
 * 生成打卡复盘AI文案
 * @param reviewData 复盘数据
 * @param options 选项
 * @returns AI生成的文案
 */
async generateCheckinReview(
  reviewData: Omit<CheckinReview, 'id' | 'updatedAt' | 'deleted' | 'aiSummary' | 'highlights' | 'improvements'>,
  options?: { useCloud?: boolean; preferredModelId?: string }
): Promise<{ summary: string; highlights: string[]; improvements: string[] }> {
  const defaultResult = {
    summary: '本周整体表现良好，继续保持。',
    highlights: ['坚持打卡'],
    improvements: ['继续保持'],
  };
  
  if (!options?.useCloud || this.config.mode === 'local') {
    return defaultResult;
  }
  
  const prompt = buildReviewPrompt(reviewData);
  
  const result = await this.generateCloud(prompt, {
    preferredModelId: options?.preferredModelId,
    systemPrompt: '你是一位专业的个人成长分析师，同时具备温暖的鼓励能力。你的分析基于数据，既有专业深度，又能给予建设性的鼓励。请用中文回答。',
  });
  
  if (result.success && result.data) {
    return parseReviewAIResponse(result.data);
  }
  
  return defaultResult;
}
```

## 5. UI组件

### 5.1 ReviewView组件

```typescript
// apps/mobile/src/features/home/ReviewView.tsx

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { CheckinReview } from '@egoless-do/core';
import { useRootNavigation } from '../../navigation/hooks';
import { 
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Target,
  Calendar, BarChart3, RefreshCw
} from 'lucide-react-native';

interface ReviewViewProps {
  period: 'week' | 'month';
}

export default function ReviewView({ period }: ReviewViewProps) {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useRootNavigation();
  
  const [review, setReview] = useState<CheckinReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 获取或生成复盘
  useEffect(() => {
    loadReview();
  }, [period]);
  
  const loadReview = async () => {
    setLoading(true);
    try {
      const result = await store.generateReview(period);
      setReview(result);
    } catch (error) {
      console.error('Failed to generate review:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await store.generateReview(period);
      setReview(result);
    } catch (error) {
      console.error('Failed to refresh review:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // 渲染核心指标
  const renderCoreMetrics = () => {
    if (!review) return null;
    
    const metrics = [
      {
        value: `${review.completionRate}%`,
        label: T('reviewCompletionRate'),
        subLabel: `${review.doneDays}/${review.totalDays} ${T('days')}`,
        trend: review.comparison.completionRateDiff,
      },
      {
        value: `${review.streakDays}`,
        label: T('reviewStreakDays'),
        subLabel: T('days'),
        trend: review.comparison.streakDiff,
      },
      {
        value: review.comparison.completionRateDiff >= 0 ? `+${review.comparison.completionRateDiff}%` : `${review.comparison.completionRateDiff}%`,
        label: T('reviewVsPrevious'),
        subLabel: period === 'week' ? T('reviewVsLastWeek') : T('reviewVsLastMonth'),
        trend: review.comparison.completionRateDiff,
      },
    ];
    
    return (
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <View key={i} style={{
            flex: 1, backgroundColor: TH.card, borderRadius: 14, padding: 16,
            alignItems: 'center', borderWidth: 1, borderColor: TH.border,
          }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: TH.primary }}>
              {m.value}
            </Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, marginTop: 4 }}>
              {m.label}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
              {m.subLabel}
            </Text>
            {m.trend !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                {m.trend > 0 ? (
                  <TrendingUp size={14} color={COLORS.GREEN} />
                ) : (
                  <TrendingDown size={14} color={COLORS.RED} />
                )}
                <Text style={{ 
                  fontSize: FONT_SUB, 
                  color: m.trend > 0 ? COLORS.GREEN : COLORS.RED,
                  marginLeft: 4,
                }}>
                  {m.trend > 0 ? '+' : ''}{m.trend}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };
  
  // 渲染未完成分析
  const renderIncompleteAnalysis = () => {
    if (!review || review.incompleteReasons.length === 0) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
            {T('reviewIncompleteAnalysis')}
          </Text>
        </View>
        
        {/* 原因分布 */}
        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
          {T('reviewReasonDistribution')}
        </Text>
        {review.incompleteReasons.map((r, i) => (
          <View key={i} style={{ 
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 6, borderBottomWidth: i < review.incompleteReasons.length - 1 ? 1 : 0,
            borderBottomColor: TH.border,
          }}>
            <Text style={{ fontSize: FONT_BODY, color: TH.text }}>
              {r.icon} {T(`incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}`)}
            </Text>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.primary }}>
              {r.count} {T('times')} ({r.percentage}%)
            </Text>
          </View>
        ))}
        
        {/* 未完成项 */}
        {review.incompleteItems.length > 0 && (
          <>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 12, marginBottom: 8 }}>
              {T('reviewIncompleteItems')}
            </Text>
            {review.incompleteItems.map((item, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 6, borderBottomWidth: i < review.incompleteItems.length - 1 ? 1 : 0,
                borderBottomColor: TH.border,
              }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: COLORS.RED }}>
                  {item.count} {T('times')}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };
  
  // 渲染习惯养成
  const renderHabitProgress = () => {
    if (!review || review.habitProgress.length === 0) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle size={18} color={COLORS.GREEN} />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
            {T('reviewHabitProgress')}
          </Text>
        </View>
        
        {review.habitProgress.map((habit, i) => (
          <View key={habit.id} style={{
            paddingVertical: 8,
            borderBottomWidth: i < review.habitProgress.length - 1 ? 1 : 0,
            borderBottomColor: TH.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{habit.name}</Text>
              <Text style={{ fontSize: FONT_BODY, color: TH.primary, fontWeight: '600' }}>
                {habit.progress}%
              </Text>
            </View>
            
            {/* 进度条 */}
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ 
                height: 6, 
                width: `${habit.progress}%`, 
                backgroundColor: habit.progress >= 80 ? COLORS.GREEN : habit.progress >= 60 ? '#F59E0B' : COLORS.RED,
                borderRadius: 3,
              }} />
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                {habit.doneDays}/{habit.targetDays} {T('days')}
              </Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                {T('reviewStreak')}: {habit.streak} {T('days')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };
  
  // 渲染计划任务
  const renderPlanProgress = () => {
    if (!review || review.planProgress.length === 0) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Target size={18} color={TH.primary} />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
            {T('reviewPlanProgress')}
          </Text>
        </View>
        
        {review.planProgress.map((plan, i) => (
          <View key={plan.planId} style={{
            paddingVertical: 8,
            borderBottomWidth: i < review.planProgress.length - 1 ? 1 : 0,
            borderBottomColor: TH.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{plan.planName}</Text>
              <Text style={{ fontSize: FONT_BODY, color: TH.primary, fontWeight: '600' }}>
                {plan.progress}%
              </Text>
            </View>
            
            {/* 进度条 */}
            <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ 
                height: 6, 
                width: `${plan.progress}%`, 
                backgroundColor: TH.primary,
                borderRadius: 3,
              }} />
            </View>
            
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
              {plan.completedItems}/{plan.totalItems} {T('reviewTasks')}
            </Text>
          </View>
        ))}
      </View>
    );
  };
  
  // 渲染健康指标
  const renderHealthMetrics = () => {
    if (!review) return null;
    
    const metrics = [];
    
    if (review.metrics.avgWeight !== undefined) {
      metrics.push({
        icon: '⚖️',
        label: T('reviewWeight'),
        value: `${review.metrics.avgWeight}kg`,
        change: review.comparison.weightDiff,
        unit: 'kg',
      });
    }
    
    if (review.metrics.avgWater !== undefined) {
      metrics.push({
        icon: '💧',
        label: T('reviewWater'),
        value: `${review.metrics.avgWater}ml`,
        change: review.comparison.waterDiff,
        unit: 'ml',
      });
    }
    
    if (review.metrics.avgCalories !== undefined) {
      metrics.push({
        icon: '🍽️',
        label: T('reviewCalories'),
        value: `${review.metrics.avgCalories}kcal`,
        change: review.comparison.caloriesDiff,
        unit: 'kcal',
      });
    }
    
    if (review.metrics.totalExerciseMin !== undefined) {
      metrics.push({
        icon: '🏃',
        label: T('reviewExercise'),
        value: `${review.metrics.totalExerciseMin}min`,
        change: review.comparison.exerciseMinDiff,
        unit: 'min',
      });
    }
    
    if (review.metrics.totalMeditationMin !== undefined) {
      metrics.push({
        icon: '🧘',
        label: T('reviewMeditation'),
        value: `${review.metrics.totalMeditationMin}min`,
        change: undefined,
        unit: 'min',
      });
    }
    
    if (review.metrics.fastingCount !== undefined) {
      metrics.push({
        icon: '🔥',
        label: T('reviewFasting'),
        value: `${review.metrics.fastingCount}${T('times')}`,
        change: undefined,
        unit: '',
      });
    }
    
    if (metrics.length === 0) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BarChart3 size={18} color={TH.text} />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
            {T('reviewHealthMetrics')}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {metrics.map((m, i) => (
            <View key={i} style={{
              width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: TH.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{m.label}</Text>
              </View>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
                {m.value}
              </Text>
              {m.change !== undefined && m.change !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  {m.change > 0 ? (
                    <TrendingUp size={12} color={COLORS.GREEN} />
                  ) : (
                    <TrendingDown size={12} color={COLORS.RED} />
                  )}
                  <Text style={{ 
                    fontSize: FONT_SUB, 
                    color: m.change > 0 ? COLORS.GREEN : COLORS.RED,
                    marginLeft: 4,
                  }}>
                    {m.change > 0 ? '+' : ''}{m.change}{m.unit}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // 渲染AI分析
  const renderAIAnalysis = () => {
    if (!review || !review.aiSummary) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
            {T('reviewAIAnalysis')}
          </Text>
        </View>
        
        {/* 总结 */}
        <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 24, marginBottom: 12 }}>
          {review.aiSummary}
        </Text>
        
        {/* 亮点 */}
        {review.highlights.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: FONT_SUB, color: COLORS.GREEN, fontWeight: '600', marginBottom: 6 }}>
              ✨ {T('reviewHighlights')}
            </Text>
            {review.highlights.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: FONT_BODY, color: COLORS.GREEN, marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.text, flex: 1 }}>{h}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* 改进建议 */}
        {review.improvements.length > 0 && (
          <View>
            <Text style={{ fontSize: FONT_SUB, color: '#F59E0B', fontWeight: '600', marginBottom: 6 }}>
              💪 {T('reviewImprovements')}
            </Text>
            {review.improvements.map((imp, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ fontSize: FONT_BODY, color: '#F59E0B', marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.text, flex: 1 }}>{imp}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  // 渲染历史复盘入口
  const renderHistoryEntry = () => {
    const historyReviews = store.checkinReviews
      ?.filter(r => r.period === period && r.deleted !== true)
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, 3) ?? [];
    
    if (historyReviews.length === 0) return null;
    
    return (
      <View style={{
        backgroundColor: TH.card, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: TH.border, marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color={TH.text} />
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
              {T('reviewHistory')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('ReviewHistory')}>
            <Text style={{ fontSize: FONT_SUB, color: TH.primary }}>{T('reviewViewAll')}</Text>
          </TouchableOpacity>
        </View>
        
        {historyReviews.map((r, i) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => nav.navigate('ReviewDetail', { reviewId: r.id })}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: i < historyReviews.length - 1 ? 1 : 0,
              borderBottomColor: TH.border,
            }}
          >
            <View>
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>
                {r.startDate} - {r.endDate}
              </Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>
                {T('reviewCompletionRate')}: {r.completionRate}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.primary, fontWeight: '600' }}>
                {r.streakDays} {T('days')}
              </Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('reviewStreak')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // 加载状态
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <RefreshCw size={32} color={TH.primary} />
        <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 12 }}>
          {T('reviewGenerating')}
        </Text>
      </View>
    );
  }
  
  // 无数据
  if (!review) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>
          {T('reviewNoData')}
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* 标题 */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
          {period === 'week' ? T('reviewWeekTitle') : T('reviewMonthTitle')}
        </Text>
        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
          {review.startDate} - {review.endDate}
        </Text>
      </View>
      
      {/* 核心指标 */}
      {renderCoreMetrics()}
      
      {/* 未完成分析 */}
      {renderIncompleteAnalysis()}
      
      {/* 习惯养成 */}
      {renderHabitProgress()}
      
      {/* 计划任务 */}
      {renderPlanProgress()}
      
      {/* 健康指标 */}
      {renderHealthMetrics()}
      
      {/* AI分析 */}
      {renderAIAnalysis()}
      
      {/* 历史复盘 */}
      {renderHistoryEntry()}
    </ScrollView>
  );
}
```

## 6. 自动触发逻辑

### 6.1 dailyReset扩展

```typescript
// packages/core/src/dailyReset.ts 中新增

/**
 * 检查并生成复盘
 * @param store 完整store
 */
export async function checkAndGenerateReviews(store: FullStore): Promise<void> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const dayOfMonth = today.getDate();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  // 周日生成上周复盘
  if (dayOfWeek === 0) {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    await store.generateReview('week');
  }
  
  // 月末生成本月复盘
  if (dayOfMonth === lastDayOfMonth) {
    await store.generateReview('month');
  }
}
```

## 7. 国际化

### 7.1 新增翻译键

```typescript
// packages/core/src/i18n/zh.ts 新增

// Review
reviewTitle: '复盘',
reviewWeekTitle: '周复盘',
reviewMonthTitle: '月复盘',
reviewCompletionRate: '完成率',
reviewStreakDays: '连续天数',
reviewVsPrevious: '对比上期',
reviewVsLastWeek: 'vs上周',
reviewVsLastMonth: 'vs上月',
reviewIncompleteAnalysis: '未完成分析',
reviewReasonDistribution: '原因分布',
reviewIncompleteItems: '未完成项',
reviewHabitProgress: '习惯养成',
reviewPlanProgress: '计划任务',
reviewHealthMetrics: '健康指标',
reviewWeight: '体重',
reviewWater: '饮水',
reviewCalories: '热量',
reviewExercise: '运动',
reviewMeditation: '冥想',
reviewFasting: '禁食',
reviewTasks: '任务',
reviewStreak: '连续',
reviewAIAnalysis: 'AI分析',
reviewHighlights: '亮点',
reviewImprovements: '改进建议',
reviewHistory: '历史复盘',
reviewViewAll: '查看全部',
reviewGenerating: '正在生成复盘...',
reviewNoData: '暂无复盘数据',
reviewRefresh: '刷新',
reviewTimes: '次',
```

## 8. 同步机制

### 8.1 PocketBase集合

```yaml
# 需要在PocketBase中创建 checkin_reviews 集合

collection: checkin_reviews
fields:
  - name: user_id
    type: relation
    required: true
    
  - name: period
    type: select
    options: ['week', 'month']
    required: true
    
  - name: start_date
    type: text
    required: true
    
  - name: end_date
    type: text
    required: true
    
  - name: review_data
    type: json
    required: true
    
  - name: updated_at
    type: number
    required: true
    
  - name: deleted
    type: bool
    default: false
```

## 9. 测试用例

### 9.1 单元测试

```typescript
// packages/core/src/business/review.test.ts

describe('review', () => {
  describe('getWeekRange', () => {
    it('should return Monday to Sunday for any day in the week', () => {
      // 测试逻辑...
    });
  });
  
  describe('getMonthRange', () => {
    it('should return first day to last day of month', () => {
      // 测试逻辑...
    });
  });
  
  describe('calculateReviewData', () => {
    it('should calculate completion rate correctly', () => {
      // 测试逻辑...
    });
    
    it('should calculate habit progress correctly', () => {
      // 测试逻辑...
    });
    
    it('should calculate comparison correctly', () => {
      // 测试逻辑...
    });
  });
  
  describe('buildReviewPrompt', () => {
    it('should build prompt with all data', () => {
      // 测试逻辑...
    });
  });
  
  describe('parseReviewAIResponse', () => {
    it('should parse summary correctly', () => {
      // 测试逻辑...
    });
    
    it('should parse highlights correctly', () => {
      // 测试逻辑...
    });
    
    it('should parse improvements correctly', () => {
      // 测试逻辑...
    });
  });
});
```

## 10. 性能优化

### 10.1 缓存策略

- 本周/本月复盘：每天最多自动更新一次
- 已结束的复盘：生成后不再自动更新
- 使用 `lastAutoUpdateAt` 字段判断是否需要更新

### 10.2 懒加载

- 复盘历史列表：分页加载
- AI生成：异步执行，不阻塞UI

### 10.3 错误处理

- AI生成失败：使用默认文案
- 数据计算错误：返回空数据，显示提示
