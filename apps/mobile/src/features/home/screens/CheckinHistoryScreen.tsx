import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, useT } from '../../../components/UI';
import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_EMPTY, FONT_BACK, parseCheckinNote } from '@egoless-do/core';
import { useRootNavigation } from '../../../navigation/hooks';
import { Shield } from 'lucide-react-native';
import ReviewView from '../components/ReviewView';

const PRACTICE_LABELS: Record<string, string> = { sit: 'checkinSit', stand: 'checkinStand', chant: 'checkinSutra' };
const PRACTICE_ICONS: Record<string, string> = { sit: '🌙', stand: '🌅', chant: '🧠' };

export default function CheckinHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { checkinHistory, clearAllReviews } = useAppStore(useShallow(s => ({
    checkinHistory: s.checkinHistory,
    clearAllReviews: s.clearAllReviews,
  })));
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const h of sorted) {
      const key = h.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return Array.from(map.entries());
  }, [sorted]);

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
      <View key={monthKey} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P }} />
          <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>{formatMonth(monthKey)}</Text>
          <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{items.length} {T('days')}</Text>
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
            <View key={h.date ?? idx} style={{ flexDirection: 'row', marginLeft: 4 }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: h.done ? COLORS.GREEN : COLORS.RED, zIndex: 1,
                }} />
                {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: `${P}30` }} />}
              </View>

              <TouchableOpacity
                onPress={() => nav.navigate('CheckinDetail', { date: h.date })}
                activeOpacity={0.7}
                style={{
                  flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 14,
                  marginBottom: 10, marginLeft: 8,
                  borderLeftWidth: 3, borderLeftColor: h.done ? COLORS.GREEN : COLORS.RED,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{formatDay(h.date)}</Text>
                    <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('dateWeekdayPrefix')}{getWeekday(h.date)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {h.grace && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 3,
                        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
                        backgroundColor: `${COLORS.ORANGE}15`,
                      }}>
                        <Shield size={10} color={COLORS.ORANGE} />
                        <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: COLORS.ORANGE }}>
                          {T('graceTitle')}
                        </Text>
                      </View>
                    )}
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                      backgroundColor: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)',
                    }}>
                      <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: h.done ? COLORS.GREEN : COLORS.RED }}>
                        {h.done ? T('checkinDone') : T('checkinNotDone')}
                      </Text>
                    </View>
                  </View>
                </View>

                {parsed.userNote ? (
                  <Text style={{ fontSize: FONT_SUB, color: TH.text, marginTop: 4 }} numberOfLines={2}>{parsed.userNote}</Text>
                ) : null}

                {tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {tags.map((tag, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${P}12`, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10 }}>{tag.icon}</Text>
                        <Text style={{ fontSize: 10, color: TH.sub }}>{tag.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  {h.streak > 0 && <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{T('checkinStreak')}: {h.streak} {T('days')}</Text>}
                  {h.weight ? <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{h.weight} {T('checkinKg')}</Text> : null}
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
    <Text style={{ textAlign: 'center', color: TH.sub, marginTop: 60, fontSize: FONT_EMPTY }}>
      {T('checkinNoRecords')}
    </Text>
  ), [TH.sub, T]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ color: TH.text, fontSize: FONT_BACK }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE, marginLeft: 12 }}>{T('checkinHistory')}</Text>
        </View>
        <TouchableOpacity
          onPress={handleClearReviews}
          style={{ padding: 8 }}
        >
          <Text style={{ color: COLORS.RED, fontSize: FONT_SUB }}>{T('clearReviewData')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab切换 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 }}>
        {(['weekReview', 'monthReview', 'history'] as const).map(tab => {
          const active = activeTab === tab;
          const labels = { history: T('history'), weekReview: T('reviewWeek'), monthReview: T('reviewMonth') };
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: active ? `${P}18` : 'transparent',
                borderWidth: active ? 1 : 0, borderColor: active ? P : 'transparent',
              }}
            >
              <Text style={{
                textAlign: 'center', fontSize: FONT_BODY, fontWeight: active ? '600' : '400',
                color: active ? P : TH.sub,
              }}>
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
          data={sorted.length === 0 ? [] : grouped}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
