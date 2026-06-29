// ─── Review Slice ──────────────────────────────────────────────
import type { CheckinReview } from '../types';
import type { StorageAdapter, ReviewSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { calculateReviewData, getWeekRange, getMonthRange } from '../business/review';
import { getAIService } from '../ai/ai-service';
import { dateStr, activeOnly } from '../utils';
import { createLogger } from '../logger';
const log = createLogger('Store');

export function createReviewSlice(
  adapter: StorageAdapter,
  triggerAutoSync?: () => void,
): SliceCreator<ReviewSlice> {
  return (set, get) => ({
    checkinReviews: [],
    
    async generateReview(period: 'week' | 'month'): Promise<CheckinReview> {
      const state = get();
      const today = new Date();
      const todayStr = dateStr(today);
      
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
      
      log.info('[Review Slice] AI Models from store:', aiModels.length);
      log.info('[Review Slice] AI Mode:', aiMode);
      
      const aiService = getAIService({ mode: aiMode, models: aiModels });

      let aiResult: { summary: string; highlights: string[]; improvements: string[] };
      try {
        aiResult = await aiService.generateCheckinReview(reviewData, {
          useCloud: true,
        });
      } catch (e) {
        log.error(e, { context: 'AI call failed, using defaults' });
        aiResult = { summary: '', highlights: [], improvements: [] };
      }
      
      // Re-read checkinReviews after await to avoid stale-overwrite
      const reviewId = existingReview?.id ?? `review-${period}-${range.start}`;
      const latestReviews = get().checkinReviews ?? [];

      // 构建完整复盘记录
      const review: CheckinReview = {
        id: reviewId,
        ...reviewData,
        aiSummary: aiResult.summary,
        highlights: aiResult.highlights,
        improvements: aiResult.improvements,
        updatedAt: Date.now(),
        deleted: false,
        generatedAt: Date.now(),
        lastAutoUpdateAt: todayStr,
      };

      // 保存到Store — merge with latest list, not the stale capture
      set(state => ({
        checkinReviews: [
          review,
          ...latestReviews.filter(r => r.id !== review.id),
        ],
      }));
      
      // 持久化
      try {
        await adapter.persistChange('checkinReview', review.id, review);
      } catch (e) {
        log.error(e, { context: 'Failed to persist review' });
      }
      
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
      
      adapter.markDeleted('checkinReview', id).catch(e => log.error(e));
      triggerAutoSync?.();
    },
    
    clearAllReviews() {
      const reviews = get().checkinReviews ?? [];

      // Mark all non-deleted reviews as deleted
      set({
        checkinReviews: reviews.map(r =>
          r.deleted ? r : { ...r, deleted: true, updatedAt: Date.now() }
        ),
      });

      // Persist deletions only for those not already deleted
      const toDelete = activeOnly(reviews).map(r => ({ entity: 'checkinReview' as const, id: r.id }));
      if (toDelete.length > 0) {
        adapter.batchDelete(toDelete).catch(e => log.error(e));
      }
      
      triggerAutoSync?.();
    },
  });
}
