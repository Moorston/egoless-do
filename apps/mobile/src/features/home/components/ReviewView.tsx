import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, useT } from '../../../components/UI';
import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, computePlanProgress, countItemDoneDays, computeItemProgress, createLogger, dateStr } from '@egoless-do/core';
import type { CheckinReview } from '@egoless-do/core';

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
  const { generateReview, checkinReviews, plans, planItems, planItemCheckins } = useAppStore(useShallow(s => ({
    generateReview: s.generateReview,
    checkinReviews: s.checkinReviews,
    plans: s.plans,
    planItems: s.planItems,
    planItemCheckins: s.planItemCheckins,
  })));
  const nav = useRootNavigation();
  
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

        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>
          {T('reviewReasonDistribution')}
        </Text>
        <FlatList
          data={review.incompleteReasons}
          renderItem={({ item: r }) => (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: TH.border,
            }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.text }}>
                {r.icon} {T(`incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}`)}
              </Text>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.primary }}>
                {r.count} {T('reviewTimes')} ({r.percentage}%)
              </Text>
            </View>
          )}
          keyExtractor={(item, index) => item.code ?? String(index)}
          removeClippedSubviews={true}
          scrollEnabled={false}
        />

        {review.incompleteItems.length > 0 && (
          <>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 12, marginBottom: 8 }}>
              {T('reviewIncompleteItems')}
            </Text>
            <FlatList
              data={review.incompleteItems}
              renderItem={({ item }) => (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: TH.border,
                }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: COLORS.RED }}>
                    {item.count} {T('reviewTimes')}
                  </Text>
                </View>
              )}
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

        <FlatList
          data={review.habitProgress}
          renderItem={({ item: habit }) => (
            <View style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: TH.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{habit.name}</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.primary, fontWeight: '600' }}>
                  {habit.progress}%
                </Text>
              </View>

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
          )}
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

        {allPlans.map((plan, pi) => {
          const items = allPlanItems.filter(i => i.planId === plan.id);
          const pct = computePlanProgress(plan);
          const done = items.filter(i => i.status === 'completed').length;

          return (
            <View key={plan.id} style={{
              marginBottom: pi < allPlans.length - 1 ? 16 : 0,
            }}>
              {/* Plan header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ClipboardList size={14} color={TH.primary} />
                <Text style={{ flex: 1, fontSize: FONT_BODY, fontWeight: '600', color: TH.text }} numberOfLines={1}>{plan.name}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{done}/{items.length}</Text>
                <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 4, backgroundColor: TH.primary, borderRadius: 2, width: `${pct}%` }} />
                </View>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{pct}%</Text>
              </View>

              {/* Task items */}
              {items.length > 0 && (
                <View style={{ marginLeft: 8 }}>
                  {items.map((item, idx) => {
                    const { doneCount, expectedDays } = countItemDoneDays(item, checkins, today);
                    const progress = computeItemProgress(item, checkins, today);
                    const isLast = idx === items.length - 1;

                    return (
                      <View key={item.id} style={{ flexDirection: 'row' }}>
                        <View style={{ width: 20, alignItems: 'center' }}>
                          <View style={{ position: 'absolute', top: 0, bottom: isLast ? '50%' : 0, width: 1, backgroundColor: TH.border }} />
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === 'completed' ? TH.primary : TH.border, marginTop: 8, zIndex: 1 }} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>·</Text>
                          <Text style={{ flex: 1, fontSize: FONT_SUB, color: item.status === 'completed' ? TH.sub : TH.text, textDecorationLine: item.status === 'completed' ? 'line-through' : 'none' }} numberOfLines={1}>{item.name}</Text>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{doneCount}/{expectedDays}</Text>
                          <View style={{ width: 60, height: 4, backgroundColor: TH.border, borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ height: 4, backgroundColor: item.status === 'completed' ? TH.primary : COLORS.GREEN, borderRadius: 2, width: `${progress}%` }} />
                          </View>
                          <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 36, textAlign: 'right' }}>{progress}%</Text>
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
        value: `${review.metrics.fastingCount}${T('reviewTimes')}`,
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
        
        <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 24, marginBottom: 12 }}>
          {review.aiSummary}
        </Text>
        
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
  
  const renderHistoryEntry = () => {
    const historyReviews = checkinReviews
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
        
        <FlatList
          data={historyReviews}
          renderItem={({ item: r }) => (
            <TouchableOpacity
              onPress={() => nav.navigate('ReviewDetail', { reviewId: r.id })}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: 1,
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
          )}
          keyExtractor={(r) => r.id}
          removeClippedSubviews={true}
          scrollEnabled={false}
        />
      </View>
    );
  };
  
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
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
          {period === 'week' ? T('reviewWeekTitle') : T('reviewMonthTitle')}
        </Text>
        <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
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
