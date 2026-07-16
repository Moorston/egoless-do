import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE , FONT_STAT_SECTION } from '@egoless-do/core';
import type { CheckinReview } from '@egoless-do/core';
import { useRoute, RouteProp } from '@react-navigation/native';
import { 
  ChevronLeft, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Target,
  BarChart3
} from 'lucide-react-native';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useRootNavigation, type RootStackParamList } from '../../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


type DetailRoute = RouteProp<RootStackParamList, 'ReviewDetail'>;

export default function ReviewDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const { checkinReviews } = useShallowStore(s => ({
    checkinReviews: s.checkinReviews,
  }));
  const nav = useRootNavigation();
  const route = useRoute<DetailRoute>();
  const reviewId = route.params?.reviewId ?? '';

  const review = (checkinReviews ?? []).find((r: CheckinReview) => !r.deleted && r.id === reviewId);

  if (!review) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ChevronLeft size={24} color={TH.text} />
          </TouchableOpacity>
        </View>
        <Text style={{ textAlign: 'center', color: TH.sub, padding: 40, fontSize: FONT_SUB() }}>
          {T('reviewNoData')}
        </Text>
      </SafeAreaView>
    );
  }

  const periodLabel = review.period === 'week' ? T('reviewWeekTitle') : T('reviewMonthTitle');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>
          {periodLabel}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 日期范围 */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>
            {review.startDate} - {review.endDate}
          </Text>
        </View>

        {/* 核心指标 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={{
            flex: 1, backgroundColor: TH.card, borderRadius: 14, padding: 16,
            alignItems: 'center', borderWidth: 1, borderColor: TH.border,
          }}>
            <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '700', color: TH.primary }}>
              {review.completionRate}%
            </Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, marginTop: 4 }}>
              {T('reviewCompletionRate')}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>
              {String(review.doneDays)}/{String(review.totalDays)} {T('days')}
            </Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: TH.card, borderRadius: 14, padding: 16,
            alignItems: 'center', borderWidth: 1, borderColor: TH.border,
          }}>
            <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '700', color: TH.primary }}>
              {String(review.streakDays)}
            </Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, marginTop: 4 }}>
              {T('reviewStreakDays')}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 2 }}>
              {T('days')}
            </Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: TH.card, borderRadius: 14, padding: 16,
            alignItems: 'center', borderWidth: 1, borderColor: TH.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {review.comparison.completionRateDiff > 0 ? (
                <TrendingUp size={16} color={COLORS.GREEN} />
              ) : review.comparison.completionRateDiff < 0 ? (
                <TrendingDown size={16} color={COLORS.RED} />
              ) : null}
              <Text style={{ 
                fontSize: FONT_STAT_SECTION(), fontWeight: '700', 
                color: review.comparison.completionRateDiff > 0 ? COLORS.GREEN : 
                       review.comparison.completionRateDiff < 0 ? COLORS.RED : TH.text 
              }}>
                {review.comparison.completionRateDiff > 0 ? '+' : ''}{review.comparison.completionRateDiff}%
              </Text>
            </View>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, marginTop: 4 }}>
              {T('reviewVsPrevious')}
            </Text>
          </View>
        </View>

        {/* 未完成分析 */}
        {review.incompleteReasons.length > 0 && (
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: TH.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
                {T('reviewIncompleteAnalysis')}
              </Text>
            </View>
            {review.incompleteReasons.map((r, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 6, borderBottomWidth: i < review.incompleteReasons.length - 1 ? 1 : 0,
                borderBottomColor: TH.border,
              }}>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>
                  {r.icon} {r.code}
                </Text>
                <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.primary }}>
                  {r.count} {T('reviewTimes')} ({r.percentage}%)
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 习惯养成 */}
        {review.habitProgress.length > 0 && (
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: TH.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle size={18} color={COLORS.GREEN} />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
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
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{habit.name}</Text>
                  <Text style={{ fontSize: FONT_BODY(), color: TH.primary, fontWeight: '600' }}>
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
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>
                    {String(habit.doneDays)}/{String(habit.targetDays)} {T('days')}
                  </Text>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>
                    {T('reviewStreak')}: {String(habit.streak)} {T('days')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 计划任务 */}
        {review.planProgress.length > 0 && (
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: TH.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Target size={18} color={TH.primary} />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
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
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{plan.planName}</Text>
                  <Text style={{ fontSize: FONT_BODY(), color: TH.primary, fontWeight: '600' }}>
                    {plan.progress}%
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: TH.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    height: 6,
                    width: `${plan.progress}%`,
                    backgroundColor: TH.primary,
                    borderRadius: 3,
                  }} />
                </View>
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginTop: 4 }}>
                  {String(plan.completedItems)}/{String(plan.totalItems)} {T('reviewTasks')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 健康指标 */}
        {review.metrics && Object.keys(review.metrics).length > 0 && (
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: TH.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BarChart3 size={18} color={TH.text} />
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
                {T('reviewHealthMetrics')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {review.metrics.avgWeight !== undefined && (
                <View style={{ width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>⚖️ {T('reviewWeight')}</Text>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginTop: 4 }}>
                    {String(review.metrics.avgWeight)}kg
                  </Text>
                  {review.comparison.weightDiff !== undefined && review.comparison.weightDiff !== 0 && (
                    <Text style={{ fontSize: FONT_SUB(), color: review.comparison.weightDiff > 0 ? COLORS.RED : COLORS.GREEN }}>
                      {review.comparison.weightDiff > 0 ? '+' : ''}{String(review.comparison.weightDiff)}kg
                    </Text>
                  )}
                </View>
              )}
              {review.metrics.avgWater !== undefined && (
                <View style={{ width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>💧 {T('reviewWater')}</Text>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginTop: 4 }}>
                    {review.metrics.avgWater}ml
                  </Text>
                </View>
              )}
              {review.metrics.avgCalories !== undefined && (
                <View style={{ width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>🍽️ {T('reviewCalories')}</Text>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginTop: 4 }}>
                    {review.metrics.avgCalories}kcal
                  </Text>
                </View>
              )}
              {review.metrics.totalExerciseMin !== undefined && (
                <View style={{ width: '48%', backgroundColor: TH.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>🏃 {T('reviewExercise')}</Text>
                  <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text, marginTop: 4 }}>
                    {String(review.metrics.totalExerciseMin)}min
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI分析 */}
        {review.aiSummary && (
          <View style={{
            backgroundColor: TH.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: TH.border, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_TITLE() }}>💡</Text>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
                {T('reviewAIAnalysis')}
              </Text>
            </View>
            <Text style={{ fontSize: FONT_BODY(), color: TH.text, lineHeight: 24, marginBottom: 12 }}>
              {review.aiSummary}
            </Text>
            {review.highlights.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SUB(), color: COLORS.GREEN, fontWeight: '600', marginBottom: 6 }}>
                  ✨ {T('reviewHighlights')}
                </Text>
                {review.highlights.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ fontSize: FONT_BODY(), color: COLORS.GREEN, marginRight: 6 }}>•</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>{h}</Text>
                  </View>
                ))}
              </View>
            )}
            {review.improvements.length > 0 && (
              <View>
                <Text style={{ fontSize: FONT_SUB(), color: '#F59E0B', fontWeight: '600', marginBottom: 6 }}>
                  💪 {T('reviewImprovements')}
                </Text>
                {review.improvements.map((imp, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ fontSize: FONT_BODY(), color: '#F59E0B', marginRight: 6 }}>•</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>{imp}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
