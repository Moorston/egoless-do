import {COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, computePlanProgress, countItemDoneDays, computeItemProgress, createLogger, dateStr , FONT_LABEL, FONT_STAT_SECTION} from '@egoless-do/core';
import type { CheckinReview } from '@egoless-do/core';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';

const log = createLogger('Home');
import { useRootNavigation } from '../../../navigation/hooks';

import {
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Target,
  Calendar, BarChart3, RefreshCw, ClipboardList
} from 'lucide-react-native';

interface ReviewViewProps {
  period: 'week' | 'month';
}

export default function ReviewView({ period }: ReviewViewProps) {
  const TH = useTheme();
  const T = useT();
  const { generateReview, checkinReviews, plans, planItems, planItemCheckins } = useShallowStore(s => ({
    generateReview: s.generateReview,
    checkinReviews: s.checkinReviews,
    plans: s.plans,
    planItems: s.planItems,
    planItemCheckins: s.planItemCheckins,
  }));
  const nav = useRootNavigation();

  const styles = useMemo(() => createStyles(TH), [TH]);

  const [review, setReview] = useState<CheckinReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    generateReview(period).then(result => {
      if (!cancelled) setReview(result);
    }).catch(error => {
      if (!cancelled) log.error(error, { message: 'Failed to generate review' });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [period, generateReview]);

  const loadReview = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const result = await generateReview(period);
      if (mountedRef.current) setReview(result);
    } catch (error) {
      log.error(error, { message: 'Failed to generate review' });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    try {
      const result = await generateReview(period);
      if (mountedRef.current) setReview(result);
    } catch (error) {
      log.error(error, { message: 'Failed to refresh review' });
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  const renderIncompleteReasonItem = useCallback(({ item: r }: { item: { icon: string; code: string; count: number; percentage: number } }) => (
    <View style={styles.reasonRow}>
      <Text style={styles.bodyText}>
        {r.icon} {T(`incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}`)}
      </Text>
      <Text style={styles.reasonCount}>
        {String(r.count)} {T('reviewTimes')} ({String(r.percentage)}%)
      </Text>
    </View>
  ), [styles, TH, T]);

  const renderIncompleteItem = useCallback(({ item }: { item: { name: string; count: number } }) => (
    <View style={styles.reasonRow}>
      <Text style={styles.bodyText}>
        {item.name}
      </Text>
      <Text style={styles.incompleteItemCount}>
        {String(item.count)} {T('reviewTimes')}
      </Text>
    </View>
  ), [styles, TH, T]);

  const renderHabitItem = useCallback(({ item: habit }: { item: { name: string; progress: number; streak: number } }) => (
    <View style={styles.habitContainer}>
      <View style={styles.habitHeaderRow}>
        <Text style={styles.bodyText}>{habit.name}</Text>
        <Text style={styles.habitProgressPercent}>
          {habit.progress}%
        </Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, {
          width: `${habit.progress}%`,
          backgroundColor: habit.progress >= 80 ? COLORS.GREEN : habit.progress >= 60 ? '#F59E0B' : COLORS.RED,
        }]} />
      </View>

      <View style={styles.habitMetaRow}>
        <Text style={styles.subText}>
          {String(habit.doneDays)}/{String(habit.targetDays)} {T('days')}
        </Text>
        <Text style={styles.subText}>
          {T('reviewStreak')}: {String(habit.streak)} {T('days')}
        </Text>
      </View>
    </View>
  ), [styles, TH, T]);

  const renderHistoryReviewItem = useCallback(({ item: r }: { item: { id: string; startDate: string; endDate: string; createdAt: number } }) => (
    <TouchableOpacity
      onPress={() => nav.navigate('ReviewDetail', { reviewId: r.id })}
      style={styles.historyRow}
    >
      <View>
        <Text style={styles.bodyText}>
          {r.startDate} - {r.endDate}
        </Text>
        <Text style={styles.historySub}>
          {T('reviewCompletionRate')}: {r.completionRate}%
        </Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.habitProgressPercent}>
          {String(r.streakDays)} {T('days')}
        </Text>
        <Text style={styles.subText}>{T('reviewStreak')}</Text>
      </View>
    </TouchableOpacity>
  ), [styles, TH, T, nav]);

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
      <View style={styles.metricsRow}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {m.value}
            </Text>
            <Text style={styles.metricLabel}>
              {m.label}
            </Text>
            <Text style={styles.metricSubLabel}>
              {m.subLabel}
            </Text>
            {m.trend !== 0 && (
              <View style={styles.trendRow}>
                {m.trend > 0 ? (
                  <TrendingUp size={14} color={COLORS.GREEN} />
                ) : (
                  <TrendingDown size={14} color={COLORS.RED} />
                )}
                <Text style={[styles.trendText, { color: m.trend > 0 ? COLORS.GREEN : COLORS.RED }]}>
                  {m.trend > 0 ? '+' : ''}{m.trend}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderIncompleteAnalysis = () => {
    if (!review || review.incompleteReasons.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>
            {T('reviewIncompleteAnalysis')}
          </Text>
        </View>

        <Text style={styles.sectionSubtitle}>
          {T('reviewReasonDistribution')}
        </Text>
        <FlatList
          data={review.incompleteReasons}
          renderItem={renderIncompleteReasonItem}
          keyExtractor={(item, index) => item.code ?? String(index)}
          removeClippedSubviews={true}
          scrollEnabled={false}
        />

        {review.incompleteItems.length > 0 && (
          <>
            <Text style={styles.incompleteItemsHeader}>
              {T('reviewIncompleteItems')}
            </Text>
            <FlatList
              data={review.incompleteItems}
              renderItem={renderIncompleteItem}
              keyExtractor={(item, index) => item.id ?? String(index)}
              removeClippedSubviews={true}
              scrollEnabled={false}
            />
          </>
        )}
      </View>
    );
  };

  const renderHabitProgress = () => {
    if (!review || review.habitProgress.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <CheckCircle size={18} color={COLORS.GREEN} />
          <Text style={styles.sectionTitle}>
            {T('reviewHabitProgress')}
          </Text>
        </View>

        <FlatList
          data={review.habitProgress}
          renderItem={renderHabitItem}
          keyExtractor={(habit) => habit.id}
          removeClippedSubviews={true}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderPlanProgress = () => {
    const allPlans = (plans ?? []).filter(p => !p.deleted);
    if (!review || allPlans.length === 0) return null;

    const allPlanItems = (planItems ?? []).filter(i => !i.deleted);
    const checkins = (planItemCheckins ?? []).filter(c => !c.deleted);
    const today = dateStr();

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Target size={18} color={TH.primary} />
          <Text style={styles.sectionTitle}>
            {T('reviewPlanProgress')}
          </Text>
        </View>

        {allPlans.map((plan, pi) => {
          const items = allPlanItems.filter(i => i.planId === plan.id);
          const pct = computePlanProgress(plan);
          const done = items.filter(i => i.status === 'completed').length;

          return (
            <View key={plan.id} style={[styles.planContainer, { marginBottom: pi < allPlans.length - 1 ? 16 : 0 }]}>
              {/* Plan header */}
              <View style={styles.planHeaderRow}>
                <ClipboardList size={14} color={TH.primary} />
                <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                <Text style={styles.subText}>{done}/{items.length}</Text>
                <View style={styles.planProgressTrack}>
                  <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.planProgressPercent}>{pct}%</Text>
              </View>

              {/* Task items */}
              {items.length > 0 && (
                <View style={styles.taskItemsContainer}>
                  {items.map((item, idx) => {
                    const { doneCount, expectedDays } = countItemDoneDays(item, checkins, today);
                    const progress = computeItemProgress(item, checkins, today);
                    const isLast = idx === items.length - 1;

                    return (
                      <View key={item.id} style={styles.taskItemRow}>
                        <View style={styles.timelineColumn}>
                          <View style={[styles.timelineConnector, { bottom: isLast ? '50%' : 0 }]} />
                          <View style={[styles.timelineDot, { backgroundColor: item.status === 'completed' ? TH.primary : TH.border }]} />
                        </View>
                        <View style={styles.taskContentRow}>
                          <Text style={styles.subText}>&middot;</Text>
                          <Text style={[
                            styles.timelineTaskName,
                            item.status === 'completed' ? styles.timelineTaskDone : styles.timelineTaskActive,
                          ]} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.subText}>{doneCount}/{expectedDays}</Text>
                          <View style={styles.timelineProgressTrack}>
                            <View style={[styles.planProgressFill, {
                              backgroundColor: item.status === 'completed' ? TH.primary : COLORS.GREEN,
                              width: `${progress}%`,
                            }]} />
                          </View>
                          <Text style={styles.planProgressPercent}>{progress}%</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderHealthMetrics = () => {
    if (!review) return null;

    const metrics = [];

    if (review.metrics.avgWeight !== undefined) {
      metrics.push({
        icon: '⚖️',
        label: T('reviewWeight'),
        value: `${String(review.metrics.avgWeight)}kg`,
        change: review.comparison.weightDiff,
        unit: 'kg',
      });
    }

    if (review.metrics.avgWater !== undefined) {
      metrics.push({
        icon: '💧',
        label: T('reviewWater'),
        value: `${String(review.metrics.avgWater)}ml`,
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
        value: `${String(review.metrics.totalExerciseMin)}min`,
        change: review.comparison.exerciseMinDiff,
        unit: 'min',
      });
    }

    if (review.metrics.totalMeditationMin !== undefined) {
      metrics.push({
        icon: '🧘',
        label: T('reviewMeditation'),
        value: `${String(review.metrics.totalMeditationMin)}min`,
        change: undefined,
        unit: 'min',
      });
    }

    if (review.metrics.fastingCount !== undefined) {
      metrics.push({
        icon: '🔥',
        label: T('reviewFasting'),
        value: `${String(review.metrics.fastingCount)}${T('reviewTimes')}`,
        change: undefined,
        unit: '',
      });
    }

    if (metrics.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={18} color={TH.text} />
          <Text style={styles.sectionTitle}>
            {T('reviewHealthMetrics')}
          </Text>
        </View>

        <View style={styles.healthMetricsGrid}>
          {metrics.map((m, i) => (
            <View key={i} style={styles.healthMetricCard}>
              <View style={styles.healthMetricHeader}>
                <Text style={styles.healthMetricIcon}>{m.icon}</Text>
                <Text style={styles.subText}>{m.label}</Text>
              </View>
              <Text style={styles.healthMetricValue}>
                {m.value}
              </Text>
              {m.change !== undefined && m.change !== 0 && (
                <View style={styles.trendRow}>
                  {m.change > 0 ? (
                    <TrendingUp size={12} color={COLORS.GREEN} />
                  ) : (
                    <TrendingDown size={12} color={COLORS.RED} />
                  )}
                  <Text style={[styles.trendText, { color: m.change > 0 ? COLORS.GREEN : COLORS.RED }]}>
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

  const renderAIAnalysis = () => {
    if (!review || !review.aiSummary) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.aiBulbIcon}>💡</Text>
          <Text style={styles.sectionTitle}>
            {T('reviewAIAnalysis')}
          </Text>
        </View>

        <Text style={styles.aiSummaryText}>
          {review.aiSummary}
        </Text>

        {review.highlights.length > 0 && (
          <View style={styles.highlightSection}>
            <Text style={styles.highlightTitle}>
              ✨ {T('reviewHighlights')}
            </Text>
            {review.highlights.map((h, i) => (
              <View key={i} style={styles.listItemRow}>
                <Text style={styles.highlightBullet}>&bull;</Text>
                <Text style={styles.bodyTextFlex}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {review.improvements.length > 0 && (
          <View>
            <Text style={styles.improvementTitle}>
              💪 {T('reviewImprovements')}
            </Text>
            {review.improvements.map((imp, i) => (
              <View key={i} style={styles.listItemRow}>
                <Text style={styles.improvementBullet}>&bull;</Text>
                <Text style={styles.bodyTextFlex}>{imp}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderHistoryEntry = () => {
    const historyReviews = checkinReviews
      ?.filter(r => r.period === period && r.deleted !== true)
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, 3) ?? [];

    if (historyReviews.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <View style={styles.historyHeader}>
          <View style={styles.sectionHeaderInline}>
            <Calendar size={18} color={TH.text} />
            <Text style={styles.sectionTitle}>
              {T('reviewHistory')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('ReviewHistory')}>
            <Text style={styles.viewAllLink}>{T('reviewViewAll')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={historyReviews}
          renderItem={renderHistoryReviewItem}
          keyExtractor={(r) => r.id}
          removeClippedSubviews={true}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.emptyState}>
        <RefreshCw size={32} color={TH.primary} />
        <Text style={styles.emptyStateText}>
          {T('reviewGenerating')}
        </Text>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.subText}>
          {T('reviewNoData')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={staticStyles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.reviewTitleSection}>
        <Text style={styles.reviewTitle}>
          {period === 'week' ? T('reviewWeekTitle') : T('reviewMonthTitle')}
        </Text>
        <Text style={styles.reviewDateRange}>
          {review.startDate} - {review.endDate}
        </Text>
      </View>

      {renderCoreMetrics()}
      {renderIncompleteAnalysis()}
      {renderHabitProgress()}
      {renderPlanProgress()}
      {renderHealthMetrics()}
      {renderAIAnalysis()}
      {renderHistoryEntry()}
    </ScrollView>
  );
}

const staticStyles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  redBold: { fontWeight: '600', color: COLORS.RED },
  greenBold: { fontWeight: '600', color: COLORS.GREEN },
});

const createStyles = (TH: ReturnType<typeof useTheme>) => StyleSheet.create({
  // Reason row
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: TH.border,
  },
  reasonCount: { fontSize: FONT_BODY(), fontWeight: '600', color: TH.primary },
  incompleteItemCount: { fontSize: FONT_BODY(), ...staticStyles.redBold },

  // Habit item
  habitContainer: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border },
  habitHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  habitProgressPercent: { fontSize: FONT_BODY(), color: TH.primary, fontWeight: '600' },
  progressBarTrack: { height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: TH.primary, borderRadius: 3 },
  habitMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

  // History review item
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TH.border,
  },
  historySub: { fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Core metrics
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricCard: {
    flex: 1, backgroundColor: TH.card, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: TH.border,
  },
  metricValue: { fontSize: FONT_STAT_SECTION(), fontWeight: '700', color: TH.primary },
  metricLabel: { fontSize: FONT_BODY(), color: TH.text, marginTop: 4 },
  metricSubLabel: { fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trendText: { fontSize: FONT_SUB(), marginLeft: 4 },

  // Section card (shared)
  sectionCard: {
    backgroundColor: TH.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: TH.border, marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionHeaderInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: FONT_BODY(), fontWeight: '600', color: TH.text },
  sectionSubtitle: { fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 },
  incompleteItemsHeader: { fontSize: FONT_SUB(), color: TH.sub, marginTop: 12, marginBottom: 8 },

  // Text
  bodyText: { fontSize: FONT_BODY(), color: TH.text },
  bodyTextFlex: { fontSize: FONT_BODY(), color: TH.text, flex: 1 },
  subText: { fontSize: FONT_SUB(), color: TH.sub },

  // Plan progress
  planContainer: {},
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planName: { flex: 1, fontSize: FONT_BODY(), fontWeight: '600', color: TH.text },
  planProgressTrack: { width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' },
  planProgressFill: { height: 4, borderRadius: 2 },
  planProgressPercent: { fontSize: FONT_SUB(), color: TH.sub, width: 36, textAlign: 'right' },
  taskItemsContainer: { marginLeft: 8 },
  taskItemRow: { flexDirection: 'row' },
  timelineColumn: { width: 20, alignItems: 'center' },
  timelineConnector: { position: 'absolute', top: 0, width: 1, backgroundColor: TH.border },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, zIndex: 1 },
  taskContentRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  timelineTaskName: { flex: 1, fontSize: FONT_SUB() },
  timelineTaskDone: { color: TH.sub, textDecorationLine: 'line-through' },
  timelineTaskActive: { color: TH.text, textDecorationLine: 'none' },
  timelineProgressTrack: { width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' },

  // Health metrics
  healthMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthMetricCard: {
    width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: TH.border,
  },
  healthMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  healthMetricIcon: { fontSize: FONT_LABEL() },
  healthMetricValue: { fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text },

  // AI analysis
  aiBulbIcon: { fontSize: FONT_TITLE() },
  aiSummaryText: { fontSize: FONT_BODY(), color: TH.text, lineHeight: 24, marginBottom: 12 },
  highlightSection: { marginBottom: 12 },
  highlightTitle: { fontSize: FONT_SUB(), ...staticStyles.greenBold, marginBottom: 6 },
  listItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  highlightBullet: { fontSize: FONT_BODY(), ...staticStyles.greenBold, marginRight: 6 },
  improvementTitle: { fontSize: FONT_SUB(), color: '#F59E0B', fontWeight: '600', marginBottom: 6 },
  improvementBullet: { fontSize: FONT_BODY(), color: '#F59E0B', marginRight: 6 },

  // History entry
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  viewAllLink: { fontSize: FONT_SUB(), color: TH.primary },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyStateText: { fontSize: FONT_BODY(), color: TH.sub, marginTop: 12 },
  emptyStateSpinner: { marginTop: 0 },

  // Review title section
  reviewTitleSection: { marginBottom: 16 },
  reviewTitle: { fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text },
  reviewDateRange: { fontSize: FONT_SUB(), color: TH.sub, marginTop: 4 },
});
