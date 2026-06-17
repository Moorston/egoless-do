// ─── Review Slice ──────────────────────────────────────────────
import type { CheckinReview } from '../types';
import type { StorageAdapter, ReviewSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { calculateReviewData, getWeekRange, getMonthRange } from '../business/review';
import { getAIService, resetAIService } from '../ai/ai-service';

export function createReviewSlice(
  adapter: StorageAdapter,
  triggerAutoSync?: () => void,
): SliceCreator<ReviewSlice> {
  return (set: any, get: any) => ({
    checkinReviews: [],
    
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
      
      // 生成AI文案 - 使用最新的配置
      const aiModels = state.aiModels ?? [];
      const aiMode = state.aiMode ?? 'hybrid';
      
      console.log('[Review Slice] AI Models from store:', aiModels.length);
      console.log('[Review Slice] AI Mode:', aiMode);
      
      // 重置AIService单例以使用最新配置
      resetAIService();
      const aiService = getAIService({ mode: aiMode, models: aiModels });
      
      const aiResult = await aiService.generateCheckinReview(reviewData, {
        useCloud: true,
      });
      
      // 构建完整复盘记录
      const review: CheckinReview = {
        id: existingReview?.id ?? `review-${period}-${range.start}`,
        ...reviewData,
        aiSummary: aiResult.summary,
        highlights: aiResult.highlights,
        improvements: aiResult.improvements,
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
      
      // 持久化
      await adapter.persistChange('checkinReview', review.id, review);
      
      // 触发同步
      triggerAutoSync?.();
      
      return review;
    },
    
    getReview(period: 'week' | 'month', startDate: string): CheckinReview | undefined {
      return get().checkinReviews.find(
        r => r.period === period && r.startDate === startDate && r.deleted !== true
      );
    },
    
    getLatestReview(period: 'week' | 'month'): CheckinReview | undefined {
      return get().checkinReviews
        .filter(r => r.period === period && r.deleted !== true)
        .sort((a, b) => b.generatedAt - a.generatedAt)[0];
    },
    
    deleteReview(id: string) {
      set(state => ({
        checkinReviews: state.checkinReviews.map(r =>
          r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r
        ),
      }));
      
      adapter.markDeleted('checkinReview', id);
      triggerAutoSync?.();
    },
    
    clearAllReviews() {
      const reviews = get().checkinReviews ?? [];
      
      // Mark all reviews as deleted
      set({
        checkinReviews: reviews.map(r => ({
          ...r,
          deleted: true,
          updatedAt: Date.now(),
        })),
      });
      
      // Persist deletions
      for (const review of reviews) {
        adapter.markDeleted('checkinReview', review.id).catch(console.error);
      }
      
      triggerAutoSync?.();
    },
  });
}
