import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_BACK, parseCheckinNote , FONT_SMALL } from '@egoless-do/core';
import { usePagination } from '../../../hooks/usePagination';
import { Shield } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { useRootNavigation } from '../../../navigation/hooks';
import { useShallowStore } from '../../../store/useAppStore';
import ReviewView from '../components/ReviewView';

const PRACTICE_LABELS: Record<string, string> = { sit: 'checkinSit', stand: 'checkinStand', chant: 'checkinSutra' };
const PRACTICE_ICONS: Record<string, string> = { sit: '🌙', stand: '🌅', chant: '🧠' };

const styles = StyleSheet.create({
  // --- Groups ---
  historyGroup: { marginBottom: 20 },
  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },

  // --- Timeline ---
  monthDot: { width: 10, height: 10, borderRadius: 5 },
  monthLabel: { fontWeight: '700' },
  timelineRow: { flexDirection: 'row', marginLeft: 4 },
  timelineCol: { alignItems: 'center', width: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  timelineLine: { width: 2, flex: 1 },

  // --- Card ---
  card: { flex: 1, borderRadius: 12, padding: 14, marginBottom: 10, marginLeft: 8, borderLeftWidth: 3 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  centerRow: { flexDirection: 'row', alignItems: 'center' },
  gap6: { gap: 6 },
  badgeText: { fontWeight: '600' },

  // --- Pill containers ---
  graceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: `${COLORS.ORANGE}15` },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // --- User note ---
  userNote: { marginTop: 4 },

  // --- Tags ---
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tagItem: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tagIcon: { fontSize: FONT_SMALL() },
  tagText: { fontSize: FONT_SMALL() },

  // --- Streak row ---
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  gap12: { gap: 12 },
  streakText: {},

  // --- Header ---
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontWeight: '700', marginLeft: 12 },
  clearButton: { padding: 8 },
  clearButtonText: { color: COLORS.RED, fontSize: FONT_SUB() },

  // --- Tabs ---
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10 },
  tabText: { textAlign: 'center' },

  // --- FlatList ---
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  footerLoader: { padding: 16 },
});

export default function CheckinHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { checkinHistory, clearAllReviews } = useShallowStore(s => ({
    checkinHistory: s.checkinHistory,
    clearAllReviews: s.clearAllReviews,
  }));
  const nav = useRootNavigation();

  const [activeTab, setActiveTab] = useState<'history' | 'weekReview' | 'monthReview'>('weekReview');

  const sorted = useMemo(() =>
    (checkinHistory ?? []).filter(c => !c.deleted).sort((a, b) => {
      const ta = a.timestamp ?? new Date(a.date).getTime();
      const tb = b.timestamp ?? new Date(b.date).getTime();
      return tb - ta;
    }),
    [checkinHistory]
  );

  const { items: paginatedSorted, hasMore, loadMore, isLoading } = usePagination({
    data: sorted,
    pageSize: 30,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof paginatedSorted>();
    for (const h of paginatedSorted) {
      const key = h.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return Array.from(map.entries());
  }, [paginatedSorted]);

  const formatMonth = useCallback((key: string) => {
    const [y, m] = key.split('-');
    return T('dateYearMonth').replace('{year}', y).replace('{month}', m);
  }, [T]);

  const formatDay = useCallback((dateStr: string) => {
    const parts = dateStr.split('-');
    return parts.length >= 3 ? `${parseInt(parts[1])}-${parseInt(parts[2])}` : dateStr;
  }, []);

  const weekdays = [T('weekdaySun'), T('weekdayMon'), T('weekdayTue'), T('weekdayWed'), T('weekdayThu'), T('weekdayFri'), T('weekdaySat')];
  const getWeekday = useCallback((ds: string) => {
    const [y, m, d] = ds.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? '' : weekdays[date.getDay()];
  }, [weekdays]);

  const handleClearReviews = useCallback(() => {
    Alert.alert(
      T('clearReviewData'),
      T('clearReviewDataConfirm'),
      [
        { text: T('cancel'), style: 'cancel' },
        {
          text: T('confirm'),
          style: 'destructive',
          onPress: () => {
            clearAllReviews();
            Alert.alert(T('done'), T('clearReviewDataDone'));
          }
        },
      ]
    );
  }, [T, clearAllReviews]);

  const renderItem = useCallback(({ item: [monthKey, items] }: { item: [string, typeof sorted] }) => {
    const isLastGroup = monthKey === grouped[0]?.[0];
    return (
      <View key={monthKey} style={styles.historyGroup}>
        <View style={styles.monthHeaderRow}>
          <View style={[styles.monthDot, { backgroundColor: P }]} />
          <Text style={[styles.monthLabel, { fontSize: FONT_SUB(), color: TH.text }]}>{formatMonth(monthKey)}</Text>
          <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{items.length} {T('days')}</Text>
        </View>

        {items.map((h, idx) => {
          const isLast = isLastGroup && idx === items.length - 1;
          const parsed = parseCheckinNote(h.note ?? '');
          const tags: { icon: string; text: string }[] = [];
          if (parsed.fasted) tags.push({ icon: '🔥', text: T('checkinAbstinence') });
          if (parsed.waterMl > 0) tags.push({ icon: '💧', text: `${parsed.waterMl}ml` });
          if (parsed.food > 0) tags.push({ icon: '🍽️', text: `${parsed.food}kcal` });
          for (const pr of parsed.practices) {
            if (PRACTICE_LABELS[pr]) tags.push({ icon: PRACTICE_ICONS[pr], text: T(PRACTICE_LABELS[pr]) });
          }
          for (const name of parsed.habits) tags.push({ icon: '✓', text: name });
          for (const name of parsed.customs) tags.push({ icon: '✦', text: name });
          for (const item of parsed.planItems) tags.push({ icon: '☐', text: String(typeof item === 'string' ? item : item.name ?? item.id ?? '') });

          return (
            <View key={h.date ?? idx} style={styles.timelineRow}>
              <View style={styles.timelineCol}>
                <View style={[styles.timelineDot, { backgroundColor: h.done ? COLORS.GREEN : COLORS.RED }]} />
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: `${P}30` }]} />}
              </View>

              <TouchableOpacity
                onPress={() => nav.navigate('CheckinDetail', { date: h.date })}
                activeOpacity={0.7}
                style={[styles.card, { backgroundColor: TH.card, borderLeftColor: h.done ? COLORS.GREEN : COLORS.RED }]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.centerRow, styles.gap6]}>
                    <Text style={[styles.badgeText, { fontSize: FONT_BADGE(), color: TH.sub }]}>{formatDay(h.date)}</Text>
                    <Text style={[styles.badgeText, { fontSize: FONT_BADGE(), color: TH.sub }]}>{T('dateWeekdayPrefix')}{getWeekday(h.date)}</Text>
                  </View>
                  <View style={[styles.centerRow, styles.gap6]}>
                    {h.grace && (
                      <View style={styles.graceBadge}>
                        <Shield size={10} color={COLORS.ORANGE} />
                        <Text style={[styles.badgeText, { fontSize: FONT_BADGE(), color: COLORS.ORANGE }]}>
                          {T('graceTitle')}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.doneBadge, { backgroundColor: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)' }]}>
                      <Text style={[styles.badgeText, { fontSize: FONT_BADGE(), color: h.done ? COLORS.GREEN : COLORS.RED }]}>
                        {h.done ? T('checkinDone') : T('checkinNotDone')}
                      </Text>
                    </View>
                  </View>
                </View>

                {parsed.userNote ? (
                  <Text style={[styles.userNote, { fontSize: FONT_SUB(), color: TH.text }]} numberOfLines={2}>{parsed.userNote}</Text>
                ) : null}

                {tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {tags.map((tag, i) => (
                      <View key={i} style={[styles.tagItem, { backgroundColor: `${P}12` }]}>
                        <Text style={styles.tagIcon}>{tag.icon}</Text>
                        <Text style={[styles.tagText, { color: TH.sub }]}>{tag.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.streakRow, styles.gap12]}>
                  {h.streak > 0 && <Text style={[styles.streakText, { fontSize: FONT_BADGE(), color: TH.sub }]}>{T('checkinStreak')}: {h.streak} {T('days')}</Text>}
                  {h.weight ? <Text style={[styles.streakText, { fontSize: FONT_BADGE(), color: TH.sub }]}>{h.weight} {T('checkinKg')}</Text> : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  }, [grouped, P, TH.text, TH.sub, TH.card, T, formatMonth, formatDay, getWeekday, nav]);

  const keyExtractor = useCallback((item: [string, typeof sorted]) => item[0], []);

  const ListEmptyComponent = useMemo(() => (
    <Text style={{ textAlign: 'center', marginTop: 60, color: TH.sub, fontSize: FONT_EMPTY() }}>
      {T('checkinNoRecords')}
    </Text>
  ), [TH.sub, T]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.headerBar}>
        <View style={styles.centerRow}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ color: TH.text, fontSize: FONT_BACK() }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: TH.text, fontSize: FONT_TITLE() }]}>{T('checkinHistory')}</Text>
        </View>
        <TouchableOpacity
          onPress={handleClearReviews}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>{T('clearReviewData')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab切换 */}
      <View style={styles.tabRow}>
        {(['weekReview', 'monthReview', 'history'] as const).map(tab => {
          const active = activeTab === tab;
          const labels = { history: T('history'), weekReview: T('reviewWeek'), monthReview: T('reviewMonth') };
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, {
                backgroundColor: active ? `${P}18` : 'transparent',
                borderWidth: active ? 1 : 0, borderColor: active ? P : 'transparent',
              }]}
            >
              <Text style={[styles.tabText, {
                fontSize: FONT_BODY(), fontWeight: active ? '600' : '400',
                color: active ? P : TH.sub,
              }]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 内容区域 */}
      {activeTab === 'weekReview' ? (
        <ReviewView period="week" />
      ) : activeTab === 'monthReview' ? (
        <ReviewView period="month" />
      ) : (
        <FlatList
          data={paginatedSorted.length === 0 ? [] : grouped}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={hasMore && isLoading ? <ActivityIndicator style={styles.footerLoader} /> : null}
        />
      )}
    </SafeAreaView>
  );
}
