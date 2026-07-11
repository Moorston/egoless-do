import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_BACK } from '@egoless-do/core';
import type { CheckinReview } from '@egoless-do/core';
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


export default function ReviewHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const { checkinReviews } = useShallowStore(s => ({
    checkinReviews: s.checkinReviews,
  }));
  const nav = useRootNavigation();

  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');

  const reviews = useMemo(() => {
    return (checkinReviews ?? [])
      .filter(r => r.period === activeTab && !r.deleted)
      .sort((a, b) => b.generatedAt - a.generatedAt);
  }, [checkinReviews, activeTab]);

  const grouped = useMemo(() => {
    const map = new Map<string, CheckinReview[]>();
    for (const r of reviews) {
      const year = r.startDate.slice(0, 4);
      const month = r.startDate.slice(5, 7);
      const key = `${year}-${month}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [reviews]);

  const formatMonth = useCallback((key: string) => {
    const [y, m] = key.split('-');
    return `${y}年${parseInt(m)}月`;
  }, []);

  const formatWeekRange = useCallback((review: CheckinReview) => {
    const start = review.startDate.slice(5);
    const end = review.endDate.slice(5);
    return `${start} - ${end}`;
  }, []);

  const renderItem = useCallback(({ item: [monthKey, items] }: { item: [string, CheckinReview[]] }) => (
    <View key={monthKey} style={{ marginBottom: 20 }}>
      {/* 月份标题 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TH.primary }} />
        <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text }}>
          {formatMonth(monthKey)}
        </Text>
        <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>
          {items.length} {activeTab === 'week' ? '周' : '月'}
        </Text>
      </View>

      {/* 复盘列表 */}
      {items.map((review) => (
        <TouchableOpacity
          key={review.id}
          onPress={() => nav.navigate('ReviewDetail', { reviewId: review.id })}
          activeOpacity={0.7}
          style={{
            backgroundColor: TH.card, borderRadius: 12, padding: 14,
            marginBottom: 10, marginLeft: 18,
            borderLeftWidth: 3, borderLeftColor: TH.primary,
          }}
        >
          {/* 日期范围 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
              {formatWeekRange(review)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {review.comparison.completionRateDiff > 0 ? (
                <TrendingUp size={14} color={COLORS.GREEN} />
              ) : review.comparison.completionRateDiff < 0 ? (
                <TrendingDown size={14} color={COLORS.RED} />
              ) : null}
              <Text style={{
                fontSize: FONT_SUB(),
                color: review.comparison.completionRateDiff > 0 ? COLORS.GREEN :
                       review.comparison.completionRateDiff < 0 ? COLORS.RED : TH.sub,
              }}>
                {review.comparison.completionRateDiff > 0 ? '+' : ''}{review.comparison.completionRateDiff}%
              </Text>
            </View>
          </View>

          {/* 核心指标 */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('reviewCompletionRate')}:</Text>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.primary }}>
                {review.completionRate}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('reviewStreakDays')}:</Text>
              <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>
                {review.streakDays}{T('days')}
              </Text>
            </View>
          </View>

          {/* AI总结预览 */}
          {review.aiSummary && (
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub }} numberOfLines={2}>
              {review.aiSummary}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  ), [activeTab, formatMonth, formatWeekRange, nav, T, TH.card, TH.primary, TH.sub, TH.text]);

  const keyExtractor = useCallback((item: [string, CheckinReview[]]) => item[0], []);

  const ListEmptyComponent = useMemo(() => (
    <View style={{ alignItems: 'center', marginTop: 60 }}>
      <Text style={{ fontSize: FONT_EMPTY(), color: TH.sub }}>
        {T('reviewNoHistory')}
      </Text>
    </View>
  ), [TH.sub, T]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE(), marginLeft: 12 }}>
          {T('reviewHistoryTitle')}
        </Text>
      </View>

      {/* Tab切换 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 }}>
        {(['week', 'month'] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: active ? `${TH.primary}18` : 'transparent',
                borderWidth: active ? 1 : 0, borderColor: active ? TH.primary : 'transparent',
              }}
            >
              <Text style={{
                textAlign: 'center', fontSize: FONT_BODY(), fontWeight: active ? '600' : '400',
                color: active ? TH.primary : TH.sub,
              }}>
                {tab === 'week' ? T('reviewWeek') : T('reviewMonth')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 内容 */}
      <FlatList
        data={reviews.length === 0 ? [] : grouped}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        removeClippedSubviews={true}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
